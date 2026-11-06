#!/usr/bin/env bash
set -euo pipefail

# ASound installer — copies theme, package, and dashboard to your
# Home Assistant config directory and wires up configuration.yaml.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Resolve HA config path ──

HA_CONFIG="${1:-}"

if [[ -z "$HA_CONFIG" ]]; then
  # Try common locations
  for candidate in /config /homeassistant ~/.homeassistant; do
    if [[ -f "$candidate/configuration.yaml" ]]; then
      HA_CONFIG="$candidate"
      break
    fi
  done
fi

if [[ -z "$HA_CONFIG" ]] || [[ ! -f "$HA_CONFIG/configuration.yaml" ]]; then
  echo "Usage: ./install.sh /path/to/ha-config"
  echo ""
  echo "Could not find configuration.yaml automatically."
  echo "Pass your Home Assistant config directory as the first argument."
  echo ""
  echo "Common locations:"
  echo "  Docker / HAOS:  /config"
  echo "  Core (venv):    ~/.homeassistant"
  exit 1
fi

echo "Home Assistant config: $HA_CONFIG"
echo ""

# ── Copy files ──

mkdir -p "$HA_CONFIG/packages"
mkdir -p "$HA_CONFIG/themes"

cp "$SCRIPT_DIR/packages/asound.yaml" "$HA_CONFIG/packages/asound.yaml"
echo "  ✔ Copied packages/asound.yaml"

cp "$SCRIPT_DIR/themes/asound.yaml" "$HA_CONFIG/themes/asound.yaml"
echo "  ✔ Copied themes/asound.yaml"

cp "$SCRIPT_DIR/dashboard.yaml" "$HA_CONFIG/asound_dashboard.yaml"
echo "  ✔ Copied dashboard.yaml (reference copy)"

# ── Patch configuration.yaml if needed ──

CONFIG_FILE="$HA_CONFIG/configuration.yaml"
CHANGED=false

# Check for packages include
if ! grep -qE '^\s*packages\s*:' "$CONFIG_FILE"; then
  # Add under homeassistant: key, or create it
  if grep -qE '^homeassistant\s*:' "$CONFIG_FILE"; then
    # Append packages line after the homeassistant: key
    sed -i '/^homeassistant\s*:/a\  packages: !include_dir_named packages' "$CONFIG_FILE"
  else
    printf '\nhomeassistant:\n  packages: !include_dir_named packages\n' >> "$CONFIG_FILE"
  fi
  echo "  ✔ Added packages include to configuration.yaml"
  CHANGED=true
else
  echo "  · packages already configured — skipped"
fi

# Check for themes include
if ! grep -qE '^\s*themes\s*:' "$CONFIG_FILE"; then
  if grep -qE '^frontend\s*:' "$CONFIG_FILE"; then
    sed -i '/^frontend\s*:/a\  themes: !include_dir_merge_named themes' "$CONFIG_FILE"
  else
    printf '\nfrontend:\n  themes: !include_dir_merge_named themes\n' >> "$CONFIG_FILE"
  fi
  echo "  ✔ Added themes include to configuration.yaml"
  CHANGED=true
else
  echo "  · themes already configured — skipped"
fi

# ── Done ──

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installed! Two things left:"
echo ""
echo "  1. Edit $HA_CONFIG/packages/asound.yaml"
echo "     Replace every media_player.speaker_N with"
echo "     your actual speaker entity IDs."
echo ""
echo "  2. Restart Home Assistant."
echo ""
echo "  Then:"
echo "  • Theme: Profile → Theme → ASound"
echo "  • Dashboard: create a new dashboard in YAML mode"
echo "    and paste the contents of asound_dashboard.yaml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
