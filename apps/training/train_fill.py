"""Filler model: a small chat LLM + LoRA through Unsloth, one command's params as JSON."""

import os
import sys

from unsloth import FastLanguageModel  # must load before transformers

import torch
from transformers import AutoTokenizer, Trainer, TrainingArguments
from transformers.trainer_utils import get_last_checkpoint

from progress import attach_progress
from rows import fill_messages, fill_prompt, format_args, output_dir, read_json, read_rows

BASE = os.environ.get("FILL_BASE", "Qwen/Qwen2.5-0.5B-Instruct")
IGNORE = -100
MAX_SEQ_LENGTH = 2048
DROPOUT = float(os.environ.get("FILL_LORA_DROPOUT", "0"))
QWEN_TARGETS = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
LFM2_TARGETS = ["q_proj", "k_proj", "v_proj", "out_proj", "in_proj", "w1", "w2", "w3"]


def encode(tokenizer, tools, row):
    """Prompt then answer. Only the answer counts toward the loss."""
    prompt = fill_prompt(tokenizer, fill_messages(row["input"], tools[row["input"]["command"]]["fields"]))
    prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
    answer_ids = tokenizer(format_args(row["output"]) + tokenizer.eos_token, add_special_tokens=False)["input_ids"]
    return {"input_ids": prompt_ids + answer_ids, "labels": [IGNORE] * len(prompt_ids) + answer_ids}


def collate(pad_id):
    def pad(batch):
        width = max(len(item["input_ids"]) for item in batch)
        ids = [item["input_ids"] + [pad_id] * (width - len(item["input_ids"])) for item in batch]
        labels = [item["labels"] + [IGNORE] * (width - len(item["labels"])) for item in batch]
        mask = [[1] * len(item["input_ids"]) + [0] * (width - len(item["input_ids"])) for item in batch]
        return {"input_ids": torch.tensor(ids), "labels": torch.tensor(labels), "attention_mask": torch.tensor(mask)}
    return pad


def main(version):
    save = output_dir(version, "fill")
    tokenizer = AutoTokenizer.from_pretrained(BASE)
    tools = read_json(version, "tools.json")
    train = [encode(tokenizer, tools, row) for row in read_rows(version, "train", "fill")]

    print(f"filler: LoRA, bf16 base weights, dropout {DROPOUT}", flush=True)
    model, _ = FastLanguageModel.from_pretrained(BASE, max_seq_length=MAX_SEQ_LENGTH, dtype=torch.bfloat16, load_in_4bit=False)
    model = FastLanguageModel.get_peft_model(
        model, r=16, lora_alpha=32, lora_dropout=DROPOUT, bias="none",
        target_modules=LFM2_TARGETS if "lfm2" in BASE.lower() else QWEN_TARGETS,
        use_gradient_checkpointing="unsloth",
    )

    checkpoints = output_dir(version, "fill-checkpoints")
    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=checkpoints, num_train_epochs=2, per_device_train_batch_size=8, gradient_accumulation_steps=2,
            learning_rate=2e-4, warmup_ratio=0.05, bf16=True,
            save_strategy="epoch", save_total_limit=1, logging_steps=50, report_to=[], disable_tqdm=True,
        ),
        train_dataset=train, data_collator=collate(tokenizer.pad_token_id),
    )
    attach_progress(trainer, "filler")
    trainer.train(resume_from_checkpoint=get_last_checkpoint(checkpoints))
    model.save_pretrained(save)
    tokenizer.save_pretrained(save)


if __name__ == "__main__":
    main(sys.argv[1])
