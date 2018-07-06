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

# Docker
Build docker image:
```bash
docker build -t jomo02/robot-status-webapp .
```

Run docker image:
```bash
docker run -p 80:8080 -d --name rs_webapp jomo02/robot-status-webapp
```

Stop docker container:
```bash
docker stop rs_webapp
```