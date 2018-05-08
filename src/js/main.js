/*######################
        API Requests
######################*/

let resources,
    viewModel,
    instances,
    graph;

$.getJSON("/data/service_register.json", function(data) {

    //var parsed = JSON.parse(data);
   // console.log(data);

// Update view model properties
    //viewModel.firstName(parsed.firstName);

});

$.getJSON("/data/service_instances.json", function(data) {
  //  console.log(data);
});

$.getJSON("/data/service_types.json", function(data) {
   // console.log(data);
});

$.getJSON("/data/service_topology.json", function(data) {
   // console.log(data);
});

//mockup data
let transReq = $.getJSON("/data/translation.json");
let instReq = $.getJSON("/data/instances.json");

$.when(transReq, instReq)
    .done(function(trans, inst) {
        resources = trans[0];
        instances = inst[0];
        //data needs to be loaded before executing main()
        main();
    })
    .fail(function() {
        // Executed if at least one request fails
        console.error("Failed to get JSON data");
    });


/*#################################################
        Knockout/i18next
        https://github.com/marcosdiez/i18next-ko
#################################################*/


function AppViewModel() {
    let self = this;
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



/*################
        MQTT
################*/

var initMQTT = function(){

    // Create a client instance
    client = new Paho.MQTT.Client(viewModel.mqttConfig.hostname(), Number(viewModel.mqttConfig.port()), viewModel.mqttConfig.clientID());

    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({onSuccess:onConnect});
};


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


/*################
        MxGraph
################*/

var initGraph = function(){
    if (mxClient.isBrowserSupported())
    {
        var divs = document.getElementsByClassName('mxgraph');

        for (var i = 0; i < divs.length; i++)
        {
            (function(container)
            {
                var xml = mxUtils.getTextContent(container);
                var xmlDocument = mxUtils.parseXml(xml);

                if (xmlDocument.documentElement != null && xmlDocument.documentElement.nodeName == 'mxGraphModel')
                {
                    var codec = new mxCodec(xmlDocument);
                    var node = xmlDocument.documentElement;

                    container.innerHTML = '';

                    graph = new mxGraph(container);
                    graph.setTooltips(false);
                    graph.setEnabled(false);

                    // Changes the default style for edges "in-place"
                    //var style = graph.getStylesheet().getDefaultEdgeStyle();
                    //style[mxConstants.STYLE_EDGE] = mxEdgeStyle.ElbowConnector;


                    codec.decode(node, graph.getModel());
                    //graph.resizeContainer = true;

                }
            })(divs[i]);
        }

        //zoom out to fit the modal size
        graph.zoomFactor = 1.15;
        graph.zoomOut();

        return graph;

    }
};

var markCurrentState = function(state){

    var currentCell = null,
        vertices = graph.getChildCells(graph.getDefaultParent(), true, false);

    for (let i = 0; i < vertices.length; i++){
        if (vertices[i].value === state) {
            currentCell = vertices[i];
        }
    }

    //change style of active state
    if (currentCell !== null){
        graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, "#F00", [currentCell]);
    }
    else{
        console.error("Current state '" + state + "' not found.");
    }

};

/*################
        Main
################*/

function main() {

    i18nextko.init(resources, 'en', ko);

    viewModel = new AppViewModel();
    ko.applyBindings(viewModel);

    initMQTT();

    graph = initGraph();
    let state = "EXECUTE";
    markCurrentState(state);
}




