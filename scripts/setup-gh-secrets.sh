#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) not found. Install from https://cli.github.com/"
  exit 1
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "❌ Please export OPENAI_API_KEY in your shell first."
  exit 1
fi

echo "🔐 Setting repository secret OPENAI_API_KEY..."
gh secret set OPENAI_API_KEY -b"$OPENAI_API_KEY"
echo "✅ Secret set."
