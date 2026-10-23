set -eu

cd "$(dirname "$0")"

if [ "$#" -eq 0 ]; then
    set -- */
fi

hurl --test --variable "base_url=${RADAR_BASE_URL:-http://localhost:8080/api}" "$@"
