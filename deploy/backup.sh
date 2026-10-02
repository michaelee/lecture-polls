#!/bin/sh
# Consistent online backup of the SQLite database (safe while the app is running).
# Usage: backup.sh /path/to/poller.db /path/to/backup-dir
set -eu
DB="${1:?path to poller.db}"; DEST="${2:?backup directory}"
mkdir -p "$DEST"
OUT="$DEST/poller-$(date +%Y%m%d-%H%M%S).db"
sqlite3 "$DB" ".backup '$OUT'"
find "$DEST" -name 'poller-*.db' -mtime +14 -delete
echo "Backed up to $OUT"
