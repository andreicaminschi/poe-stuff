"""Exports one run's models in the formats Node runs, then checks the ONNX files against Podman.

Usage: python export.py <run> <val set>
Writes /data/runs/<run>/export/: the Router and Judge as ONNX (fp32 and fp16, logits out), the
Filler's LoRA merged into its base and written as GGUF (f16 and q8_0), the encoder tokenizer files
and export.json. Each ONNX file then labels the val set on the CPU, and the share of labels matching
Podman's predictions for that set is printed.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
import onnxruntime
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer

from rows import data_path, read_rows, write_json

CONVERT = "/opt/llama.cpp/convert_hf_to_gguf.py"
CLASSIFIERS = ["router", "judge"]
ONNX_PRECISIONS = ["fp32", "fp16"]
GGUF_PRECISIONS = ["f16", "q8_0"]
CHECK_BATCH = 32


class Logits(torch.nn.Module):
    """The classifier with only its logits as output, the one thing Node reads. Always fp32, so Node reads one type."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask).logits.float()


def export_classifier(run, name, out):
    folder = data_path("runs", run, name)
    with open(os.path.join(folder, "training.json"), encoding="utf-8") as file:
        training = json.load(file)
    tokenizer = AutoTokenizer.from_pretrained(os.path.join(folder, "model"))
    sample = tokenizer(["request: a\ncontext:\nnone"], return_tensors="pt")
    files = {}
    for precision in ONNX_PRECISIONS:
        model = AutoModelForSequenceClassification.from_pretrained(
            os.path.join(folder, "model"), reference_compile=False, attn_implementation="eager",
        ).eval().cuda()
        if precision == "fp16":
            model = model.half()
        files[precision] = f"{name}-{precision}.onnx"
        torch.onnx.export(
            Logits(model), (sample["input_ids"].cuda(), sample["attention_mask"].cuda()), os.path.join(out, files[precision]),
            input_names=["input_ids", "attention_mask"], output_names=["logits"],
            dynamic_axes={"input_ids": {0: "batch", 1: "tokens"}, "attention_mask": {0: "batch", 1: "tokens"}, "logits": {0: "batch"}},
            opset_version=17, dynamo=False,
        )
        print(f"export: {files[precision]} ({os.path.getsize(os.path.join(out, files[precision])) / 1e6:.0f} MB)", flush=True)
    return {"labels": training["labels"], "max_len": training["max_len"], "files": files}


def export_filler(run, out):
    lora = data_path("runs", run, "filler", "lora")
    with open(os.path.join(lora, "adapter_config.json"), encoding="utf-8") as file:
        base_name = json.load(file)["base_model_name_or_path"]
    files = {}
    with tempfile.TemporaryDirectory() as merged:
        base = AutoModelForCausalLM.from_pretrained(base_name, torch_dtype=torch.bfloat16)
        PeftModel.from_pretrained(base, lora).merge_and_unload().save_pretrained(merged)
        AutoTokenizer.from_pretrained(lora).save_pretrained(merged)
        for precision in GGUF_PRECISIONS:
            files[precision] = f"filler-{precision}.gguf"
            convert(merged, precision, os.path.join(out, files[precision]))
            print(f"export: {files[precision]} ({os.path.getsize(os.path.join(out, files[precision])) / 1e6:.0f} MB)", flush=True)
    return {"base": base_name, "prompt": "{input}\nparams:", "max_new_tokens": 192, "files": files}


def convert(merged, precision, path):
    done = subprocess.run([sys.executable, CONVERT, merged, "--outtype", precision, "--outfile", path], capture_output=True, text=True)
    if done.returncode != 0:
        print(done.stdout[-4000:], done.stderr[-4000:], file=sys.stderr)
        raise SystemExit(done.returncode)


def check_classifier(run, name, out, entry, val_set):
    """Labels the val set with each ONNX file on the CPU and compares with Podman's predictions."""
    tokenizer = AutoTokenizer.from_pretrained(out)
    podman = read_rows(os.path.join("runs", run, name, "predictions"), val_set.replace("/", "__"))
    for precision, file in entry["files"].items():
        session = onnxruntime.InferenceSession(os.path.join(out, file), providers=["CPUExecutionProvider"])
        labels = []
        for start in range(0, len(podman), CHECK_BATCH):
            chunk = podman[start:start + CHECK_BATCH]
            encoded = tokenizer([row["input"] for row in chunk], truncation=True, max_length=entry["max_len"], padding=True, return_tensors="np")
            logits = session.run(["logits"], {"input_ids": encoded["input_ids"].astype(np.int64), "attention_mask": encoded["attention_mask"].astype(np.int64)})[0]
            labels.extend(entry["labels"][index] for index in logits.argmax(-1).tolist())
        same = sum(1 for row, label in zip(podman, labels) if row["predicted"] == label)
        print(f"check: {file} agrees with Podman on {same} of {len(podman)} {val_set} rows ({same / len(podman):.2%})", flush=True)


def main(run, val_set):
    out = data_path("runs", run, "export")
    os.makedirs(out, exist_ok=True)
    manifest = {name: export_classifier(run, name, out) for name in CLASSIFIERS}
    for file in ("tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"):
        shutil.copy(data_path("runs", run, "router", "model", file), os.path.join(out, file))
    manifest["filler"] = export_filler(run, out)
    write_json(os.path.join(out, "export.json"), manifest)
    for name in CLASSIFIERS:
        check_classifier(run, name, out, manifest[name], val_set)


if __name__ == "__main__":
    main(*sys.argv[1:])
