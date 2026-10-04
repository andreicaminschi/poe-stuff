"""Exports one version for the admin panel: one encoder with LoRA inputs, its adapters, and the filler GGUF."""

import json
import os
import shutil
import subprocess
import sys

import torch
from peft import PeftModel
from safetensors import safe_open
from transformers import AutoModelForCausalLM, AutoTokenizer

from rows import fill_prompt, output_dir
from train_encoder import ALPHA, RANK, TARGETS, load_base, mean_pool

ADAPTERS = ["stop", "choose", "entry", "intent"]
FILL_BASE = os.environ.get("FILL_BASE", "Qwen/Qwen2.5-0.5B-Instruct")
ENCODER_PRECISION = os.environ.get("ENCODER_PRECISION", "fp32")
FILL_QUANT = os.environ.get("FILL_QUANT", "q8_0")
CONVERT = "/opt/llama.cpp/convert_hf_to_gguf.py"
QUANTIZE = "/opt/llama.cpp/build/bin/llama-quantize"


class LoraInput(torch.nn.Module):
    """A frozen linear layer plus B·A·x, with A and B handed in per run."""

    def __init__(self, linear):
        super().__init__()
        self.linear = linear
        self.a = None
        self.b = None

    def forward(self, x):
        low = torch.nn.functional.linear(torch.nn.functional.linear(x, self.a.to(x.dtype)), self.b.to(x.dtype))
        return self.linear(x) + low * (ALPHA / RANK)


class EncoderWithLora(torch.nn.Module):
    """The bare encoder, every target layer wrapped. Output: the mean-pooled vector, fp32."""

    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder
        self.layers = []
        for name, module in list(encoder.named_modules()):
            for child, linear in list(module.named_children()):
                if child in TARGETS and isinstance(linear, torch.nn.Linear):
                    wrapped = LoraInput(linear)
                    setattr(module, child, wrapped)
                    self.layers.append((f"{name}.{child}" if name else child, wrapped))

    def forward(self, input_ids, attention_mask, *weights):
        for at, (_, layer) in enumerate(self.layers):
            layer.a, layer.b = weights[2 * at], weights[(2 * at) + 1]
        hidden = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        return mean_pool(hidden, attention_mask).float()


def export_encoder(version, runtime):
    model = EncoderWithLora(load_base()).eval()
    if ENCODER_PRECISION == "fp16":
        model = model.half()
    names = [name for name, _ in model.layers]
    weights = [tensor for _, layer in model.layers for tensor in (torch.zeros(RANK, layer.linear.in_features), torch.zeros(layer.linear.out_features, RANK))]
    tokenizer = AutoTokenizer.from_pretrained(output_dir(version, "stop"))
    sample = tokenizer(["request: a\ncontext:\nb"], return_tensors="pt")
    inputs = [f"{side}:{name}" for name in names for side in ("A", "B")]

    torch.onnx.export(
        model, (sample["input_ids"], sample["attention_mask"], *weights), os.path.join(runtime, "encoder-base.onnx"),
        input_names=["input_ids", "attention_mask", *inputs], output_names=["pooled"],
        dynamic_axes={"input_ids": {0: "batch", 1: "tokens"}, "attention_mask": {0: "batch", 1: "tokens"}, "pooled": {0: "batch"}},
        opset_version=17, dynamo=False,
    )
    with open(os.path.join(runtime, "encoder-base.json"), "w", encoding="utf-8") as file:
        json.dump({"layers": names, "precision": ENCODER_PRECISION}, file)
    shutil.copy(os.path.join(output_dir(version, "stop"), "tokenizer.json"), os.path.join(runtime, "encoder-tokenizer.json"))
    shutil.copy(os.path.join(output_dir(version, "stop"), "tokenizer_config.json"), os.path.join(runtime, "encoder-tokenizer_config.json"))
    return names


def export_adapters(version, runtime, names):
    for adapter in ADAPTERS:
        trained = output_dir(version, adapter)
        keys = open_keys(trained)
        missing = [name for name in names if f"lora.{name}.A" not in keys]
        if missing:
            raise SystemExit(f"{adapter}: no LoRA weights for {missing[:3]}")
        shutil.copy(os.path.join(trained, "adapter.safetensors"), os.path.join(runtime, f"{adapter}.safetensors"))
        shutil.copy(os.path.join(trained, "adapter.json"), os.path.join(runtime, f"{adapter}.json"))


def open_keys(trained):
    with safe_open(os.path.join(trained, "adapter.safetensors"), "pt") as file:
        return set(file.keys())


def run(command):
    done = subprocess.run(command, capture_output=True, text=True)
    if done.returncode != 0:
        print(done.stdout[-4000:], done.stderr[-4000:], file=sys.stderr)
        raise SystemExit(done.returncode)


def export_fill(version, runtime):
    adapter = output_dir(version, "fill")
    base = AutoModelForCausalLM.from_pretrained(FILL_BASE, torch_dtype=torch.bfloat16)
    merged = "/tmp/fill-merged"
    PeftModel.from_pretrained(base, adapter).merge_and_unload().save_pretrained(merged)
    tokenizer = AutoTokenizer.from_pretrained(adapter)
    tokenizer.save_pretrained(merged)
    template = fill_prompt(tokenizer, [{"role": "system", "content": "{system}"}, {"role": "user", "content": "{user}"}])
    with open(os.path.join(runtime, "fill-prompt.json"), "w", encoding="utf-8") as file:
        json.dump({"base": FILL_BASE, "template": template, "quant": FILL_QUANT}, file)

    out = os.path.join(runtime, "fill.gguf")
    if FILL_QUANT == "q8_0":
        run([sys.executable, CONVERT, merged, "--outtype", "q8_0", "--outfile", out])
        return
    full = "/tmp/fill-f16.gguf"
    run([sys.executable, CONVERT, merged, "--outtype", "f16", "--outfile", full])
    run([QUANTIZE, full, out, FILL_QUANT.upper()])


def main(version):
    runtime = output_dir(version, "runtime")
    print(f"export: encoder base → ONNX ({ENCODER_PRECISION}), LoRA as inputs", flush=True)
    names = export_encoder(version, runtime)
    print(f"export: {len(ADAPTERS)} adapters, {len(names)} LoRA layers each", flush=True)
    export_adapters(version, runtime, names)
    print(f"export: filler → merged, then GGUF {FILL_QUANT}", flush=True)
    export_fill(version, runtime)
    print("export: done", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
