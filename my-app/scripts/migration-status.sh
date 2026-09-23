#!/bin/bash
# READ-ONLY Supabase migration status snapshot. Safe to run anytime.
# Usage: bash scripts/migration-status.sh
cd "$(dirname "$0")/.." || exit 1

# Pull NEW DB connection from .env (no secrets hardcoded in this file)
NEW_DB=$(grep '^NEW_DIRECT_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | xargs)

bar() { printf '═%.0s' {1..56}; echo; }

bar
echo "   SUPABASE MIGRATION STATUS — $(date '+%Y-%m-%d %H:%M:%S')"
bar

echo "▶ DATABASE (fully copied to NEW):"
psql "$NEW_DB" -tA -F' | ' -c "SELECT
  'users='     || (SELECT count(*) FROM \"User\"),
  'videos='    || (SELECT count(*) FROM \"Video\"),
  'assignmnt=' || (SELECT count(*) FROM \"VideoAssignment\"),
  'events='    || (SELECT count(*) FROM \"Event\")
;" 2>/dev/null | sed 's/^/   /'

echo
echo "▶ VIDEO FILES (copying OLD → NEW):"
NEWCOUNT=$(psql "$NEW_DB" -tAc "SELECT count(*) FROM storage.objects WHERE bucket_id='fight-videos';" 2>/dev/null)
PCT=$(( NEWCOUNT * 100 / 766 ))
echo "   Copied to NEW: ${NEWCOUNT} / 766 files  (${PCT}%)"

echo
echo "▶ CURRENT STAGE:"
grep '####' /tmp/rclone-migration.log 2>/dev/null | tail -1 | sed 's/#//g; s/^/   /'

echo
echo "▶ LIVE TRANSFER (latest speed / ETA):"
LATEST=$(ls -t /tmp/rclone-batch1.log /tmp/rclone-batch2.log /tmp/rclone-reconcile.log 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  echo "   ($(basename "$LATEST"))"
  grep 'ETA' "$LATEST" 2>/dev/null | tail -1 | sed 's/^/   /'
else
  echo "   (copy not currently running)"
fi
bar
