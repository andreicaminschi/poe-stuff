"""Filler: Qwen3-0.6B with a LoRA through Unsloth, writing one command's params as JSON.

Usage: python train_filler.py <run> <train set> <val set> [<eval set> ...]
The loss covers the JSON answer only. After training, every set is decoded greedily into
/data/runs/<run>/filler/predictions/<set>.jsonl; scoring runs the predictions through the real
executor in Node.
"""

from unsloth import FastLanguageModel  # must load before transformers

import json
import os
import random
import re
import sys
import time

import torch
from transformers import Trainer, TrainingArguments

from rows import data_path, read_rows, write_json, write_rows

BASE = os.environ.get("FILLER_BASE", "unsloth/Qwen3-0.6B")
MAX_SEQ = 512
EPOCHS = float(os.environ.get("FILLER_EPOCHS", "3"))
LR = float(os.environ.get("FILLER_LR", "2e-4"))
RANK = int(os.environ.get("FILLER_RANK", "16"))
BATCH = int(os.environ.get("FILLER_BATCH", "16"))
GEN_BATCH = int(os.environ.get("FILLER_GEN_BATCH", "16"))
SAMPLES = int(os.environ.get("FILLER_SAMPLES", "6"))
PREDICT_ONLY = os.environ.get("PREDICT_ONLY", "") == "1"
IGNORE = -100
SEED = 7
TARGETS = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]


def prompt_of(row):
    return f"{row['input']}\nparams:"


def encode(tokenizer, row):
    prompt_ids = tokenizer(prompt_of(row), add_special_tokens=False)["input_ids"]
    answer_ids = tokenizer(" " + row["output"] + tokenizer.eos_token, add_special_tokens=False)["input_ids"]
    return {"input_ids": prompt_ids + answer_ids, "labels": [IGNORE] * len(prompt_ids) + answer_ids}


def collate(pad_id):
    def pad(batch):
        width = max(len(item["input_ids"]) for item in batch)
        return {
            "input_ids": torch.tensor([item["input_ids"] + [pad_id] * (width - len(item["input_ids"])) for item in batch]),
            "labels": torch.tensor([item["labels"] + [IGNORE] * (width - len(item["labels"])) for item in batch]),
            "attention_mask": torch.tensor([[1] * len(item["input_ids"]) + [0] * (width - len(item["input_ids"])) for item in batch]),
        }
    return pad


RANGE = re.compile(r"^\d+-\d+$")


def string_leaves(value, key=None):
    """Every string the params carry, with the key it sits under. Condition names are keys, not leaves."""
    if isinstance(value, str):
        yield key, value
    elif isinstance(value, list):
        for entry in value:
            yield from string_leaves(entry, key)
    elif isinstance(value, dict):
        for name, entry in value.items():
            yield from string_leaves(entry, name)


def check_params(text, row, vocab):
    """Generate-and-verify: a candidate passes when it parses, every condition and value set
    exists, and every name, tag, item or value it writes appears in the request or context."""
    try:
        params = json.loads(text)
    except json.JSONDecodeError:
        return False
    if not isinstance(params, dict):
        return False
    sets = vocab["valueSets"]
    for side in ("add", "remove"):
        patch = params.get(side)
        conditions = patch.get("conditions") if isinstance(patch, dict) else None
        for name, value in (conditions or {}).items():
            if name not in vocab["conditions"]:
                return False
            if isinstance(value, str) and value not in sets.get(name, []):
                return False
    haystack = row["input"].lower()
    for key, value in string_leaves(params):
        if key == "target" or RANGE.match(value) or value in sets.get(key, []):
            continue
        if value.lower() not in haystack:
            return False
    return True


def decode(model, tokenizer, rows, sample, count):
    """Decodes `count` answers per row: greedy when `sample` is false, sampled otherwise."""
    tokenizer.padding_side = "left"
    texts = []
    for start in range(0, len(rows), GEN_BATCH):
        chunk = rows[start:start + GEN_BATCH]
        batch = tokenizer([prompt_of(row) for row in chunk], return_tensors="pt", padding=True, add_special_tokens=False).to("cuda")
        with torch.no_grad():
            generated = model.generate(
                **batch, max_new_tokens=192, do_sample=sample, temperature=0.8 if sample else None, top_p=0.95 if sample else None,
                num_return_sequences=count, pad_token_id=tokenizer.pad_token_id, eos_token_id=tokenizer.eos_token_id,
            )
        texts.extend(tokenizer.decode(ids, skip_special_tokens=True).strip() for ids in generated[:, batch["input_ids"].shape[1]:])
    return [texts[index * count:(index + 1) * count] for index in range(len(rows))]


