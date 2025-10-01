#!/bin/sh
set -e

TARGET_USER="${TARGET_USER:-expressjs}"
TARGET_GROUP="${TARGET_GROUP:-nodejs}"
DEFAULT_DATA_DIR="$(pwd)/data/scryfall"
RAW_DATA_DIR="${SCRYFALL_DATA_DIR:-$DEFAULT_DATA_DIR}"

case "$RAW_DATA_DIR" in
  /*)
    DATA_DIR="$RAW_DATA_DIR"
    ;;
  *)
    DATA_DIR="$(pwd)/$RAW_DATA_DIR"
    ;;
esac

DATA_PARENT="$(dirname "$DATA_DIR")"

if [ ! -d "$DATA_PARENT" ]; then
  mkdir -p "$DATA_PARENT"
fi

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

chown -R "$TARGET_USER":"$TARGET_GROUP" "$DATA_DIR" 2>/dev/null || true
chown "$TARGET_USER":"$TARGET_GROUP" "$DATA_PARENT" 2>/dev/null || true

if [ -d "/home/$TARGET_USER/.cache" ]; then
  chown -R "$TARGET_USER":"$TARGET_GROUP" "/home/$TARGET_USER/.cache" 2>/dev/null || true
fi

if command -v su-exec >/dev/null 2>&1; then
  exec su-exec "$TARGET_USER":"$TARGET_GROUP" "$@"
fi

echo "su-exec not found; running as current user" >&2
exec "$@"
