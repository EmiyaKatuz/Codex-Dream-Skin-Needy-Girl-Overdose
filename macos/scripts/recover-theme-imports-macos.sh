#!/bin/bash

# Recover saved-theme replacements and archive unchanged retired built-ins
# before menus enumerate the saved library, including already-current engines.

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

"$SCRIPT_DIR/migrate-retired-themes-macos.sh"
