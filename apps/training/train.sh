#!/usr/bin/env bash
# Generates one named version's data, then trains and exports both models from scratch.
# Usage: bash apps/training/train.sh --name <name> [--count <n>] [--qlora]   (count defaults to 50)
#   --qlora trains the filler on 4-bit base weights: much less GPU memory, small accuracy risk
#   --dropout sets the filler's LoRA dropout (default 0.05); 0 turns on Unsloth's fast kernels
set -euo pipefail

COUNT=50
NAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --count=*) COUNT="${1#*=}" ;;
    --count) COUNT="$2"; shift ;;
    --name=*) NAME="${1#*=}" ;;
    --name) NAME="$2"; shift ;;
    --qlora) export FILL_QLORA=1 ;;
    --dropout=*) export FILL_LORA_DROPOUT="${1#*=}" ;;
    --dropout) export FILL_LORA_DROPOUT="$2"; shift ;;
    *) echo "Unknown option $1. Use --name <name> [--count <n>] [--qlora] [--dropout <d>]." >&2; exit 2 ;;
  esac
  shift
done
[ -n "$NAME" ] || { echo "Pass --name, e.g. --name count-50." >&2; exit 2; }

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STARTED=$(date +%s)
echo "Training $NAME: $COUNT examples per goal and form. Usually 25-35 min at count 50, longer for larger counts."
echo
echo "── generating data ──"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT" --unseen-only

rm -rf ".s3/training/$NAME/output"
bash apps/training/run-all.sh "$NAME"

TOOK=$(( $(date +%s) - STARTED ))
echo
echo "$NAME trained in $((TOOK / 60))m $((TOOK % 60))s. Evaluate with: yarn agent:eval --name $NAME"
