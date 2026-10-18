#!/bin/bash

# Use the same verified Codex Node runtime as the skin. The shared utility owns
# schema validation and atomic writes; this entry never launches/restarts Codex.
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

case "${1:-}" in
  --get)
    [ "$#" -eq 1 ] || fail "Motion settings: --get takes no additional arguments."
    ;;
  --set-mode)
    [ "$#" -eq 2 ] || fail "Motion settings: --set-mode requires one mode."
    case "$2" in system|off|subtle|full) ;; *) fail "Motion settings: invalid mode." ;; esac
    ;;
  --set-effect)
    [ "$#" -eq 3 ] || fail "Motion settings: --set-effect requires an effect and on/off."
    case "$2" in interactions|status|character|ambient|themeTransition) ;; *) fail "Motion settings: invalid effect." ;; esac
    case "$3" in on|off) ;; *) fail "Motion settings: expected on or off." ;; esac
    ;;
  *) fail "Motion settings: expected --get, --set-mode or --set-effect." ;;
esac

discover_codex_app
require_signed_node_runtime
exec "$NODE" "$PROJECT_ROOT/assets/motion-settings.mjs" --file "$STATE_ROOT/motion.json" "$@"
