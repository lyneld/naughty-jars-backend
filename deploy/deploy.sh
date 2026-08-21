#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${BASE_DIR:-/var/www/naughty-jars}"
RELEASES_DIR="${BASE_DIR}/releases"
CURRENT_LINK="${BASE_DIR}/current"
PREVIOUS_LINK="${BASE_DIR}/previous"
FRONTEND_REPO="${FRONTEND_REPO:-git@github-naughty-jars-frontend:lyneld/naughtyjars.git}"
BACKEND_REPO="${BACKEND_REPO:-git@github-naughty-jars-backend:lyneld/naughty-jars-backend.git}"
FRONTEND_REF="${FRONTEND_REF:-main}"
BACKEND_REF="${BACKEND_REF:-main}"
SITE_URL="${SITE_URL:?Set SITE_URL to the canonical https URL, without a trailing slash}"
ENV_FILE="${ENV_FILE:-${BASE_DIR}/backend.env}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run deployments as the unprivileged application user, not root." >&2
  exit 1
fi
if [[ ! -r "${ENV_FILE}" ]]; then
  echo "Cannot read ${ENV_FILE}." >&2
  exit 1
fi
if [[ "${SITE_URL}" != https://* || "${SITE_URL}" == */ ]]; then
  echo "SITE_URL must be an https URL without a trailing slash." >&2
  exit 1
fi
if [[ "${BASE_DIR}" != "/var/www/naughty-jars" && "${ALLOW_CUSTOM_BASE_DIR:-false}" != "true" ]]; then
  echo "Refusing an unexpected BASE_DIR without ALLOW_CUSTOM_BASE_DIR=true." >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}" "${RELEASE_DIR}"
activated=false
cleanup_failed_release() {
  if [[ "${activated}" == "false" && -d "${RELEASE_DIR}" ]]; then
    rm -rf -- "${RELEASE_DIR}"
  fi
}
trap cleanup_failed_release ERR

clone_ref() {
  local repo="$1"
  local ref="$2"
  local destination="$3"
  git clone --filter=blob:none --no-checkout "${repo}" "${destination}"
  git -C "${destination}" fetch --depth 1 origin "${ref}"
  git -C "${destination}" checkout --detach FETCH_HEAD
}

clone_ref "${FRONTEND_REPO}" "${FRONTEND_REF}" "${RELEASE_DIR}/frontend"
clone_ref "${BACKEND_REPO}" "${BACKEND_REF}" "${RELEASE_DIR}/backend"

npm --prefix "${RELEASE_DIR}/frontend" ci
VITE_API_URL=/api VITE_SITE_URL="${SITE_URL}" npm --prefix "${RELEASE_DIR}/frontend" run build
rm -rf -- "${RELEASE_DIR}/frontend/node_modules"

npm --prefix "${RELEASE_DIR}/backend" ci
npm --prefix "${RELEASE_DIR}/backend" test
npm --prefix "${RELEASE_DIR}/backend" run build
ENV_FILE="${ENV_FILE}" npm --prefix "${RELEASE_DIR}/backend" run audit:media -- --require-clean
npm --prefix "${RELEASE_DIR}/backend" prune --omit=dev

previous_release=""
if [[ -L "${CURRENT_LINK}" ]]; then
  previous_release="$(readlink -f "${CURRENT_LINK}")"
  ln -sfn "${previous_release}" "${PREVIOUS_LINK}"
fi

ln -sfn "${RELEASE_DIR}" "${BASE_DIR}/.current-next"
mv -Tf "${BASE_DIR}/.current-next" "${CURRENT_LINK}"
activated=true

rollback() {
  if [[ -n "${previous_release}" && -d "${previous_release}" ]]; then
    ln -sfn "${previous_release}" "${BASE_DIR}/.current-next"
    mv -Tf "${BASE_DIR}/.current-next" "${CURRENT_LINK}"
    APP_CURRENT="${CURRENT_LINK}" pm2 startOrReload "${CURRENT_LINK}/backend/ecosystem.config.cjs" --env production --update-env
  fi
}

APP_CURRENT="${CURRENT_LINK}" pm2 startOrReload "${CURRENT_LINK}/backend/ecosystem.config.cjs" --env production --update-env

ready=false
for _attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:5001/api/health/ready >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "${ready}" != "true" ]]; then
  echo "New release did not become ready; restoring the previous release." >&2
  rollback
  exit 1
fi

pm2 save
trap - ERR

mapfile -t old_releases < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2-)
for old_release in "${old_releases[@]}"; do
  case "${old_release}" in
    "${RELEASES_DIR}"/*) rm -rf -- "${old_release}" ;;
    *) echo "Refusing to remove unexpected path: ${old_release}" >&2 ;;
  esac
done

echo "Deployed ${RELEASE_ID}: frontend ${FRONTEND_REF}, backend ${BACKEND_REF}"
