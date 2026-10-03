"""Decision model: ModernBERT-base + LoRA, one yes/no head for "done?" and "is X next?"."""

import os
import sys

import numpy as np
import torch
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForSequenceClassification, AutoTokenizer, DataCollatorWithPadding, Trainer, TrainingArguments
from transformers.trainer_utils import get_last_checkpoint

from rows import decide_pairs, output_dir, read_commands, read_rows

BASE = os.environ.get("DECIDE_BASE", "answerdotai/ModernBERT-base")
MAX_LENGTH = 384


class Pairs(torch.utils.data.Dataset):
    def __init__(self, tokenizer, pairs):
        self.encoded = tokenizer([text for text, _ in pairs], truncation=True, max_length=MAX_LENGTH)
        self.labels = [label for _, label in pairs]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, at):
        return {"input_ids": self.encoded["input_ids"][at], "attention_mask": self.encoded["attention_mask"][at], "labels": self.labels[at]}


def main(version):
    save = output_dir(version, "decide")
    commands = read_commands(version)
    tokenizer = AutoTokenizer.from_pretrained(BASE)
    train = Pairs(tokenizer, decide_pairs(read_rows(version, "train", "stop"), read_rows(version, "train", "choose"), commands))
    held = Pairs(tokenizer, decide_pairs(read_rows(version, "eval", "stop")[:2000], read_rows(version, "eval", "choose")[:300], commands))

    model = AutoModelForSequenceClassification.from_pretrained(BASE, num_labels=2)
    model = get_peft_model(model, LoraConfig(
        task_type=TaskType.SEQ_CLS, r=16, lora_alpha=32, lora_dropout=0.1,
        target_modules=["Wqkv", "Wo", "Wi"], modules_to_save=["head", "classifier"],
    ))

    def accuracy(prediction):
        logits, labels = prediction
        return {"accuracy": float((np.argmax(logits, axis=-1) == labels).mean())}

    checkpoints = output_dir(version, "decide-checkpoints")
    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=checkpoints, num_train_epochs=2, per_device_train_batch_size=32, per_device_eval_batch_size=64,
            learning_rate=3e-4, warmup_ratio=0.1, weight_decay=0.01, bf16=True,
            eval_strategy="epoch", save_strategy="epoch", save_total_limit=1, logging_steps=50, report_to=[],
        ),
        train_dataset=train, eval_dataset=held, data_collator=DataCollatorWithPadding(tokenizer), compute_metrics=accuracy,
    )
    trainer.train(resume_from_checkpoint=get_last_checkpoint(checkpoints))
    print(trainer.evaluate())
    model.save_pretrained(save)
    tokenizer.save_pretrained(save)


if __name__ == "__main__":
    main(sys.argv[1])
