"""Scores one version's trained models on its eval rows and writes output/stats.json."""

import json
import os
import sys
import time
from collections import defaultdict

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer

from rows import STOP_QUESTION, command_question, decide_text, fill_messages, output_dir, read_commands, read_rows

DECIDE_BASE = os.environ.get("DECIDE_BASE", "answerdotai/ModernBERT-base")
FILL_BASE = os.environ.get("FILL_BASE", "Qwen/Qwen2.5-0.5B-Instruct")
FILL_LIMIT = int(os.environ.get("EVAL_FILL_LIMIT", "500"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def yes_probabilities(model, tokenizer, texts, batch=64):
    scores = []
    with torch.no_grad():
        for start in range(0, len(texts), batch):
            encoded = tokenizer(texts[start:start + batch], truncation=True, max_length=384, padding=True, return_tensors="pt").to(DEVICE)
            scores += torch.softmax(model(**encoded).logits.float(), dim=-1)[:, 1].tolist()
    return scores


def fill(model, tokenizer, row, command):
    prompt = tokenizer.apply_chat_template(fill_messages(row, command), tokenize=False, add_generation_prompt=True)
    encoded = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(DEVICE)
    with torch.no_grad():
        output = model.generate(**encoded, max_new_tokens=200, do_sample=False, pad_token_id=tokenizer.pad_token_id)
    text = tokenizer.decode(output[0][encoded["input_ids"].shape[1]:], skip_special_tokens=True)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def ratio(right, total):
    return round(right / total, 4) if total else None


def by_goal(rows, hits):
    groups = defaultdict(lambda: [0, 0])
    for row, hit in zip(rows, hits):
        groups[f"{row['goal']}/{row['form']}"][0] += hit
        groups[f"{row['goal']}/{row['form']}"][1] += 1
    return {key: ratio(right, total) for key, (right, total) in sorted(groups.items())}


def main(version):
    commands = read_commands(version)
    stop_rows = read_rows(version, "eval", "stop")
    choose_rows = read_rows(version, "eval", "choose")
    fill_rows = read_rows(version, "eval", "fill")[:FILL_LIMIT]

    decide_dir = output_dir(version, "decide")
    decide_tokenizer = AutoTokenizer.from_pretrained(decide_dir)
    decide = PeftModel.from_pretrained(AutoModelForSequenceClassification.from_pretrained(DECIDE_BASE, num_labels=2), decide_dir).to(DEVICE).eval()

    started = time.perf_counter()
    stop_scores = yes_probabilities(decide, decide_tokenizer, [decide_text(row, STOP_QUESTION) for row in stop_rows])
    stop_hits = [int((score >= 0.5) == row["done"]) for row, score in zip(stop_rows, stop_scores)]
    decide_ms = 1000 * (time.perf_counter() - started) / max(len(stop_rows), 1)

    choose_scores = yes_probabilities(decide, decide_tokenizer, [decide_text(row, command_question(command)) for row in choose_rows for command in commands])
    picked = [commands[max(range(len(commands)), key=lambda at: choose_scores[row_at * len(commands) + at])] for row_at in range(len(choose_rows))]
    choose_hits = [int(command == row["command"]) for row, command in zip(choose_rows, picked)]
    picked_by_turn = {(row["query"], row["context"], tuple(row["history"])): command for row, command in zip(choose_rows, picked)}

    del decide
    torch.cuda.empty_cache()

    fill_dir = output_dir(version, "fill")
    fill_tokenizer = AutoTokenizer.from_pretrained(fill_dir)
    filler = PeftModel.from_pretrained(AutoModelForCausalLM.from_pretrained(FILL_BASE, torch_dtype=torch.bfloat16), fill_dir).to(DEVICE).eval()

    started = time.perf_counter()
    fill_hits = [int(fill(filler, fill_tokenizer, row, row["command"]) == row["args"]) for row in fill_rows]
    fill_ms = 1000 * (time.perf_counter() - started) / max(len(fill_rows), 1)

    pipeline_hits = []
    for row, fill_hit in zip(fill_rows, fill_hits):
        command = picked_by_turn.get((row["query"], row["context"], tuple(row["history"])))
        if command != row["command"]:
            pipeline_hits.append(0)
            continue
        pipeline_hits.append(fill_hit)

    stats = {
        "version": version,
        "device": DEVICE,
        "stop_accuracy": ratio(sum(stop_hits), len(stop_hits)),
        "choose_accuracy": ratio(sum(choose_hits), len(choose_hits)),
        "fill_exact_match": ratio(sum(fill_hits), len(fill_hits)),
        "pipeline_exact_match": ratio(sum(pipeline_hits), len(pipeline_hits)),
        "choose_by_goal": by_goal(choose_rows, choose_hits),
        "fill_by_goal": by_goal(fill_rows, fill_hits),
        "ms_per_decision": round(decide_ms, 1),
        "ms_per_fill": round(fill_ms, 1),
        "eval_rows": {"stop": len(stop_rows), "choose": len(choose_rows), "fill": len(fill_rows)},
    }
    with open(os.path.join(output_dir(version), "stats.json"), "w", encoding="utf-8") as file:
        json.dump(stats, file, indent=2)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
