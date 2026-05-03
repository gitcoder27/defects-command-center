#!/usr/bin/env bash

set -euo pipefail

tracked_artifacts="$(
  git ls-files \
    'data/*.db' \
    'data/*.db-*' \
    'data/*.db.bak*' \
    'data/**/*.db' \
    'data/**/*.db-*' \
    'data/**/*.db.bak*' \
    ':!:data/.gitkeep'
)"

if [[ -n "${tracked_artifacts}" ]]; then
  echo "Tracked runtime database artifacts are not allowed:" >&2
  echo "${tracked_artifacts}" >&2
  echo "Remove them from git and keep runtime SQLite data under ignored data/ paths." >&2
  exit 1
fi
