SERVER ?= root@laserjobs
REMOTE_DIR ?= /opt/laserjobs
IMAGE_NAME ?= laserjobs
IMAGE_TAG ?= latest
PLATFORM ?= linux/amd64
ARCHIVE_NAME ?= $(IMAGE_NAME)-$(IMAGE_TAG)-linux-amd64.tar.gz
PROD_COMPOSE_FILE ?= docker-compose-prod.yaml
PROD_NGINX_PROXY_CONF ?= nginx/prod-proxy.conf
PROD_SETUP_SCRIPT ?= setup.sh
COUCHDB_URL ?= http://localhost:5984
COUCHDB_ADMIN_USER ?= couchdb
COUCHDB_ADMIN_PASSWORD ?= 1206b83e8b5f0c1f47e55a3e601c25b8c3a364aa55600159d63aedae49c82e34
USERS_DB ?= laserjobs_users
USERS_DB_MEMBER_ROLE ?= laserjobs_user
AZIENDA_ROLE_PREFIX ?= laserjobs_company
PASSWORD_ITERATIONS ?= 120000

.DEFAULT_GOAL := help

.PHONY: help version start build build-linux-x86 package-linux-x86 upload-prod deploy-prod create-user list-users update-user-password

help: ## Mostra questo help
	@echo "Comandi disponibili:"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-24s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

version: ## Incrementa patch version e pusha main
	@yarn version --patch
	git push origin main

start: ## Avvia db e frontend in container docker
	@docker run -p 5984:5984 --name laserjobs-db --restart=always -v laserjobs-data:/opt/couchdb/data -e COUCHDB_USER=couchdb -e COUCHDB_PASSWORD=1206b83e8b5f0c1f47e55a3e601c25b8c3a364aa55600159d63aedae49c82e34 -d couchdb:latest ; \
	docker run -p 8123:80 --name laserjobs-frontend --restart=always -d dr.meskatech.com/laserjobs:latest

build: ## Build e push immagine production
	@docker buildx build --push --platform linux/amd64 -t dr.meskatech.com/laserjobs:latest .

build-linux-x86: ## Build immagine locale linux/amd64
	@docker buildx build --platform $(PLATFORM) --load -t $(IMAGE_NAME):$(IMAGE_TAG) .

package-linux-x86: build-linux-x86 ## Salva immagine locale in archivio tar.gz
	@docker save $(IMAGE_NAME):$(IMAGE_TAG) | gzip > $(ARCHIVE_NAME)

upload-prod: package-linux-x86 ## Carica archivio e compose sul server
	@ssh $(SERVER) "mkdir -p $(REMOTE_DIR) $(REMOTE_DIR)/nginx"
	@scp $(ARCHIVE_NAME) $(PROD_COMPOSE_FILE) $(SERVER):$(REMOTE_DIR)/
	@scp $(PROD_NGINX_PROXY_CONF) $(SERVER):$(REMOTE_DIR)/nginx/
	@scp $(PROD_SETUP_SCRIPT) $(SERVER):$(REMOTE_DIR)/
	@ssh $(SERVER) "chmod +x $(REMOTE_DIR)/$(PROD_SETUP_SCRIPT)"

deploy-prod: upload-prod ## Deploy stack production sul server remoto
	@ssh $(SERVER) "cd $(REMOTE_DIR) && docker load -i $(ARCHIVE_NAME) && docker compose -f $(PROD_COMPOSE_FILE) up -d --remove-orphans"

