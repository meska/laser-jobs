#@docker build . -t dr.meskatech.com/work-frontend:latest --build-arg ARCH=amd64; \
#docker push dr.meskatech.com/work-frontend:latest; \
#@docker buildx build --push --platform linux/amd64,linux/arm64 -t dr.meskatech.com/work-frontend:latest . ;\

deploy-frontend:
	@docker buildx build --push --platform linux/amd64 -t dr.meskatech.com/work-frontend:latest . ;\
    ssh rancher@rancher -C "docker pull dr.meskatech.com/work-frontend:latest";\
    ssh root@192.168.3.81 -C "docker pull dr.meskatech.com/work-frontend:latest";\
    ssh root@192.168.3.82 -C "docker pull dr.meskatech.com/work-frontend:latest";\
    ssh root@192.168.3.83 -C "docker pull dr.meskatech.com/work-frontend:latest";\
    ssh root@192.168.3.84 -C "docker pull dr.meskatech.com/work-frontend:latest";\
    curl -X POST https://portainer.mecomsrl.com/api/webhooks/19543c8b-cc4a-4b3c-ba77-247ec22c9bea ;


version:
	@yarn version --patch
	git push origin master


sentry-release-new:
	@yarn sentry-cli releases new $(cat package.json | jq -r .version); \
	yarn sentry-cli releases set-commits $(cat package.json | jq -r .version) --auto; \
	yarn sentry-cli releases set-commits $(cat package.json | jq -r .version) --auto