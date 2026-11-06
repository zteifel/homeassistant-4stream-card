#!/usr/bin/env bash
set -euo pipefail

# ASound installer — copies theme, package, and dashboard into a
# Home Assistant config directory, locally or over SSH.
#
# Local:   ./install.sh /path/to/ha-config
# Remote:  ./install.sh user@host /path/to/ha-config
#
# If the config path is omitted, common locations are tried
# (/config, /homeassistant, ~/.homeassistant).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh [ha-config-path]
  ./install.sh user@host [ha-config-path]

Examples:
  ./install.sh /config
  ./install.sh root@192.168.1.50 /config
  ./install.sh pi@homeassistant.local ~/.homeassistant
  ./install.sh root@192.168.1.50            # auto-detect path
EOF
  exit 1
}

# ── Parse arguments ──

REMOTE=""
HA_CONFIG=""

if [[ $# -ge 1 && "$1" == *@* ]]; then
  REMOTE="$1"
  shift
fi

HA_CONFIG="${1:-}"

# ── Helper: run a command locally or remotely ──

run() {
  if [[ -n "$REMOTE" ]]; then
    ssh "$REMOTE" "$@"
  else
    eval "$@"
  fi
}

copy_file() {
  local src="$1" dest="$2"
  if [[ -n "$REMOTE" ]]; then
    scp -q "$src" "$REMOTE:$dest"
  else
    cp "$src" "$dest"
  fi
}

# ── Resolve HA config path ──

if [[ -z "$HA_CONFIG" ]]; then
  for candidate in /config /homeassistant '~/.homeassistant'; do
    if run "test -f $candidate/configuration.yaml" 2>/dev/null; then
      HA_CONFIG="$candidate"
      break
    fi
  done
fi

if [[ -z "$HA_CONFIG" ]]; then
  echo "Error: could not find configuration.yaml."
  echo ""
  usage
fi

if ! run "test -f $HA_CONFIG/configuration.yaml" 2>/dev/null; then
  echo "Error: $HA_CONFIG/configuration.yaml not found."
  [[ -n "$REMOTE" ]] && echo "       (on $REMOTE)"
  echo ""
  usage
fi

TARGET="${REMOTE:+$REMOTE:}$HA_CONFIG"
echo "Installing to: $TARGET"
echo ""

# ── Copy files ──

run "mkdir -p $HA_CONFIG/packages $HA_CONFIG/themes"

copy_file "$SCRIPT_DIR/packages/asound.yaml" "$HA_CONFIG/packages/asound.yaml"
echo "  ✔ packages/asound.yaml"

copy_file "$SCRIPT_DIR/themes/asound.yaml" "$HA_CONFIG/themes/asound.yaml"
echo "  ✔ themes/asound.yaml"

copy_file "$SCRIPT_DIR/dashboard.yaml" "$HA_CONFIG/asound_dashboard.yaml"
echo "  ✔ asound_dashboard.yaml"

# ── Patch configuration.yaml if needed ──

CONFIG_FILE="$HA_CONFIG/configuration.yaml"

if ! run "grep -qE '^\s*packages\s*:' $CONFIG_FILE"; then
  if run "grep -qE '^homeassistant\s*:' $CONFIG_FILE"; then
    run "sed -i '/^homeassistant\s*:/a\\  packages: !include_dir_named packages' $CONFIG_FILE"
  else
    run "printf '\nhomeassistant:\n  packages: !include_dir_named packages\n' >> $CONFIG_FILE"
  fi
  echo "  ✔ Added packages include to configuration.yaml"
else
  echo "  · packages already configured"
fi

if ! run "grep -qE '^\s*themes\s*:' $CONFIG_FILE"; then
  if run "grep -qE '^frontend\s*:' $CONFIG_FILE"; then
    run "sed -i '/^frontend\s*:/a\\  themes: !include_dir_merge_named themes' $CONFIG_FILE"
  else
    run "printf '\nfrontend:\n  themes: !include_dir_merge_named themes\n' >> $CONFIG_FILE"
  fi
  echo "  ✔ Added themes include to configuration.yaml"
else
  echo "  · themes already configured"
fi

# ── Done ──

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installed! Two things left:"
echo ""
echo "  1. Edit $TARGET/packages/asound.yaml"
echo "     Replace every media_player.speaker_N with"
echo "     your actual speaker entity IDs."
echo ""
echo "  2. Restart Home Assistant."
echo ""
echo "  Then:"
echo "  • Theme: Profile → Theme → ASound"
echo "  • Dashboard: Settings → Dashboards → Add Dashboard"
echo "    → YAML mode → paste contents of asound_dashboard.yaml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
