#!/usr/bin/env bash
# Runs the visual parity suite inside the Playwright Linux image, the same renderer CI uses, so
# baselines never compare across operating systems.
#
#   pnpm --filter demo e2e:visual          # compare against the committed baselines
#   pnpm --filter demo e2e:visual:update   # regenerate them (review the diff before committing)
#
# The repository is copied into the container (without node_modules), so the host install is
# never touched; only the screenshot folder is written back, and only when updating.
set -euo pipefail

cd "$(dirname "$0")/../../.."
ROOT="$(pwd -W 2>/dev/null || pwd)"
IMAGE="mcr.microsoft.com/playwright:v1.63.0-noble"
ARGS="$*"
UPDATE=""
[[ " $ARGS " == *" --update-snapshots "* ]] && UPDATE="--update-snapshots"
mkdir -p apps/demo/e2e/__screenshots__

MSYS_NO_PATHCONV=1 docker run --rm --ipc=host \
  -v "$ROOT:/src:ro" \
  -v "$ROOT/apps/demo/e2e/__screenshots__:/snapshots" \
  -e VISUAL=1 -e CI=1 -e UPDATE="$UPDATE" -e ARGS="$ARGS" \
  "$IMAGE" bash -c '
    set -e
    mkdir -p /work
    cd /src
    tar --exclude=./node_modules --exclude="*/node_modules" --exclude="*/dist" --exclude=./.git \
      --exclude="*/test-results" --exclude="*/playwright-report" -cf - . | tar -xf - -C /work
    cd /work
    corepack enable
    pnpm install --frozen-lockfile
    pnpm build
    cd apps/demo
    npx playwright test --project=visual $ARGS
    if [ "$UPDATE" = "--update-snapshots" ]; then
      rm -rf /snapshots/* && cp -r e2e/__screenshots__/. /snapshots/
    fi
  '
