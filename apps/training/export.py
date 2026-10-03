"""Exports one version's models into what the admin panel loads: ONNX int8 and GGUF."""

import os
import shutil
import subprocess
import sys

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer

from rows import output_dir

DECIDE_BASE = os.environ.get("DECIDE_BASE", "answerdotai/ModernBERT-base")
FILL_BASE = os.environ.get("FILL_BASE", "Qwen/Qwen2.5-0.5B-Instruct")
CONVERT = "/opt/llama.cpp/convert_hf_to_gguf.py"


def export_decide(version, runtime):
    adapter = output_dir(version, "decide")
    base = AutoModelForSequenceClassification.from_pretrained(DECIDE_BASE, num_labels=2, reference_compile=False, attn_implementation="eager")
    model = PeftModel.from_pretrained(base, adapter).merge_and_unload().eval()
    tokenizer = AutoTokenizer.from_pretrained(adapter)
    sample = tokenizer(["request: a\ncontext:\nb"], return_tensors="pt")
    full = os.path.join(runtime, "decide-fp32.onnx")

    torch.onnx.export(
        model, (sample["input_ids"], sample["attention_mask"]), full,
        input_names=["input_ids", "attention_mask"], output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "tokens"}, "attention_mask": {0: "batch", 1: "tokens"}, "logits": {0: "batch"}},
        opset_version=17, dynamo=False,
    )
    quantize_dynamic(full, os.path.join(runtime, "decide-int8.onnx"), weight_type=QuantType.QInt8)
    shutil.copy(os.path.join(adapter, "tokenizer.json"), os.path.join(runtime, "decide-tokenizer.json"))
    shutil.copy(os.path.join(adapter, "tokenizer_config.json"), os.path.join(runtime, "decide-tokenizer_config.json"))


def export_fill(version, runtime):
    adapter = output_dir(version, "fill")
    base = AutoModelForCausalLM.from_pretrained(FILL_BASE, torch_dtype=torch.bfloat16)
    merged = "/tmp/fill-merged"
    PeftModel.from_pretrained(base, adapter).merge_and_unload().save_pretrained(merged)
    AutoTokenizer.from_pretrained(adapter).save_pretrained(merged)
    converted = subprocess.run([sys.executable, CONVERT, merged, "--outtype", "q8_0", "--outfile", os.path.join(runtime, "fill-q8_0.gguf")], capture_output=True, text=True)
    if converted.returncode != 0:
        print(converted.stdout[-4000:], converted.stderr[-4000:], file=sys.stderr)
        raise SystemExit(converted.returncode)


def main(version):
    runtime = output_dir(version, "runtime")
    print("export: decision model → ONNX (fp32 and int8)", flush=True)
    export_decide(version, runtime)
    print("export: filler → merged, then GGUF Q8", flush=True)
    export_fill(version, runtime)
    print("export: done", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
