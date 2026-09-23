#!/bin/bash
# Unattended cross-account storage copy: OLD (oldsb) -> NEW (newsb), bucket fight-videos.
# Runs three stages in order, all resumable (rclone skips files already present with matching size):
#   1. Batch 1  — priority active set (last-3-months uploads + all in-flight work)
#   2. Batch 2  — older completed fights
#   3. Reconcile — full bucket sweep (catches the ~28 orphan files not in the DB, plus any retries)
# rclone remotes oldsb/newsb are pre-configured in ~/.config/rclone/rclone.conf.
set -uo pipefail

COMMON=(
  --no-traverse
  --transfers 4 --checkers 8
  --s3-chunk-size 50M --s3-upload-concurrency 4
  --retries 5 --low-level-retries 10 --retries-sleep 5s
  --header-upload "Cache-Control: max-age=2592000"
  --stats 60s --stats-one-line -v
)
SRC=oldsb:fight-videos
DST=newsb:fight-videos

echo "############ MIGRATION COPY START $(date) ############"

echo "############ STAGE 1: BATCH 1 (priority) $(date) ############"
rclone copy "$SRC" "$DST" --files-from scripts/migration-lists/batch1.txt "${COMMON[@]}" --log-file /tmp/rclone-batch1.log
echo "stage1 exit: $? @ $(date)"

echo "############ STAGE 2: BATCH 2 (older) $(date) ############"
rclone copy "$SRC" "$DST" --files-from scripts/migration-lists/batch2.txt "${COMMON[@]}" --log-file /tmp/rclone-batch2.log
echo "stage2 exit: $? @ $(date)"

echo "############ STAGE 3: RECONCILE (full sweep) $(date) ############"
rclone copy "$SRC" "$DST" "${COMMON[@]}" --log-file /tmp/rclone-reconcile.log
echo "stage3 exit: $? @ $(date)"

echo "############ FINAL PARITY CHECK $(date) ############"
echo "OLD file count: $(rclone size "$SRC" --json 2>/dev/null)"
echo "NEW file count: $(rclone size "$DST" --json 2>/dev/null)"
echo "############ MIGRATION COPY DONE $(date) ############"
