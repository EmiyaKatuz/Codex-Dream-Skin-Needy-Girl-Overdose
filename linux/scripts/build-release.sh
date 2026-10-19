#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
OUTPUT="${1:-$ROOT/release/CodexDreamSkin-Linux-v${VERSION}.tar.gz}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$(dirname "$OUTPUT")" "$STAGE/CodexDreamSkin-Linux"
cp -a "$ROOT/assets" "$ROOT/scripts" "$ROOT/README.md" "$ROOT/VERSION" "$STAGE/CodexDreamSkin-Linux/"
chmod 700 "$STAGE/CodexDreamSkin-Linux/scripts/"*.sh
tar -C "$STAGE" -czf "$OUTPUT" CodexDreamSkin-Linux
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
printf 'Built %s\n' "$OUTPUT"
