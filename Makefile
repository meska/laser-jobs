version:
	@yarn version --patch
	git push origin main

start:
	@docker run -p 5984:5984 --name laserjobs-db --restart=always -v laserjobs-data:/opt/couchdb/data -e COUCHDB_USER=couchdb -e COUCHDB_PASSWORD=couchdb -d couchdb:latest ; \
	docker run -p 8123:80 --name laserjobs-frontend --restart=always -d meska/laserjobs:latest

