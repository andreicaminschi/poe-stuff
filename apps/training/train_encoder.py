"""One encoder adapter: frozen base + LoRA + one linear head per question, mean-pooled."""

import json
import os
import sys

import torch
from peft import LoraConfig, get_peft_model
from safetensors.torch import save_file
from transformers import AutoModel, AutoTokenizer, DataCollatorWithPadding, Trainer, TrainingArguments
from transformers.trainer_utils import get_last_checkpoint

from progress import attach_progress
from rows import IGNORE, adapter_examples, adapter_heads, output_dir

BASE = os.environ.get("DECIDE_BASE", "answerdotai/ModernBERT-base")
MAX_LENGTH = 384
RANK = 16
ALPHA = 32
TARGETS = ["Wqkv", "Wo", "Wi"]
LORA_LR = 3e-4
HEAD_LR = float(os.environ.get("HEAD_LR", "1e-3"))
LORA_PREFIX = "base_model.model."


def load_base():
    return AutoModel.from_pretrained(BASE, reference_compile=False, attn_implementation="eager")  # image had no C compiler


def mean_pool(hidden, mask):
    weights = mask.unsqueeze(-1).to(hidden.dtype)
    return (hidden * weights).sum(1) / weights.sum(1).clamp(min=1)


class Adapter(torch.nn.Module):
    def __init__(self, encoder, heads):
        super().__init__()
        self.encoder = encoder
        self.heads = torch.nn.ModuleDict({name: torch.nn.Linear(encoder.config.hidden_size, len(labels)) for name, labels in heads.items()})

    def forward(self, input_ids, attention_mask, **labels):
        pooled = mean_pool(self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state, attention_mask)
        logits = {name: head(pooled.float()) for name, head in self.heads.items()}
        losses = [torch.nn.functional.cross_entropy(logits[name], labels[f"label_{name}"], ignore_index=IGNORE) for name in self.heads if f"label_{name}" in labels]
        return {"loss": sum(losses), **{f"logits_{name}": value for name, value in logits.items()}}


class Rows(torch.utils.data.Dataset):
    def __init__(self, tokenizer, examples):
        self.encoded = tokenizer([text for text, _ in examples], truncation=True, max_length=MAX_LENGTH)
        self.labels = [labels for _, labels in examples]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, at):
        return {
            "input_ids": self.encoded["input_ids"][at],
            "attention_mask": self.encoded["attention_mask"][at],
            **{f"label_{name}": value for name, value in self.labels[at].items()},
        }


def save_adapter(model, heads, save):
    """LoRA A and B per wrapped layer, keyed by the layer's name in the bare encoder, plus the heads."""
    tensors = {}
    for name, module in model.encoder.named_modules():
        if hasattr(module, "lora_A") and "default" in module.lora_A:
            layer = name.removeprefix(LORA_PREFIX)
            tensors[f"lora.{layer}.A"] = module.lora_A["default"].weight.detach().float().contiguous()
            tensors[f"lora.{layer}.B"] = module.lora_B["default"].weight.detach().float().contiguous()
    for name, head in model.heads.items():
        tensors[f"head.{name}.weight"] = head.weight.detach().float().contiguous()
        tensors[f"head.{name}.bias"] = head.bias.detach().float().contiguous()
    save_file(tensors, os.path.join(save, "adapter.safetensors"))
    with open(os.path.join(save, "adapter.json"), "w", encoding="utf-8") as file:
        json.dump({"base": BASE, "heads": heads, "scale": ALPHA / RANK}, file)


def main(version, adapter):
    save = output_dir(version, adapter)
    heads = adapter_heads(version, adapter)
    tokenizer = AutoTokenizer.from_pretrained(BASE)
    train = Rows(tokenizer, adapter_examples(version, adapter))

    encoder = get_peft_model(load_base(), LoraConfig(r=RANK, lora_alpha=ALPHA, lora_dropout=0.1, target_modules=TARGETS))
    model = Adapter(encoder, heads)

    checkpoints = output_dir(version, f"{adapter}-checkpoints")
    optimizer = torch.optim.AdamW([
        {"params": [param for param in model.encoder.parameters() if param.requires_grad], "lr": LORA_LR},
        {"params": list(model.heads.parameters()), "lr": HEAD_LR},
    ], weight_decay=0.01)
    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=checkpoints, num_train_epochs=2, per_device_train_batch_size=32,
            learning_rate=LORA_LR, warmup_ratio=0.1, weight_decay=0.01, bf16=True, group_by_length=True,
            save_strategy="epoch", save_total_limit=1, save_safetensors=False, logging_steps=50, report_to=[], disable_tqdm=True,
            remove_unused_columns=False, label_names=[f"label_{name}" for name in heads],
        ),
        train_dataset=train, data_collator=DataCollatorWithPadding(tokenizer),
        optimizers=(optimizer, None),
    )
    attach_progress(trainer, f"{adapter} adapter")
    trainer.train(resume_from_checkpoint=get_last_checkpoint(checkpoints))
    save_adapter(model, heads, save)
    tokenizer.save_pretrained(save)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
