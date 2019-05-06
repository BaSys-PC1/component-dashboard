Install all dependencies
```bash
npm install
```

Install the CLI
```bash
npm install -g grunt-cli
```

# Development
Run Grunt tasks:
```bash
grunt run
```
Go to http://localhost:9001

# Production
Build www folder:
```bash
grunt release
```

# Generate Licenses

Generate all build dependency licenses:
```bash
grunt license
```

Generate all production dependency licenses:
```bash
bower-license -e json
```

# Docker
Set the needed BaSys/MQTT/Camunda Urls in docker.sh file:
```bash
-e BASYS_REST_URL='http://10.2.10.3:8080' \
-e MQTT_BROKER_IP='10.2.10.4' \
-e MQTT_BROKER_PORT='9001' \
-e CAMUNDA_REST_URL='http://10.2.10.4:8080' \
```

Run docker script:
```bash
./docker.sh
```
