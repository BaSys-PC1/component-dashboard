/*######################
        API Requests
######################*/

let resources,
    viewModel,
    instances,
    graph,
    robots,
    oldStyle,
    currentCell, sub;

//initially get data from all services
$.when(
    $.getJSON("/data/service_register.json"),
    $.getJSON("/data/service_instances.json"),
    $.getJSON("/data/service_types.json"),
    $.getJSON("/data/service_topology.json")
    )
    .done(function(reg, inst, typ, top) {
        //TODO: merge data from all services

        robots = reg[0];
    })
    .fail(function() {
        // Executed if at least one request fails
        console.error("Failed to get JSON data");
    });


//translation and mockup data
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

    self.instances = ko.mapping.fromJS(instances);

    self.mqttConfig = {
        hostname: ko.observable("broker.mqttdashboard.com"),
        port: ko.observable(8000),
        clientID: ko.observable("client-Z3M4")
    };

    ko.computed(function() {
        return ko.toJSON(self.mqttConfig);
    }).subscribe(function() {
        // called whenever any of the properties of mqttConfig changes
        console.log("changed mqtt settings");
        initMQTT();
    });


}



/*################
        MQTT
################*/

function initMQTT(){

    // Create a client instance
    client = new Paho.MQTT.Client(viewModel.mqttConfig.hostname(), Number(viewModel.mqttConfig.port()), viewModel.mqttConfig.clientID());

    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({onSuccess:onConnect});
}


// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("hybrit/robots");
    //message = new Paho.MQTT.Message(viewModel.mqttConfig.clientID() + " connected");
    //message.destinationName = "hybrit/robots";
    //client.send(message);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    ko.mapping.fromJSON(message.payloadString, viewModel.instances);
    console.log("updated instances");
}


/*################
        MxGraph
################*/

function initGraph(){
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

        //zoom out to fit the modal size (leads to display errors on tablet)
        graph.zoomFactor = 1.15;
        graph.zoomOut();

        return graph;

    }
}

function markCurrentState(state){

    let vertices = graph.getChildCells(graph.getDefaultParent(), true, false);

    for (let i = 0; i < vertices.length; i++){
        if (vertices[i].value === state) {
            currentCell = vertices[i];
        }
    }

    //change style of active state
    if (currentCell !== null){

        let oldColor = graph.getCellStyle(currentCell)[mxConstants.STYLE_STROKECOLOR];

        graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, "#F00", [currentCell]);

        return oldColor;
    }
    else{
        console.error("Current state '" + state + "' not found.");
        return null;
    }

}

$('#finiteAutomaton').on('show.bs.modal', function (event) {

    let button = $(event.relatedTarget); // Button that triggered the modal
    // Extract info from data-* attributes
    let state = button.data('state'),
        index = button.data('index');

    oldStyle = markCurrentState(state);

    //detect changes on currently opened instance for further UI updates
    sub = ko.computed(function() {
        return ko.toJSON(viewModel.instances()[index]);
    }).subscribe(function() {
        let unmapped = ko.mapping.toJS(viewModel.instances);
        console.log("changed to ", unmapped[index].currentState);
        graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, oldStyle, [currentCell]);
        oldStyle = markCurrentState(unmapped[index].currentState);
    });

}).on('hidden.bs.modal', function (event) {

    //remove subscription
    sub.dispose();
    //reset stroke color when closing the modal
    graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, oldStyle, [currentCell]);

});

/*################
        Main
################*/

function main() {

    i18nextko.init(resources, 'en', ko);

    viewModel = new AppViewModel();
    ko.applyBindings(viewModel);

    initMQTT();

    graph = initGraph();

}