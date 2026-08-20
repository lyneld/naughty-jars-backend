#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${BASE_DIR:-/var/www/naughty-jars}"
CURRENT_LINK="${BASE_DIR}/current"
PREVIOUS_LINK="${BASE_DIR}/previous"

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run rollback as the unprivileged application user, not root." >&2
  exit 1
fi
previous_release="$(readlink -f "${PREVIOUS_LINK}")"
case "${previous_release}" in
  "${BASE_DIR}/releases/"*) ;;
  *) echo "Previous release is missing or unsafe: ${previous_release}" >&2; exit 1 ;;
esac

current_release="$(readlink -f "${CURRENT_LINK}")"
ln -sfn "${previous_release}" "${BASE_DIR}/.current-next"
mv -Tf "${BASE_DIR}/.current-next" "${CURRENT_LINK}"
ln -sfn "${current_release}" "${PREVIOUS_LINK}"
APP_CURRENT="${CURRENT_LINK}" pm2 startOrReload "${CURRENT_LINK}/backend/ecosystem.config.cjs" --env production --update-env
curl --fail --retry 20 --retry-delay 1 http://127.0.0.1:5001/api/health/ready
pm2 save
echo "Rolled back to ${previous_release}"
