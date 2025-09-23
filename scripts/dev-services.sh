#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"

if [[ -z "$COMMAND" ]]; then
  echo "Usage: $0 <start|stop|status>" >&2
  exit 1
fi

compose() {
  docker compose "$@"
}

case "$COMMAND" in
  start)
    compose up -d postgres redis
    ;;
  stop)
    compose stop postgres redis
    ;;
  status)
    compose ps postgres redis
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    echo "Usage: $0 <start|stop|status>" >&2
    exit 1
    ;;
esac
