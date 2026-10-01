#!/bin/sh
# Kunlik zaxira nusxa (cron: 0 3 * * * /opt/analytika/deploy/backup.sh)
set -e
DIR=${BACKUP_DIR:-/opt/analytika/backups}
mkdir -p "$DIR"
sqlite3 /opt/analytika/data/analytika.db ".backup '$DIR/analytika-$(date +%F).db'"
find "$DIR" -name 'analytika-*.db' -mtime +30 -delete