def generate(model, tokenizer, rows, vocab):
    """Generate-and-verify: the greedy answer is kept when it passes the check. A row whose greedy
    answer fails gets SAMPLES sampled candidates, and the first that passes replaces it; when none
    does, the greedy answer stays."""
    greedy = [candidates[0] for candidates in decode(model, tokenizer, rows, False, 1)]
    failing = [index for index, (row, text) in enumerate(zip(rows, greedy)) if not check_params(text, row, vocab)]
    if not failing:
        return greedy
    torch.manual_seed(SEED)
    retried = decode(model, tokenizer, [rows[index] for index in failing], True, SAMPLES)
    chosen = list(greedy)
    for index, candidates in zip(failing, retried):
        chosen[index] = next((text for text in candidates if check_params(text, rows[index], vocab)), greedy[index])
    print(f"filler: {len(failing)} of {len(rows)} greedy answers failed the check, {sum(1 for index in failing if chosen[index] != greedy[index])} replaced", flush=True)
    return chosen


def exact_rate(rows, predicted):
    def canonical(text):
        try:
            return json.dumps(json.loads(text), sort_keys=True)
        except json.JSONDecodeError:
            return None
    return sum(1 for row, text in zip(rows, predicted) if canonical(text) == canonical(row["output"])) / len(rows)


def load_trained(out, train_set):
    """Loads the base model with the LoRA a previous run saved, for predicting without retraining."""
    model, tokenizer = FastLanguageModel.from_pretrained(os.path.join(out, "lora"), max_seq_length=MAX_SEQ, dtype=torch.bfloat16, load_in_4bit=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    return model, tokenizer, len(read_rows(train_set, "filler"))


def train_model(out, train_set):
    """Fine-tunes the LoRA on the train set and saves it."""
    model, tokenizer = FastLanguageModel.from_pretrained(BASE, max_seq_length=MAX_SEQ, dtype=torch.bfloat16, load_in_4bit=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = FastLanguageModel.get_peft_model(model, r=RANK, lora_alpha=2 * RANK, lora_dropout=0, bias="none", target_modules=TARGETS, use_gradient_checkpointing="unsloth", random_state=SEED)

    train_rows = read_rows(train_set, "filler")
    train = [encode(tokenizer, row) for row in train_rows]
    print(f"filler: {len(train)} train rows, longest {max(len(item['input_ids']) for item in train)} tokens", flush=True)

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=os.path.join(out, "checkpoints"), num_train_epochs=EPOCHS, per_device_train_batch_size=BATCH,
            learning_rate=LR, warmup_ratio=0.05, lr_scheduler_type="linear", bf16=True, logging_steps=20,
            save_strategy="no", report_to=[], seed=SEED, remove_unused_columns=False, dataloader_num_workers=0,
        ),
        train_dataset=train,
        data_collator=collate(tokenizer.pad_token_id),
    )
    trainer.train()
    model.save_pretrained(os.path.join(out, "lora"))
    tokenizer.save_pretrained(os.path.join(out, "lora"))
    return model, tokenizer, len(train)


def main(run, train_set, val_set, *eval_sets):
    random.seed(SEED)
    torch.manual_seed(SEED)
    started = time.time()
    out = data_path("runs", run, "filler")

    model, tokenizer, train_count = load_trained(out, train_set) if PREDICT_ONLY else train_model(out, train_set)
    FastLanguageModel.for_inference(model)
    summary = {}
    for eval_set in (val_set, *eval_sets):
        rows = read_rows(eval_set, "filler")
        with open(data_path(eval_set, "vocabulary.json"), encoding="utf-8") as file:
            vocab = json.load(file)
        gold_pass = sum(1 for row in rows if check_params(row["output"], row, vocab)) / len(rows)
        print(f"filler: {eval_set} check passes {gold_pass:.4f} of the correct answers", flush=True)
        predicted = generate(model, tokenizer, rows, vocab)
        summary[eval_set] = exact_rate(rows, predicted)
        name = eval_set.replace("/", "__")
        write_rows(os.path.join(out, "predictions", f"{name}.jsonl"), [{**row, "predicted": text} for row, text in zip(rows, predicted)])
        print(f"filler: {eval_set} JSON exact match {summary[eval_set]:.4f} ({time.time() - started:.0f}s)", flush=True)

    write_json(os.path.join(out, "training.json"), {
        "base": BASE, "rank": RANK, "lr": LR, "epochs": EPOCHS, "batch": BATCH, "samples": SAMPLES, "train_rows": train_count,
        "json_exact_match": summary, "seconds": round(time.time() - started),
    })


if __name__ == "__main__":
    main(*sys.argv[1:])
