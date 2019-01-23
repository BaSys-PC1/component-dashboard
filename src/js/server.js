'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();

app.use(express.static('./www'));
app.get('/config', function (req, res) {
	let APIbaseURL = "http://10.2.10.3:8080",
		BrokerURL = "10.2.10.4",
		BrokerPort = 9001,
		CamundaURL = "http://10.2.10.4:8080";
		
	if(process.env.BASYS_REST_URL) { 
		console.log("APIbaseURL = " + process.env.BASYS_REST_URL)
		APIbaseURL = process.env.BASYS_REST_URL;
	}
	if(process.env.MQTT_BROKER_IP) { 
		console.log("BrokerURL = " + process.env.MQTT_BROKER_IP)
		BrokerURL = process.env.MQTT_BROKER_IP;
	}
	if(process.env.MQTT_BROKER_PORT) { 
		console.log("BrokerPort = " + process.env.MQTT_BROKER_PORT)
		BrokerPort = process.env.MQTT_BROKER_PORT;
	}
	if(process.env.CAMUNDA_REST_URL) { 
		console.log("CamundaURL = " + process.env.CAMUNDA_REST_URL)
		CamundaURL = process.env.CAMUNDA_REST_URL;
	}
	var options = {
		"APIbaseURL" : APIbaseURL,
		"BrokerURL" : BrokerURL,
		"BrokerPort" : BrokerPort,
		"CamundaURL" : CamundaURL
	};
	res.send(options);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);