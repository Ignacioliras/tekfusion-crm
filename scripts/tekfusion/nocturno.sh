#!/usr/bin/env bash
# macOS / Linux: lanza la sesión nocturna. Uso: scripts/tekfusion/nocturno.sh [--fecha AAAA-MM-DD] [--hasta 07:00]
cd "$(dirname "$0")/../.." && exec node scripts/tekfusion/nocturno.mjs "$@"
