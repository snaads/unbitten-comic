#!/usr/bin/env bash
set -euo pipefail

HOST="myprod"
REMOTE_DIR="/var/www/unbitten"   # <- change to your nginx web root

echo "▶ Build"
node build.js                    # creates ./public

echo "▶ Deploy"
rsync -az --delete \
  --exclude ".DS_Store" \
  public/ "${HOST}:${REMOTE_DIR}"

echo "✅ Done"