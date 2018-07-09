#!/bin/bash
docker stop rs_webapp
docker rm rs_webapp
docker build -t jomo02/robot-status-webapp .
docker run \
	-p 80:8080 \
	--restart unless-stopped \
	--name rs_webapp \
	-d \
	jomo02/robot-status-webapp

