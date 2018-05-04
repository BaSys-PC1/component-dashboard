//https://github.com/marcosdiez/i18next-ko
var resources = {
    'en': {
        'translation': {
            'type_k': 'Type',
            'name_k': 'Name',
            'location_k': 'Location',
            'serial_k': 'Serial',
            'role_k': 'Role',
            'set_language': 'Language'
        }
    },
    'de': {
        'translation': {
            'type_k': 'Typ',
            'name_k': 'Name',
            'location_k': 'Ort',
            'serial_k': 'Seriennummer',
            'role_k': 'Rolle',
            'set_language': 'Sprache'
        }
    }
};

var instances = [{
        type: 'MiR',
        name: 'R195',
        location: 'Station 1',
        serial: '9H873834',
        role: 'Transport',
    },
    {
        type: 'UR10',
        name: 'U323',
        location: 'Station 2',
        serial: '5H84334',
        role: 'Greifen'
    },
    {
        type: 'Franka',
        name: 'F165',
        location: 'Station 3',
        serial: 'K73F892',
        role: 'Greifen'
    },
    {
        type: 'Kuka',
        name: 'K565',
        location: 'Station 3',
        serial: '78G7876',
        role: 'Greifen'
    },
    {
        type: 'Yumi',
        name: 'Y565',
        location: 'Station 4',
        serial: '65J987',
        role: 'Greifen'
    }];

i18nextko.init(resources, 'en', ko);

function AppViewModel() {
    var self = this;
    self.language = ko.observable('en');
    self.language.subscribe(function (value) {
        i18nextko.setLanguage(value);
    });

    self.instances = instances;

    self.mqttConfig = {
        hostname: ko.observable("broker.mqttdashboard.com"),
        port: ko.observable(8000),
        clientID: ko.observable("client-Z3M4")
    };

}
var viewModel = new AppViewModel();
ko.applyBindings(viewModel);


//MQTT

// Create a client instance
client = new Paho.MQTT.Client(viewModel.mqttConfig.hostname(), Number(viewModel.mqttConfig.port()), viewModel.mqttConfig.clientID());

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// connect the client
client.connect({onSuccess:onConnect});


// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("World");
    message = new Paho.MQTT.Message("Hello");
    message.destinationName = "World";
    client.send(message);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    console.log("onMessageArrived:"+message.payloadString);
}

//mxgraph

// Program starts here. Creates a sample graph in the
// DOM node with the specified ID. This function is invoked
// from the onLoad event handler of the document (see below).
function main(container)
{
    if (mxClient.isBrowserSupported())
    {
        var divs = document.getElementsByTagName('*');

        for (var i = 0; i < divs.length; i++)
        {
            if (divs[i].className.toString().indexOf('mxgraph') >= 0)
            {
                (function(container)
                {
                    var xml = mxUtils.getTextContent(container);
                    var xmlDocument = mxUtils.parseXml(xml);

                    if (xmlDocument.documentElement != null && xmlDocument.documentElement.nodeName == 'mxGraphModel')
                    {
                        var decoder = new mxCodec(xmlDocument);
                        var node = xmlDocument.documentElement;

                        container.innerHTML = '';

                        var graph = new mxGraph(container);
                        graph.setTooltips(false);
                        graph.setEnabled(false);

                        // Changes the default style for edges "in-place"
                        var style = graph.getStylesheet().getDefaultEdgeStyle();
                        style[mxConstants.STYLE_EDGE] = mxEdgeStyle.ElbowConnector;

                        decoder.decode(node, graph.getModel());
                        graph.resizeContainer = true;

                    }
                })(divs[i]);
            }
        }
    }
};

main();