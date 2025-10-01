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
    compose up -d postgres redis redis-rest
    ;;
  stop)
    compose stop postgres redis redis-rest
    ;;
  status)
    compose ps postgres redis redis-rest
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    echo "Usage: $0 <start|stop|status>" >&2
    exit 1
    ;;
esac
