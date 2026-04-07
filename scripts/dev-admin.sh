#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATIC_PORT="${STATIC_PORT:-8000}"
STATIC_PID=""
PROXY_PID=""

cleanup() {
  if [[ -n "${STATIC_PID}" ]] && kill -0 "${STATIC_PID}" 2>/dev/null; then
    kill "${STATIC_PID}" 2>/dev/null || true
  fi

  if [[ -n "${PROXY_PID}" ]] && kill -0 "${PROXY_PID}" 2>/dev/null; then
    kill "${PROXY_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"

python3 -m http.server "${STATIC_PORT}" --directory "${ROOT_DIR}" &
STATIC_PID=$!

npx --yes decap-server &
PROXY_PID=$!

printf 'Site local: http://localhost:%s\n' "${STATIC_PORT}"
printf 'Admin local: http://localhost:%s/admin/\n' "${STATIC_PORT}"
printf 'Proxy Decap: http://localhost:8081\n'

ADMIN_URL="http://localhost:${STATIC_PORT}/admin/"
if [[ -n "${BROWSER:-}" ]]; then
  "${BROWSER}" "${ADMIN_URL}" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${ADMIN_URL}" >/dev/null 2>&1 || true
fi

wait -n "${STATIC_PID}" "${PROXY_PID}"
