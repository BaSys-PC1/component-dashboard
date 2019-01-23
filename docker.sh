#!/bin/bash
docker stop rs_webapp
docker rm rs_webapp
docker build -t jomo02/robot-status-webapp .
docker run \
	-p 80:8080 \
	-e BASYS_REST_URL='http://10.2.10.3:8080' \
	-e MQTT_BROKER_IP='10.2.10.4' \
	-e MQTT_BROKER_PORT='9001' \
	-e CAMUNDA_REST_URL='http://10.2.10.4:8080' \
	--restart unless-stopped \
	--name rs_webapp \
	-d \
	jomo02/robot-status-webapp

