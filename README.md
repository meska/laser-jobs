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
docker run -p 5984:5984 --name laserjobs-db --restart=always -v laserjobs-data:/opt/couchdb/data -e COUCHDB_USER=couchdb -e COUCHDB_PASSWORD=couchdb -d couchdb:latest 
docker run -p 8123:80 --name laserjobs-frontend --restart=always -d meska/laserjobs:latest 

Login on http://localhost:5984/_utils/#login
and enable CORS