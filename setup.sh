#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/.setup.env" ]; then
  set -a
  . "${SCRIPT_DIR}/.setup.env"
  set +a
fi

COUCHDB_URL="${COUCHDB_URL:-http://127.0.0.1:8123/db}"
COUCHDB_ADMIN_USER="${COUCHDB_ADMIN_USER:-couchdb}"
COUCHDB_ADMIN_PASSWORD="${COUCHDB_ADMIN_PASSWORD:-couchdb}"
USERS_DB="${USERS_DB:-laserjobs_users}"
USERS_DB_MEMBER_ROLE="${USERS_DB_MEMBER_ROLE:-laserjobs_user}"
AZIENDA_ROLE_PREFIX="${AZIENDA_ROLE_PREFIX:-laserjobs_company}"
PASSWORD_ITERATIONS="${PASSWORD_ITERATIONS:-120000}"
CURL_IMAGE="${CURL_IMAGE:-curlimages/curl:8.11.1}"

usage() {
  cat <<'EOF'
Uso:
  ./setup.sh create-user --username USER --password PASS --azienda DB --livello editor|viewer
  ./setup.sh list-users
  ./setup.sh update-user-password --username USER --password PASS

Variabili ambiente opzionali:
  COUCHDB_URL (default: http://127.0.0.1:8123/db)
  COUCHDB_ADMIN_USER (default: couchdb)
  COUCHDB_ADMIN_PASSWORD (default: couchdb)
  USERS_DB (default: laserjobs_users)
EOF
}

require_bin() {
  command -v "$1" >/dev/null 2>&1 || { echo "Comando mancante: $1"; exit 1; }
}

auth() {
  printf "%s:%s" "$COUCHDB_ADMIN_USER" "$COUCHDB_ADMIN_PASSWORD"
}

extract_json_field() {
  key="$1"
  sed -n "s/.*\"${key}\":\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

http_code() {
  path="$1"
  docker run --rm --network host "$CURL_IMAGE" -s -o /dev/null -w "%{http_code}" \
    -u "$(auth)" "${COUCHDB_URL}/${path}"
}

http_get() {
  path="$1"
  docker run --rm --network host "$CURL_IMAGE" -fsS \
    -u "$(auth)" "${COUCHDB_URL}/${path}"
}

http_put() {
  path="$1"
  data="$2"
  docker run --rm --network host "$CURL_IMAGE" -fsS -X PUT \
    -u "$(auth)" -H "Content-Type: application/json" \
    -d "$data" "${COUCHDB_URL}/${path}"
}

http_put_empty() {
  path="$1"
  docker run --rm --network host "$CURL_IMAGE" -fsS -X PUT \
    -u "$(auth)" "${COUCHDB_URL}/${path}"
}

node_hash() {
  password="$1"
  salt="$2"
  iterations="$3"
  docker run --rm node:24-alpine node -e \
    "const c=require('crypto');console.log(c.pbkdf2Sync(process.argv[1],process.argv[2],Number(process.argv[3]),32,'sha256').toString('hex'))" \
    "$password" "$salt" "$iterations"
}

ensure_db() {
  db="$1"
  code=""
  code="$(http_code "$db")"
  if [ "$code" = "404" ]; then
    http_put_empty "$db" >/dev/null
  fi
}

set_security() {
  db="$1"
  role="$2"
  http_put "${db}/_security" "{\"admins\":{\"roles\":[\"_admin\"]},\"members\":{\"roles\":[\"_admin\",\"${role}\"]}}" >/dev/null
}

create_user() {
  username="$1"
  password="$2"
  azienda="$3"
  livello="$4"
  azienda_role="${AZIENDA_ROLE_PREFIX}_${azienda}"
  couch_user_id="org.couchdb.user:${username}"
  salt=""
  hash=""

  case "$livello" in
    editor|viewer) ;;
    *) echo "LIVELLO non valido: usa editor oppure viewer"; exit 1 ;;
  esac

  ensure_db "$USERS_DB"
  ensure_db "_users"
  ensure_db "$azienda"
  set_security "$USERS_DB" "$USERS_DB_MEMBER_ROLE"
  set_security "$azienda" "$azienda_role"

  if [ "$(http_code "${USERS_DB}/${username}")" = "200" ]; then
    echo "Utente ${username} gia esistente"
    exit 1
  fi
  if [ "$(http_code "_users/${couch_user_id}")" = "200" ]; then
    echo "Login CouchDB ${username} gia esistente"
    exit 1
  fi

  http_put "_users/${couch_user_id}" "{\"_id\":\"${couch_user_id}\",\"name\":\"${username}\",\"type\":\"user\",\"roles\":[\"${USERS_DB_MEMBER_ROLE}\",\"${azienda_role}\"],\"password\":\"$(json_escape "$password")\"}" >/dev/null

  salt="$(date +%s%N | sha256sum | cut -c1-32)"
  hash="$(node_hash "$password" "$salt" "$PASSWORD_ITERATIONS")"

  http_put "${USERS_DB}/${username}" "{\"_id\":\"${username}\",\"utente\":\"${username}\",\"password_hash\":\"${hash}\",\"password_salt\":\"${salt}\",\"password_iterations\":${PASSWORD_ITERATIONS},\"azienda\":\"${azienda}\",\"livello\":\"${livello}\"}" >/dev/null

  echo "Creato utente ${username} (livello ${livello}) su azienda ${azienda}"
}

