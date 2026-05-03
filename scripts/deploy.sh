#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  npm run deploy -- prod
  npm run deploy:prod
  bash scripts/deploy.sh prod [--dry-run]

Options:
  --dry-run   Print the planned steps without changing the checkout or restarting services.

Environment overrides:
  DEPLOY_SERVICE_NAME   systemd service to restart (default: lead-os)
  DEPLOY_MANAGER_URL    manager URL for health checks (default: https://lead.daycommand.online)
  DEPLOY_DEVELOPER_URL  developer URL for route checks (default: https://developer.daycommand.online)
  DEPLOY_HEALTH_TIMEOUT_SECONDS   total time to wait for health checks (default: 30)
  DEPLOY_HEALTH_RETRY_DELAY_SECONDS   pause between health retries (default: 2)
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_cmd() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi

  "$@"
}

wait_for_check() {
  local label="$1"
  shift

  if [[ "${DRY_RUN}" == "1" ]]; then
    printf '[dry-run] wait for %s: %s\n' "${label}" "$*"
    return 0
  fi

  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))

  while true; do
    if "$@"; then
      return 0
    fi

    if (( SECONDS >= deadline )); then
      echo "Timed out waiting for ${label} after ${HEALTH_TIMEOUT_SECONDS}s." >&2
      return 1
    fi

    log "${label} not ready yet; retrying in ${HEALTH_RETRY_DELAY_SECONDS}s"
    sleep "${HEALTH_RETRY_DELAY_SECONDS}"
  done
}

MODE="${1:-}"
DRY_RUN="0"

if [[ $# -ge 1 ]]; then
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${MODE}" || "${MODE}" == "-h" || "${MODE}" == "--help" ]]; then
  usage
  exit 1
fi

if [[ "${MODE}" != "prod" ]]; then
  echo "Unsupported deploy target: ${MODE}" >&2
  echo "Only 'prod' is supported for this repository." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
EXPECTED_BASENAME="lead-os-prod"
SERVICE_NAME="${DEPLOY_SERVICE_NAME:-lead-os}"
MANAGER_URL="${DEPLOY_MANAGER_URL:-https://lead.daycommand.online}"
DEVELOPER_URL="${DEPLOY_DEVELOPER_URL:-https://developer.daycommand.online}"
HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT_SECONDS:-30}"
HEALTH_RETRY_DELAY_SECONDS="${DEPLOY_HEALTH_RETRY_DELAY_SECONDS:-2}"

if [[ "$(basename "${ROOT_DIR}")" != "${EXPECTED_BASENAME}" ]]; then
  ROOT_DIR="/home/ubuntu/apps/${EXPECTED_BASENAME}"
fi

if [[ ! -d "${ROOT_DIR}/.git" ]]; then
  echo "Production checkout not found at '${ROOT_DIR}'." >&2
  exit 1
fi

if [[ "$(basename "${ROOT_DIR}")" != "${EXPECTED_BASENAME}" ]]; then
  echo "Refusing to deploy from '${ROOT_DIR}'." >&2
  echo "Expected the production checkout to be named '${EXPECTED_BASENAME}'." >&2
  exit 1
fi

cd "${ROOT_DIR}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is dirty. Clean or commit local changes before deploying." >&2
  git status --short >&2
  exit 1
fi

log "Fetching latest production target"
run_cmd git fetch origin main

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"

if [[ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]]; then
  log "Updating checkout to origin/main"
  run_cmd git pull --ff-only origin main
else
  log "Checkout already matches origin/main"
fi

log "Installing dependencies"
run_cmd npm install

log "Building client and server"
run_cmd npm run build

log "Restarting ${SERVICE_NAME}"
run_cmd sudo systemctl restart "${SERVICE_NAME}"

log "Checking ${SERVICE_NAME} status"
run_cmd sudo systemctl status "${SERVICE_NAME}" --no-pager

log "Verifying manager URL"
wait_for_check "manager URL" curl -fsS -I "${MANAGER_URL}"

log "Verifying developer URL"
wait_for_check "developer URL" curl -fsS -I "${DEVELOPER_URL}/my-day"

log "Verifying health endpoint"
wait_for_check "health endpoint" curl -fsS "${MANAGER_URL}/api/health"

log "Production deploy completed"
