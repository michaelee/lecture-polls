#!/bin/sh
# Pull, rebuild, migrate, and restart the launchd service. Run from anywhere.
set -eu
cd "$(dirname "$0")/.."
git pull --ff-only
npm ci --include=dev
npx prisma migrate deploy
npm run build
launchctl kickstart -k "gui/$(id -u)/com.poller.app"
echo "Updated and restarted."
