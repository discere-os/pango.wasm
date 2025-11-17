#!/bin/bash
set -euo pipefail

echo "📦 Fetching WASM dependencies..."

# Create dependencies directory
mkdir -p deps/wasm

# Parse dependencies.json and fetch each dependency
if command -v jq >/dev/null 2>&1; then
  # Use jq if available
  jq -r '.dependencies[] | "\(.name) \(.version) \(.url)"' dependencies.json | while read name version url; do
    echo "  Fetching $name v$version..."
    curl -sSL "$url" -o "deps/wasm/$name-side.wasm" || {
      echo "⚠️  Failed to fetch $name, will build locally"
      continue
    }
    echo "  ✅ $name v$version"
  done
else
  echo "⚠️  jq not found, skipping dependency fetch"
  exit 1
fi

echo "✅ Dependencies fetched to deps/wasm/"
