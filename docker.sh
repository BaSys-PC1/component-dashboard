#!/bin/bash
docker stop component_dashboard
docker rm component_dashboard
docker build -t jomo02/component-dashboard .
docker run \
	-p 80:8080 \
	-e BASYS_REST_URL='http://10.2.10.3:8080' \
	-e MQTT_BROKER_IP='10.2.10.4' \
	-e MQTT_BROKER_PORT='9001' \
	-e CAMUNDA_REST_URL='http://10.2.10.4:8080' \
	--restart unless-stopped \
	--name component_dashboard \
	-d \
	jomo02/component-dashboard

