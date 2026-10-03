#!/usr/bin/env bash
# Generates one version's data, then trains and exports both models from scratch.
# Usage: bash apps/training/train.sh [count]   (default 50, version count-<count>)
set -euo pipefail

COUNT="${1:-50}"
VERSION="count-$COUNT"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== generate $VERSION $(date -Is)"
node apps/admin-panel/generate-training-cli.ts --count="$COUNT"
node apps/admin-panel/generate-training-cli.ts --count="$COUNT" --unseen-only

echo "=== train $VERSION $(date -Is)"
rm -rf ".s3/training/$VERSION/output"
bash apps/training/run-all.sh "$VERSION"

echo "=== $VERSION trained $(date -Is). Evaluate with: bash apps/training/eval.sh $VERSION"
