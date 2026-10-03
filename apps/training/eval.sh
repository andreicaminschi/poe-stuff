#!/usr/bin/env bash
# Scores one trained version on its eval splits, with the panel's own runtime.
# Usage: bash apps/training/eval.sh [version] [--e2e]   (default count-50)
#   quick eval always: each model against its own labels, about 2 minutes
#   --e2e adds the end-to-end benchmark: every request, GPU, plus a CPU sample
set -euo pipefail

VERSION="${1:-count-50}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

node apps/admin-panel/eval-adapters-cli.ts --version="$VERSION" --device=cpu

if [ "${2:-}" = "--e2e" ]; then
  node apps/admin-panel/benchmark-agent-cli.ts --version="$VERSION" --device=gpu
  node apps/admin-panel/benchmark-agent-cli.ts --version="$VERSION" --device=cpu --limit=200
fi
