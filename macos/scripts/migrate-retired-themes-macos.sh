#!/bin/bash

# Archive unchanged retired built-ins before saved themes are enumerated.
# Active-theme publication uses the same lock as user theme switches; the
# shared helper separately owns the saved-library import lock while it moves
# recognized presets into the recoverable archive outside themes/.

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"
. "$SCRIPT_DIR/theme-switch-lock-macos.sh"

[ "$#" -eq 0 ] || fail "Theme migration does not accept path overrides."
trap 'release_theme_switch_lock' EXIT
ensure_state_root
ensure_node_runtime
acquire_theme_switch_lock "$(new_operation_token)"
THEMES_ROOT="$STATE_ROOT/themes"
/bin/mkdir -p "$THEMES_ROOT"
/bin/chmod 700 "$THEMES_ROOT"

# Finish an interrupted saved-theme replacement before migration inspects its
# destination. A live importer remains protected by the shared import lock.
"$NODE" "$SCRIPT_DIR/publish-theme-import.mjs" --recover "$THEMES_ROOT" >/dev/null
"$NODE" "$PROJECT_ROOT/assets/retired-theme-migration.mjs" \
  --state-root "$STATE_ROOT" --active-name theme \
  --default-theme-dir "$PROJECT_ROOT/assets"