list_users() {
  code="$(http_code "${USERS_DB}")"
  if [ "$code" = "404" ]; then
    echo '{"total_rows":0,"offset":0,"rows":[]}'
    return 0
  fi
  http_get "${USERS_DB}/_all_docs?include_docs=true"
}

update_user_password() {
  username="$1"
  password="$2"
  user_doc=""
  user_rev=""
  azienda=""
  livello=""
  azienda_role=""
  couch_user_id=""
  couch_doc=""
  couch_rev=""
  salt=""
  hash=""

  user_doc="$(http_get "${USERS_DB}/${username}")"
  user_rev="$(printf '%s' "$user_doc" | extract_json_field "_rev")"
  azienda="$(printf '%s' "$user_doc" | extract_json_field "azienda")"
  livello="$(printf '%s' "$user_doc" | extract_json_field "livello")"
  [ -n "$user_rev" ] || { echo "Impossibile leggere _rev utente"; exit 1; }
  [ -n "$azienda" ] || { echo "Impossibile leggere azienda utente"; exit 1; }
  [ -n "$livello" ] || livello="viewer"

  azienda_role="${AZIENDA_ROLE_PREFIX}_${azienda}"
  couch_user_id="org.couchdb.user:${username}"

  couch_doc="$(http_get "_users/${couch_user_id}")"
  couch_rev="$(printf '%s' "$couch_doc" | extract_json_field "_rev")"
  [ -n "$couch_rev" ] || { echo "Impossibile leggere _rev utente CouchDB"; exit 1; }

  http_put "_users/${couch_user_id}" "{\"_id\":\"${couch_user_id}\",\"_rev\":\"${couch_rev}\",\"name\":\"${username}\",\"type\":\"user\",\"roles\":[\"${USERS_DB_MEMBER_ROLE}\",\"${azienda_role}\"],\"password\":\"$(json_escape "$password")\"}" >/dev/null

  salt="$(date +%s%N | sha256sum | cut -c1-32)"
  hash="$(node_hash "$password" "$salt" "$PASSWORD_ITERATIONS")"

  http_put "${USERS_DB}/${username}" "{\"_id\":\"${username}\",\"_rev\":\"${user_rev}\",\"utente\":\"${username}\",\"password_hash\":\"${hash}\",\"password_salt\":\"${salt}\",\"password_iterations\":${PASSWORD_ITERATIONS},\"azienda\":\"${azienda}\",\"livello\":\"${livello}\"}" >/dev/null

  echo "Password aggiornata per ${username}"
}

main() {
  require_bin docker
  require_bin sed

  cmd="${1:-}"
  shift || true

  case "$cmd" in
    create-user)
      username=""
      password=""
      azienda=""
      livello=""
      while [ "$#" -gt 0 ]; do
        case "$1" in
          --username) username="${2:-}"; shift 2 ;;
          --password) password="${2:-}"; shift 2 ;;
          --azienda) azienda="${2:-}"; shift 2 ;;
          --livello) livello="${2:-}"; shift 2 ;;
          *) echo "Argomento non riconosciuto: $1"; usage; exit 1 ;;
        esac
      done
      [ -n "$username" ] || { echo "Manca --username"; exit 1; }
      [ -n "$password" ] || { echo "Manca --password"; exit 1; }
      [ -n "$azienda" ] || { echo "Manca --azienda"; exit 1; }
      [ -n "$livello" ] || { echo "Manca --livello"; exit 1; }
      create_user "$username" "$password" "$azienda" "$livello"
      ;;
    list-users)
      list_users
      ;;
    update-user-password)
      username=""
      password=""
      while [ "$#" -gt 0 ]; do
        case "$1" in
          --username) username="${2:-}"; shift 2 ;;
          --password) password="${2:-}"; shift 2 ;;
          *) echo "Argomento non riconosciuto: $1"; usage; exit 1 ;;
        esac
      done
      [ -n "$username" ] || { echo "Manca --username"; exit 1; }
      [ -n "$password" ] || { echo "Manca --password"; exit 1; }
      update_user_password "$username" "$password"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
