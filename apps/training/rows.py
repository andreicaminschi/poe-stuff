"""Reads one version's generated rows and writes them as model input text."""

import json
import os

DATA = os.environ.get("DATA_DIR", "/data")

STOP_QUESTION = "is the request complete?"


def version_dir(version):
    return os.path.join(DATA, version)


def read_rows(version, split, kind):
    with open(os.path.join(version_dir(version), "training-data", split, f"{kind}.json"), encoding="utf-8") as file:
        return json.load(file)


def read_commands(version):
    with open(os.path.join(version_dir(version), "training-data", "commands.json"), encoding="utf-8") as file:
        return json.load(file)


def output_dir(version, *parts):
    path = os.path.join(version_dir(version), "output", *parts)
    os.makedirs(path, exist_ok=True)
    return path


def describe_turn(row):
    """The request, what the panel holds now, and what already ran."""
    history = "; ".join(row["history"]) or "nothing"
    return f"request: {row['query']}\ncontext:\n{row['context']}\nalready run: {history}"


def decide_text(row, question):
    return f"{describe_turn(row)}\nquestion: {question}"


def command_question(command):
    return f"is {command} the next command?"


def decide_pairs(stop_rows, choose_rows, commands):
    """One yes/no pair per stop row, and one per command for every turn that acts."""
    pairs = [(decide_text(row, STOP_QUESTION), int(row["done"])) for row in stop_rows]
    for row in choose_rows:
        pairs += [(decide_text(row, command_question(command)), int(command == row["command"])) for command in commands]
    return pairs


FILL_SYSTEM = "You fill the params of one admin-panel command. Answer with one JSON object and nothing else. Copy names exactly as the request writes them."


def fill_messages(row, command):
    return [
        {"role": "system", "content": FILL_SYSTEM},
        {"role": "user", "content": f"{describe_turn(row)}\ncommand: {command}"},
    ]


def format_args(args):
    return json.dumps(args, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
