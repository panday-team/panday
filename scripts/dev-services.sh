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

wait_for_postgres() {
  echo "Waiting for PostgreSQL to be ready..."
  local max_attempts=30
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if docker exec panday_postgres pg_isready -U neon -d neondb > /dev/null 2>&1; then
      echo "✓ PostgreSQL is ready!"
      sleep 2
      return 0
    fi
    
    if [ $attempt -eq $max_attempts ]; then
      echo "✗ PostgreSQL failed to start in time" >&2
      return 1
    fi
    
    echo "  Attempt $attempt/$max_attempts..."
    sleep 1
    ((attempt++))
  done
}

case "$COMMAND" in
  start)
    compose up -d postgres redis redis-rest
    wait_for_postgres
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