create-user: ## Crea utente app + login nativa CouchDB + DB aziendale se assente
	@set -e; \
	USERNAME_INPUT="$(or $(USERNAME),$(USERNAM))"; \
	PASSWORD_INPUT="$(PASSWORD)"; \
	AZIENDA_INPUT="$(AZIENDA)"; \
	LIVELLO_INPUT="$(LIVELLO)"; \
	if [ -z "$$USERNAME_INPUT" ]; then printf "Utente: "; read USERNAME_INPUT; fi; \
	if [ -z "$$PASSWORD_INPUT" ]; then printf "Password: "; read PASSWORD_INPUT; fi; \
	if [ -z "$$AZIENDA_INPUT" ]; then printf "Azienda (db): "; read AZIENDA_INPUT; fi; \
	if [ -z "$$LIVELLO_INPUT" ]; then printf "Livello (editor/viewer): "; read LIVELLO_INPUT; fi; \
	case "$$LIVELLO_INPUT" in editor|viewer) ;; *) echo "LIVELLO non valido: usa editor oppure viewer"; exit 1 ;; esac; \
	for DB_NAME in "$(USERS_DB)" "_users" "$$AZIENDA_INPUT"; do \
		DB_CODE=$$(curl -s -o /dev/null -w "%{http_code}" -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/$$DB_NAME"); \
		if [ "$$DB_CODE" = "404" ]; then \
			curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$$DB_NAME" > /dev/null; \
		fi; \
	done; \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$(USERS_DB)/_security" \
		-H "Content-Type: application/json" \
		-d "{\"admins\":{\"roles\":[\"_admin\"]},\"members\":{\"roles\":[\"_admin\",\"$(USERS_DB_MEMBER_ROLE)\"]}}" > /dev/null; \
	AZIENDA_ROLE="$(AZIENDA_ROLE_PREFIX)_$$AZIENDA_INPUT"; \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$$AZIENDA_INPUT/_security" \
		-H "Content-Type: application/json" \
		-d "{\"admins\":{\"roles\":[\"_admin\"]},\"members\":{\"roles\":[\"_admin\",\"$$AZIENDA_ROLE\"]}}" > /dev/null; \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/$(USERS_DB)/$$USERNAME_INPUT"); \
	if [ "$$STATUS" = "200" ]; then \
		echo "Utente $$USERNAME_INPUT gia esistente"; \
		exit 1; \
	fi; \
	COUCH_USER_ID="org.couchdb.user:$$USERNAME_INPUT"; \
	COUCH_USER_STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/_users/$$COUCH_USER_ID"); \
	if [ "$$COUCH_USER_STATUS" = "200" ]; then \
		echo "Login CouchDB $$USERNAME_INPUT gia esistente"; \
		exit 1; \
	fi; \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/_users/$$COUCH_USER_ID" \
		-H "Content-Type: application/json" \
		-d "{\"_id\":\"$$COUCH_USER_ID\",\"name\":\"$$USERNAME_INPUT\",\"type\":\"user\",\"roles\":[\"$(USERS_DB_MEMBER_ROLE)\",\"$$AZIENDA_ROLE\"],\"password\":\"$$PASSWORD_INPUT\"}" > /dev/null; \
	SALT=$$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"); \
	HASH=$$(node -e "const crypto=require('crypto');const p=process.argv[1];const s=process.argv[2];const i=Number(process.argv[3]);console.log(crypto.pbkdf2Sync(p,s,i,32,'sha256').toString('hex'))" "$$PASSWORD_INPUT" "$$SALT" "$(PASSWORD_ITERATIONS)"); \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$(USERS_DB)/$$USERNAME_INPUT" \
		-H "Content-Type: application/json" \
		-d "{\"_id\":\"$$USERNAME_INPUT\",\"utente\":\"$$USERNAME_INPUT\",\"password_hash\":\"$$HASH\",\"password_salt\":\"$$SALT\",\"password_iterations\":$(PASSWORD_ITERATIONS),\"azienda\":\"$$AZIENDA_INPUT\",\"livello\":\"$$LIVELLO_INPUT\"}" > /dev/null; \
	echo "Creato utente $$USERNAME_INPUT (livello $$LIVELLO_INPUT) su azienda $$AZIENDA_INPUT + login CouchDB"

list-users: ## Elenca utenti (senza dati sensibili)
	@curl -sS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/$(USERS_DB)/_all_docs?include_docs=true" | \
	node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));const rows=(d.rows||[]).map((r)=>({utente:(r.doc&&r.doc.utente)||r.id,azienda:r.doc&&r.doc.azienda,livello:((r.doc&&r.doc.livello)==="editor"?"editor":"viewer")}));console.log(JSON.stringify(rows,null,2));'

update-user-password: ## Aggiorna la password di un utente
	@set -e; \
	USERNAME_INPUT="$(or $(USERNAME),$(USERNAM))"; \
	PASSWORD_INPUT="$(PASSWORD)"; \
	if [ -z "$$USERNAME_INPUT" ]; then printf "Utente: "; read USERNAME_INPUT; fi; \
	if [ -z "$$PASSWORD_INPUT" ]; then printf "Nuova password: "; read PASSWORD_INPUT; fi; \
	USERS_DB_CODE=$$(curl -s -o /dev/null -w "%{http_code}" -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/_users"); \
	if [ "$$USERS_DB_CODE" = "404" ]; then \
		curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/_users" > /dev/null; \
	fi; \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$(USERS_DB)/_security" \
		-H "Content-Type: application/json" \
		-d "{\"admins\":{\"roles\":[\"_admin\"]},\"members\":{\"roles\":[\"_admin\",\"$(USERS_DB_MEMBER_ROLE)\"]}}" > /dev/null; \
	DOC=$$(curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/$(USERS_DB)/$$USERNAME_INPUT"); \
	REV=$$(printf "%s" "$$DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));if(!d._rev){process.exit(1)};process.stdout.write(d._rev)'); \
	UTENTE=$$(printf "%s" "$$DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(d.utente||d._id||"")'); \
	AZIENDA=$$(printf "%s" "$$DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));if(!d.azienda){process.exit(1)};process.stdout.write(d.azienda)'); \
	LIVELLO=$$(printf "%s" "$$DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(d.livello==="editor"?"editor":"viewer")'); \
	AZIENDA_ROLE="$(AZIENDA_ROLE_PREFIX)_$$AZIENDA"; \
	COUCH_USER_ID="org.couchdb.user:$$USERNAME_INPUT"; \
	COUCH_USER_STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/_users/$$COUCH_USER_ID"); \
	if [ "$$COUCH_USER_STATUS" = "404" ]; then \
		curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/_users/$$COUCH_USER_ID" \
			-H "Content-Type: application/json" \
			-d "{\"_id\":\"$$COUCH_USER_ID\",\"name\":\"$$USERNAME_INPUT\",\"type\":\"user\",\"roles\":[\"$(USERS_DB_MEMBER_ROLE)\",\"$$AZIENDA_ROLE\"],\"password\":\"$$PASSWORD_INPUT\"}" > /dev/null; \
	else \
		COUCH_USER_DOC=$$(curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" "$(COUCHDB_URL)/_users/$$COUCH_USER_ID"); \
		COUCH_USER_REV=$$(printf "%s" "$$COUCH_USER_DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));if(!d._rev){process.exit(1)};process.stdout.write(d._rev)'); \
		COUCH_USER_ROLES=$$(printf "%s" "$$COUCH_USER_DOC" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));const set=new Set(Array.isArray(d.roles)?d.roles:[]);set.add(process.argv[1]);set.add(process.argv[2]);process.stdout.write(JSON.stringify(Array.from(set)))' "$(USERS_DB_MEMBER_ROLE)" "$$AZIENDA_ROLE"); \
		curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/_users/$$COUCH_USER_ID" \
			-H "Content-Type: application/json" \
			-d "{\"_id\":\"$$COUCH_USER_ID\",\"_rev\":\"$$COUCH_USER_REV\",\"name\":\"$$USERNAME_INPUT\",\"type\":\"user\",\"roles\":$$COUCH_USER_ROLES,\"password\":\"$$PASSWORD_INPUT\"}" > /dev/null; \
	fi; \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$$AZIENDA/_security" \
		-H "Content-Type: application/json" \
		-d "{\"admins\":{\"roles\":[\"_admin\"]},\"members\":{\"roles\":[\"_admin\",\"$$AZIENDA_ROLE\"]}}" > /dev/null; \
	SALT=$$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"); \
	HASH=$$(node -e "const crypto=require('crypto');const p=process.argv[1];const s=process.argv[2];const i=Number(process.argv[3]);console.log(crypto.pbkdf2Sync(p,s,i,32,'sha256').toString('hex'))" "$$PASSWORD_INPUT" "$$SALT" "$(PASSWORD_ITERATIONS)"); \
	curl -fsS -u "$(COUCHDB_ADMIN_USER):$(COUCHDB_ADMIN_PASSWORD)" -X PUT "$(COUCHDB_URL)/$(USERS_DB)/$$USERNAME_INPUT" \
		-H "Content-Type: application/json" \
		-d "{\"_id\":\"$$USERNAME_INPUT\",\"_rev\":\"$$REV\",\"utente\":\"$$UTENTE\",\"password_hash\":\"$$HASH\",\"password_salt\":\"$$SALT\",\"password_iterations\":$(PASSWORD_ITERATIONS),\"azienda\":\"$$AZIENDA\",\"livello\":\"$$LIVELLO\"}" > /dev/null; \
	echo "Password aggiornata per $$USERNAME_INPUT (app + CouchDB)"
