#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Please install Node 22.x LTS."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt "22" ]; then
  echo "❌ Node $(node -v) detected. Please use Node >= 22.x"
  exit 1
fi

echo "🔧 Installing dependencies..."
npm ci

mkdir -p public/img content input/product input/logos .tmp
echo "{}" > content/images.json

echo "✅ Done. Set your OPENAI_API_KEY in .env or as an Actions secret."
