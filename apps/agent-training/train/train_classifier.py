"""Router or Judge: an ettin encoder fine-tuned in full as a sequence classifier.

Usage: python train_classifier.py <router|judge> <run> <train set> <val set> [<eval set> ...]
Sets are folders under /data. The best epoch by validation macro-F1 is kept, then every eval
set is predicted into /data/runs/<run>/<model>/predictions/<set>.jsonl.
"""

import copy
import os
import random
import sys
import time

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup

from rows import data_path, read_rows, write_json, write_rows

BASE = os.environ.get("ENCODER_BASE", "jhu-clsp/ettin-encoder-150m")
MAX_LEN = int(os.environ.get("MAX_LEN", "128"))
BATCH = int(os.environ.get("BATCH", "32"))
LR = float(os.environ.get("LR", "5e-5"))
EPOCHS = int(os.environ.get("EPOCHS", "10"))
PATIENCE = int(os.environ.get("PATIENCE", "3"))
SEED = int(os.environ.get("SEED", "7"))


def macro_f1(gold, predicted, labels):
    scores = []
    for label in labels:
        tp = sum(1 for g, p in zip(gold, predicted) if g == label and p == label)
        fp = sum(1 for g, p in zip(gold, predicted) if g != label and p == label)
        fn = sum(1 for g, p in zip(gold, predicted) if g == label and p != label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return sum(scores) / len(scores)


def encode(tokenizer, rows):
    encoded = tokenizer([row["input"] for row in rows], truncation=True, max_length=MAX_LEN)
    full = tokenizer([row["input"] for row in rows])
    truncated = sum(1 for ids in full["input_ids"] if len(ids) > MAX_LEN)
    return encoded, truncated


def batches(encoded, label_ids, order, tokenizer):
    for start in range(0, len(order), BATCH):
        picked = order[start:start + BATCH]
        features = [{"input_ids": encoded["input_ids"][i], "attention_mask": encoded["attention_mask"][i]} for i in picked]
        batch = tokenizer.pad(features, return_tensors="pt")
        if label_ids is not None:
            batch["labels"] = torch.tensor([label_ids[i] for i in picked])
        yield picked, batch


def predict(model, tokenizer, rows, labels):
    encoded, _ = encode(tokenizer, rows)
    predicted = [None] * len(rows)
    model.eval()
    with torch.no_grad(), torch.autocast("cuda", dtype=torch.bfloat16):
        for picked, batch in batches(encoded, None, list(range(len(rows))), tokenizer):
            logits = model(**{key: value.cuda() for key, value in batch.items()}).logits
            for index, label in zip(picked, logits.argmax(-1).tolist()):
                predicted[index] = labels[label]
    return predicted


def main(model_name, run, train_set, val_set, *eval_sets):
    random.seed(SEED)
    torch.manual_seed(SEED)
    started = time.time()
    out = data_path("runs", run, model_name)

    train = read_rows(train_set, model_name)
    val = read_rows(val_set, model_name)
    labels = sorted({row["label"] for row in train})
    label_ids = [labels.index(row["label"]) for row in train]
    counts = [label_ids.count(i) for i in range(len(labels))]
    weights = torch.tensor([len(train) / (len(labels) * count) for count in counts], dtype=torch.float32).cuda()
    print(f"{model_name}: {len(train)} train rows, {len(val)} val rows, labels {dict(zip(labels, counts))}", flush=True)

    tokenizer = AutoTokenizer.from_pretrained(BASE)
    model = AutoModelForSequenceClassification.from_pretrained(BASE, num_labels=len(labels)).cuda()
    encoded, truncated = encode(tokenizer, train)
    print(f"{model_name}: {truncated} train inputs longer than {MAX_LEN} tokens", flush=True)

    steps = EPOCHS * ((len(train) + BATCH - 1) // BATCH)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    schedule = get_linear_schedule_with_warmup(optimizer, int(0.06 * steps), steps)
    loss_fn = torch.nn.CrossEntropyLoss(weight=weights)

    best = {"f1": -1.0}
    best_state = None
    stale = 0
    history = []
    for epoch in range(1, EPOCHS + 1):
        model.train()
        order = list(range(len(train)))
        random.shuffle(order)
        total = 0.0
        for _, batch in batches(encoded, label_ids, order, tokenizer):
            batch = {key: value.cuda() for key, value in batch.items()}
            targets = batch.pop("labels")
            with torch.autocast("cuda", dtype=torch.bfloat16):
                logits = model(**batch).logits
            loss = loss_fn(logits.float(), targets)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            schedule.step()
            optimizer.zero_grad()
            total += loss.item() * len(targets)

        gold = [row["label"] for row in val]
        predicted = predict(model, tokenizer, val, labels)
        accuracy = sum(1 for g, p in zip(gold, predicted) if g == p) / len(val)
        f1 = macro_f1(gold, predicted, labels)
        history.append({"epoch": epoch, "train_loss": total / len(train), "val_accuracy": accuracy, "val_macro_f1": f1})
        print(f"{model_name}: epoch {epoch} loss {total / len(train):.4f} val acc {accuracy:.4f} macro-F1 {f1:.4f} ({time.time() - started:.0f}s)", flush=True)
        if f1 > best["f1"]:
            best = {"f1": f1, "accuracy": accuracy, "epoch": epoch}
            best_state = copy.deepcopy({key: value.detach().cpu() for key, value in model.state_dict().items()})
            stale = 0
        else:
            stale += 1
            if stale >= PATIENCE:
                break

    model.load_state_dict(best_state)
    model.save_pretrained(os.path.join(out, "model"))
    tokenizer.save_pretrained(os.path.join(out, "model"))
    write_json(os.path.join(out, "training.json"), {
        "base": BASE, "labels": labels, "train_rows": len(train), "max_len": MAX_LEN, "batch": BATCH, "lr": LR,
        "best": best, "history": history, "seconds": round(time.time() - started),
    })

    for eval_set in (val_set, *eval_sets):
        rows = read_rows(eval_set, model_name)
        predicted = predict(model, tokenizer, rows, labels)
        name = eval_set.replace("/", "__")
        write_rows(os.path.join(out, "predictions", f"{name}.jsonl"), [{**row, "predicted": label} for row, label in zip(rows, predicted)])
    print(f"{model_name}: best epoch {best['epoch']}, val macro-F1 {best['f1']:.4f}, done in {time.time() - started:.0f}s", flush=True)


if __name__ == "__main__":
    main(*sys.argv[1:])
