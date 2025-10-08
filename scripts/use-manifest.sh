#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-}"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "Usage: $0 <dev|prod>" >&2
  exit 1
fi

SOURCE_MANIFEST="${ROOT_DIR}/manifest.${MODE}.json"
TARGET_MANIFEST="${ROOT_DIR}/manifest.json"

if [[ ! -f "${SOURCE_MANIFEST}" ]]; then
  echo "Missing ${SOURCE_MANIFEST}." >&2
  exit 1
fi

cp "${SOURCE_MANIFEST}" "${TARGET_MANIFEST}"
echo "Updated manifest.json from manifest.${MODE}.json"
