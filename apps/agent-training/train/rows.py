"""Reads and writes the JSONL row files `yarn agent:rows` produces, under /data (.s3/agent-training)."""

import json
import os

DATA = os.environ.get("DATA_DIR", "/data")


def data_path(*parts):
    return os.path.join(DATA, *parts)


def read_rows(folder, model):
    with open(data_path(folder, f"{model}.jsonl"), encoding="utf-8") as file:
        return [json.loads(line) for line in file if line.strip()]


def write_rows(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_json(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(value, file, indent=2)
