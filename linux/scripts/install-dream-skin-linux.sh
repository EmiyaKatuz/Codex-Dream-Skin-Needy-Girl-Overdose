#!/usr/bin/env bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-linux.sh"

PORT=9341
LAUNCH=true
while [ "$#" -gt 0 ]; do
  case "$1" in
    --port) PORT="${2:-}"; shift 2 ;;
    --no-launch) LAUNCH=false; shift ;;
    *) fail "Unknown argument: $1" ;;
  esac
done
case "$PORT" in ''|*[!0-9]*) fail 'Port must be numeric.' ;; esac
[ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || fail 'Port must be between 1024 and 65535.'

require_node
discover_codex
codex_is_running && fail 'Close Codex before installation, then run this command again.'
ensure_state_root

temporary="$INSTALL_ROOT.installing.$$"
previous="$INSTALL_ROOT.previous.$$"
rm -rf "$temporary"
mkdir -p "$temporary"
cp -a "$PROJECT_ROOT/." "$temporary/"
rm -rf "$temporary/.git" "$temporary/release"
chmod 700 "$temporary/scripts/"*.sh
rm -rf "$previous"
[ ! -e "$INSTALL_ROOT" ] || mv "$INSTALL_ROOT" "$previous"
if ! mv "$temporary" "$INSTALL_ROOT"; then
  [ ! -e "$previous" ] || mv "$previous" "$INSTALL_ROOT"
  fail "Could not install the engine at $INSTALL_ROOT"
fi
rm -rf "$previous"

replace_legacy_default="$($NODE -e '
  try {
    const theme = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const isLegacyGeneric = theme.id === "custom-1784123441349" && theme.name === "Dream Skin";
    const isUnversionedChoten = theme.id === "preset-internet-angel-default" &&
      theme.performanceMode === undefined;
    process.stdout.write(String(isLegacyGeneric || isUnversionedChoten));
  } catch { process.stdout.write("false"); }
' "$THEME_DIR/theme.json")"
if [ ! -f "$THEME_DIR/theme.json" ] || [ "$replace_legacy_default" = true ]; then
  rm -f "$THEME_DIR/portal-hero.png"
  cp "$INSTALL_ROOT/assets/theme.json" "$THEME_DIR/theme.json"
  cp "$INSTALL_ROOT/assets/dream-reference.jpg" "$THEME_DIR/dream-reference.jpg"
  chmod 600 "$THEME_DIR/"*
fi
"$NODE" "$INSTALL_ROOT/scripts/injector.mjs" --check-payload --theme-dir "$THEME_DIR" >/dev/null
"$NODE" "$INSTALL_ROOT/assets/retired-theme-migration.mjs" \
  --state-root "$STATE_ROOT" --active-name theme \
  --default-theme-dir "$INSTALL_ROOT/assets" >/dev/null

desktop_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
desktop_file="$desktop_dir/Codex.desktop"
if [ -e "$desktop_file" ] && ! grep -Fqx 'X-Codex-Dream-Skin=true' "$desktop_file"; then
  fail "Refusing to replace an unrelated user desktop entry: $desktop_file"
fi
mkdir -p "$desktop_dir"
cat > "$desktop_file" <<EOF
[Desktop Entry]
Type=Application
Name=OpenAI Codex
Comment=OpenAI Codex desktop app with Dream Skin
Exec=$INSTALL_ROOT/scripts/start-dream-skin-linux.sh
TryExec=$INSTALL_ROOT/scripts/start-dream-skin-linux.sh
Icon=openai-codex-desktop
Terminal=false
Categories=Development;IDE;
MimeType=x-scheme-handler/codex;
StartupNotify=true
StartupWMClass=codex
X-Codex-Dream-Skin=true
EOF
chmod 644 "$desktop_file"

# Desktop shells resolve an existing dock icon through its desktop ID. Refresh
# that ID after replacing the user-level override so it points at this launcher.
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$desktop_dir" || printf 'Warning: could not refresh the desktop entry cache.\n' >&2
fi
if command -v xdg-mime >/dev/null 2>&1; then
  mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}"
  xdg-mime default Codex.desktop x-scheme-handler/codex \
    || printf 'Warning: could not set the Codex URL handler.\n' >&2
fi
printf 'Codex Dream Skin %s installed at %s.\n' "$SKIN_VERSION" "$INSTALL_ROOT"
[ -f "$desktop_file" ] && printf 'The OpenAI Codex desktop entry now starts Dream Skin automatically.\n'
if [ "$LAUNCH" = true ]; then
  exec "$INSTALL_ROOT/scripts/start-dream-skin-linux.sh" --port "$PORT"
fi
