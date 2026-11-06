#!/usr/bin/env bash
set -euo pipefail

# ASound installer — copies the custom card (and optionally the theme)
# into a Home Assistant config directory, locally or over SSH.
#
# Local:   ./install.sh /path/to/ha-config
# Remote:  ./install.sh user@host /path/to/ha-config

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

# ── Helpers ──

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

run "mkdir -p $HA_CONFIG/www $HA_CONFIG/themes"

copy_file "$SCRIPT_DIR/www/asound-card.js" "$HA_CONFIG/www/asound-card.js"
echo "  ✔ www/asound-card.js"

copy_file "$SCRIPT_DIR/themes/asound.yaml" "$HA_CONFIG/themes/asound.yaml"
echo "  ✔ themes/asound.yaml"

# ── Patch configuration.yaml for themes if needed ──

CONFIG_FILE="$HA_CONFIG/configuration.yaml"

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
echo "  Installed! Next steps:"
echo ""
echo "  1. Add the card as a resource in HA:"
echo "     Settings → Dashboards → ⋮ → Resources → Add"
echo "     URL: /local/asound-card.js"
echo "     Type: JavaScript Module"
echo ""
echo "  2. Restart Home Assistant (or reload resources)."
echo ""
echo "  3. Add the card to any dashboard:"
echo "     Edit dashboard → Add Card → search 'ASound'"
echo "     Pick your main speaker entity and add speakers."
echo ""
echo "  4. Theme (optional): Profile → Theme → ASound"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
