#!/usr/bin/env bash
# Generates one named version's data, then trains and exports both models from scratch.
# Usage: bash apps/training/train.sh --name <name> [--count <n>]   (count defaults to 50)
set -euo pipefail

COUNT=50
NAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --count=*) COUNT="${1#*=}" ;;
    --count) COUNT="$2"; shift ;;
    --name=*) NAME="${1#*=}" ;;
    --name) NAME="$2"; shift ;;
    *) echo "Unknown option $1. Use --name <name> [--count <n>]." >&2; exit 2 ;;
  esac
  shift
done
[ -n "$NAME" ] || { echo "Pass --name, e.g. --name count-50." >&2; exit 2; }

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== generate $NAME, $COUNT per goal and form $(date -Is)"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT" --unseen-only

echo "=== train $NAME $(date -Is)"
rm -rf ".s3/training/$NAME/output"
bash apps/training/run-all.sh "$NAME"

echo "=== $NAME trained $(date -Is). Evaluate with: yarn agent:eval --name $NAME"
