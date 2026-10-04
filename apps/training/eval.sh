#!/usr/bin/env bash
# Scores one trained version on its eval splits, with the panel's own runtime.
# Usage: bash apps/training/eval.sh --name <name> [--device cpu|gpu] [--e2e]
#   quick eval always: each model against its own labels
#   --device picks where the quick eval runs (default gpu, as the panel runs)
#   --e2e adds the end-to-end benchmark: every request on GPU, plus a CPU sample
set -euo pipefail

NAME=""
DEVICE=gpu
E2E=0
while [ $# -gt 0 ]; do
  case "$1" in
    --name=*) NAME="${1#*=}" ;;
    --name) NAME="$2"; shift ;;
    --device=*) DEVICE="${1#*=}" ;;
    --device) DEVICE="$2"; shift ;;
    --e2e) E2E=1 ;;
    *) echo "Unknown option $1. Use --name <name> [--device cpu|gpu] [--e2e]." >&2; exit 2 ;;
  esac
  shift
done
[ -n "$NAME" ] || { echo "Pass --name, e.g. --name count-50." >&2; exit 2; }
[ "$DEVICE" = cpu ] || [ "$DEVICE" = gpu ] || { echo "--device must be cpu or gpu." >&2; exit 2; }

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

node apps/admin-panel/eval-adapters-cli.ts --version="$NAME" --device="$DEVICE"

if [ "$E2E" = 1 ]; then
  node apps/admin-panel/benchmark-agent-cli.ts --version="$NAME" --device=gpu
  node apps/admin-panel/benchmark-agent-cli.ts --version="$NAME" --device=cpu --limit=200
fi
