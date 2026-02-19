# AGENTS.md

## Contesto progetto
- Nome: `laserjobs`
- Tipo: frontend SPA in `Vue 2` + `Vuetify 2`
- Routing: `vue-router` in history mode (richiede fallback server su `index.html`)
- Persistenza/sync: `PouchDB` locale + sync remoto CouchDB
- Stato: uso prevalente di `commonMixin` (logica condivisa), Pinia presente ma non centrale

## Setup e comandi
- Installazione dipendenze: `yarn install`
- Dev server: `yarn serve`
- Lint: `yarn lint`
- Build produzione: `yarn build`
- Docker build immagine: `make build`
- Avvio stack locale (db + frontend): `make start`
- Sviluppo locale consigliato (OrbStack): `docker compose up -d`
- Stop stack locale compose: `docker compose down`

## Struttura rilevante
- Entrypoint app: `src/main.js`
- Router: `src/router.js`
- Mixin core (db/sync/lista jobs): `src/mixins/commonMixin.js`
- Pagine principali:
  - `src/components/ChooseDb.vue`
  - `src/components/LaserJobs.vue` (vista operativa)
  - `src/components/LaserJobsEdit.vue` (edit/ordinamento/cestino)
- Componenti include:
  - `src/components/include/LjAppBar.vue`
  - `src/components/include/LjSettings.vue`
  - `src/components/include/BtSort.vue`
- Config build/env: `vue.config.js`
- Deploy statico: `Dockerfile`, `nginx/nginx.conf`

## Variabili e configurazione
- `VUE_APP_DB_URL`: URL base CouchDB (assegnata in `Vue.prototype.$dbUrl`)
- `VUE_APP_PACKAGE_VERSION`: iniettata in build da `package.json` via `DefinePlugin`
- Le credenziali server vengono salvate lato client in `localforage` (`dbSettings`)
- In compose dev: `VUE_APP_DB_URL=http://localhost:5984/`

## Modello dati jobs (osservato nel codice)
I documenti job usano tipicamente:
- `codice`
- `descrizione`
- `data_consegna`
- `done`
- `sospeso`
- `deleted`
- `ordinamento`
- `date`
- `color` (con `hexa`)

## Regole operative per agenti
- Mantieni coerenza con stile esistente (Options API + mixin), salvo richiesta esplicita di refactor.
- Non introdurre dipendenze nuove se non necessario.
- Evita modifiche massive non richieste in file legacy.
- Se tocchi routing/history mode, verifica anche fallback Nginx (`try_files ... /index.html`).
- Prima di chiudere una modifica: esegui almeno `yarn lint` e, se impatta runtime/build, anche `yarn build`.
- Conserva testi UI in italiano dove già presenti.
- Non editare `node_modules/`.
- Se sviluppiamo in Python, usa sempre `poetry`.
- Per sviluppo locale usa Docker Compose su OrbStack come default.
- Dopo ogni modifica al codice, riavvia sempre il frontend locale prima di passare alla verifica utente.
- Versioni container da mantenere allineate:
  - `node:24.13.1` (LTS)
  - `couchdb:3.5.1` (stable 3.x)
- Con Node LTS corrente, per questo progetto usare `yarn install --ignore-engines` (dipendenze legacy con vincoli `engines` datati).

## Note tecniche utili
- La sincronizzazione realtime è gestita da `db.changes(...)` in `commonMixin`.
- Drag&drop ordinamento usa `sortablejs` e aggiorna `ordinamento`.
- Alcuni file mescolano pattern moderni/legacy: fare cambi mirati e minimali.
- CORS CouchDB dev e preconfigurato in `docker/couchdb/local.ini` per `http://localhost:8123`.
- Compose principale: `docker-compose.yml` (servizi `app` + `couchdb`).

## Deploy notes
- Server deploy disponibile (da usare quando richiesto): `root@192.168.11.149` alias `root@laserjobs`.
- Deploy remoto non ancora implementato in automazione: prima definire strategia (build/push immagine e run remoto).
