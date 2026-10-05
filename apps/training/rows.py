"""Reads one version's generated rows and writes them as model input text."""

import json
import os

DATA = os.environ.get("DATA_DIR", "/data")

STOP_LABELS = ["nothing-needed", "work-needed"]
ENTRY_LABELS = ["single", "multi", "bulk"]
INTENT_LABELS = ["single", "multi"]
IGNORE = -100


def version_dir(version):
    return os.path.join(DATA, version)


def read_json(version, *parts):
    with open(os.path.join(version_dir(version), "training-data", *parts), encoding="utf-8") as file:
        return json.load(file)


def read_rows(version, split, kind):
    return read_json(version, split, f"{kind}.json")


def output_dir(version, *parts):
    path = os.path.join(version_dir(version), "output", *parts)
    os.makedirs(path, exist_ok=True)
    return path


def describe_request(request):
    return f"request: {request['query']}\ncontext:\n{request['context']}"


def adapter_examples(version, adapter):
    """One (text, {head: label index}) per row. A head the row has no label for gets IGNORE."""
    rows = read_rows(version, "train", adapter)
    if adapter == "stop":
        return [(describe_request(row["input"]), {"stop": STOP_LABELS.index(row["output"]["reason"])}) for row in rows]
    if adapter == "choose":
        parts = read_json(version, "command-parts.json")
        return [(describe_request(row["input"]), {
            "action": parts["actions"].index(row["output"]["action"]),
            "target": parts["targets"].index(row["output"]["target"]) if "target" in row["output"] else IGNORE,
        }) for row in rows]
    if adapter == "entry":
        return [(describe_request(row["input"]), {"entry": ENTRY_LABELS.index(row["output"]["entry"])}) for row in rows]
    return [(describe_request(row["input"]), {"intent": INTENT_LABELS.index(row["output"]["intent"])}) for row in rows]


def adapter_heads(version, adapter):
    """Each head's labels, in output order."""
    if adapter == "stop":
        return {"stop": STOP_LABELS}
    if adapter == "choose":
        parts = read_json(version, "command-parts.json")
        return {"action": parts["actions"], "target": parts["targets"]}
    if adapter == "entry":
        return {"entry": ENTRY_LABELS}
    return {"intent": INTENT_LABELS}


def fill_prompt(tokenizer, messages):
    """The model's own chat template, Qwen3's thinking off."""
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)


FILL_SYSTEM = "You fill the params of one admin-panel command. Answer with one JSON object and nothing else. Copy names exactly as the request writes them. Answer {\"refuse\": \"missing-target\"} when the context has no name the request needs."


def fill_messages(request, fields):
    return [
        {"role": "system", "content": FILL_SYSTEM},
        {"role": "user", "content": f"{describe_request(request)}\ncommand: {request['command']}\nparams: {fields}"},
    ]


def format_args(args):
    return json.dumps(args, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
