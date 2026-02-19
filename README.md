# laserjobs

![TeamCity build status](https://teamcity.mecomsrl.com/app/rest/builds/buildType:id:MeskaTech_LaserJobs_Build/statusIcon.svg)

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


### Start
docker run -p 5984:5984 --name laserjobs-db --restart=always -v laserjobs-data:/opt/couchdb/data -e COUCHDB_USER=couchdb -e COUCHDB_PASSWORD=1206b83e8b5f0c1f47e55a3e601c25b8c3a364aa55600159d63aedae49c82e34 -d couchdb:3.5.1
docker run -p 8123:80 --name laserjobs-frontend --restart=always -d meska/laserjobs:latest 

Login on http://localhost:5984/_utils/#login
and enable CORS

## Sviluppo locale con Docker Compose (OrbStack)
Avvia database + frontend in modalita sviluppo:

```bash
docker compose up -d
```

Log del frontend:

```bash
docker compose logs -f app
```

Arresta tutto:

```bash
docker compose down
```

URL locali:
- Frontend: http://localhost:8123
- CouchDB Fauxton: http://localhost:5984/_utils/

Note:
- Credenziali CouchDB di default: `couchdb` / `1206b83e8b5f0c1f47e55a3e601c25b8c3a364aa55600159d63aedae49c82e34`
- CORS e configurato automaticamente via `docker/couchdb/local.ini`
- Compose usa `node:24.13.1` (LTS) e `couchdb:3.5.1`
- Con Node LTS corrente alcune dipendenze legacy dichiarano engine vecchi: in dev il comando usa `yarn install --ignore-engines`
