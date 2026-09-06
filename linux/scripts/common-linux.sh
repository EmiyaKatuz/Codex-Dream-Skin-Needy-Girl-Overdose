#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
INJECTOR="$SCRIPT_DIR/injector.mjs"
SKIN_VERSION="1.5.19"
INSTALL_ROOT="$HOME/.codex/codex-dream-skin-linux"
STATE_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/CodexDreamSkin"
THEME_DIR="$STATE_ROOT/theme"
STATE_PATH="$STATE_ROOT/state.json"
LOG_PATH="$STATE_ROOT/injector.log"
ERROR_LOG="$STATE_ROOT/injector-error.log"
INJECTOR_ENV=(env
  -u ALL_PROXY -u HTTPS_PROXY -u HTTP_PROXY
  -u all_proxy -u https_proxy -u http_proxy
  -u NODE_USE_ENV_PROXY)

fail() { printf 'Codex Dream Skin: %s\n' "$*" >&2; exit 1; }

ensure_state_root() {
  mkdir -p "$STATE_ROOT" "$THEME_DIR"
  chmod 700 "$STATE_ROOT" "$THEME_DIR"
}

require_node() {
  NODE="${NODE:-$(command -v node || true)}"
  [ -n "$NODE" ] && [ -x "$NODE" ] || fail 'Node.js 20 or newer is required.'
  local version major
  version="$($NODE --version)"
  major="${version#v}"; major="${major%%.*}"
  case "$major" in ''|*[!0-9]*) fail "Could not parse Node.js version: $version" ;; esac
  [ "$major" -ge 20 ] || fail "Node.js $version is too old; version 20 or newer is required."
  export NODE
}

discover_codex() {
  local desktop_exec candidate
  CODEX_EXE="${CODEX_APP_BIN:-}"
  if [ -z "$CODEX_EXE" ] && command -v codex-desktop >/dev/null 2>&1; then
    CODEX_EXE="$(command -v codex-desktop)"
  fi
  if [ -z "$CODEX_EXE" ] && [ -r /usr/share/applications/Codex.desktop ]; then
    desktop_exec="$(sed -n 's/^Exec=//p' /usr/share/applications/Codex.desktop | head -n 1)"
    candidate="${desktop_exec%% *}"
    [ -n "$candidate" ] && CODEX_EXE="$(command -v "$candidate" 2>/dev/null || true)"
  fi
  [ -n "$CODEX_EXE" ] && [ -x "$CODEX_EXE" ] || fail 'Official Codex Desktop was not found. Set CODEX_APP_BIN to its executable path.'
  CODEX_RUNTIME_EXE="${CODEX_APP_PROCESS_BIN:-}"
  if [ -z "$CODEX_RUNTIME_EXE" ] && [ -x /usr/lib/openai-codex-desktop/codex ]; then
    CODEX_RUNTIME_EXE=/usr/lib/openai-codex-desktop/codex
  fi
  export CODEX_EXE
  export CODEX_RUNTIME_EXE
}

codex_is_running() {
  pgrep -f "^${CODEX_EXE//./\\.}( |$)" >/dev/null 2>&1 && return 0
  [ -n "${CODEX_RUNTIME_EXE:-}" ] || return 1
  pgrep -f "^${CODEX_RUNTIME_EXE//./\\.}( |$)" >/dev/null 2>&1
}

cdp_ready() {
  local port="$1"
  curl --noproxy '*' --silent --fail --max-time 1 "http://127.0.0.1:${port}/json/list" \
    | "$NODE" -e '
      let data=""; process.stdin.on("data", c => data += c).on("end", () => {
        try {
          const pages = JSON.parse(data);
          const expected = (value) => {
            try {
              const url = new URL(value);
              return url.protocol === "app:" || (url.protocol === "http:" &&
                (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
                url.port === "5175" && url.pathname === "/" && !url.username && !url.password && !url.hash);
            } catch { return false; }
          };
          process.exit(pages.some((p) => p.type === "page" && expected(p.url)) ? 0 : 1);
        } catch { process.exit(1); }
      });'
}

wait_for_cdp() {
  local port="$1" deadline=$((SECONDS + 45))
  while [ "$SECONDS" -lt "$deadline" ]; do
    cdp_ready "$port" && return 0
    sleep 0.35
  done
  return 1
}

write_state() {
  local port="$1" pid="$2"
  "$NODE" -e '
    const fs = require("node:fs");
    const [file, port, pid, root, theme, exe] = process.argv.slice(1);
    const value = { schemaVersion: 1, platform: process.platform, port: Number(port), injectorPid: Number(pid), projectRoot: root, themeDir: theme, codexExe: exe, updatedAt: new Date().toISOString() };
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); fs.renameSync(temp, file);
  ' "$STATE_PATH" "$port" "$pid" "$PROJECT_ROOT" "$THEME_DIR" "$CODEX_EXE"
}

state_port() {
  [ -f "$STATE_PATH" ] || return 1
  "$NODE" -e 'try { process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1])).port || "")); } catch {}' "$STATE_PATH"
}

stop_injector() {
  [ -f "$STATE_PATH" ] || return 0
  local pid
  pid="$($NODE -e 'try { process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1])).injectorPid || "")); } catch {}' "$STATE_PATH")"
  case "$pid" in ''|*[!0-9]*) return 0 ;; esac
  if kill -0 "$pid" 2>/dev/null && tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -Fq "$INJECTOR --watch"; then
    kill -TERM "$pid" 2>/dev/null || return 1
    local deadline=$((SECONDS + 5))
    while kill -0 "$pid" 2>/dev/null && [ "$SECONDS" -lt "$deadline" ]; do sleep 0.1; done
    kill -0 "$pid" 2>/dev/null && return 1
  fi
}
