#!/usr/bin/env bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-linux.sh"

require_node
if [ "$#" -eq 0 ]; then set -- --get; fi
exec "$NODE" "$PROJECT_ROOT/assets/motion-settings.mjs" "$@"
