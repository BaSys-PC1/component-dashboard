/*######################
        API Requests
######################*/

let resources,
    viewModel,
    instances,
    graph,
    devices,
    services,
    management,
    oldStyle,
    currentCell, sub,
    baseURL = "http://10.2.10.3:8080";

//initially get data from all services
$.when(
    $.getJSON("/data/device_components.json"), //baseURL + "/services/registry/DEVICE_COMPONENT"
    $.getJSON("/data/management_components.json"), //baseURL + "/services/registry/MANAGEMENT_COMPONENT"
    $.getJSON("/data/service_components.json"), //baseURL + "/services/registry/SERVICE_COMPONENT"
    $.getJSON("/data/topology.json"), //baseURL + "/services/topology/parent/{id}"
    $.getJSON("/data/resource_instances.json"), //baseURL + "/services/resourceinstance/{id}"
    $.getJSON("/data/resource_types.json"), //baseURL + "/services/resourcetype/{id}"
    $.getJSON("/data/translation.json")
    )
    .done(function(dev, man, serv, top, inst, typ, trans) {
        //TODO: merge data from all services

        devices = dev[0].map((val, index, arr) => {

            //get instance of device
            let instance = inst[0].resourceInstances.filter(val2 => val2.id === val.componentId);
            //get capability
            let capability = "";
            if (typeof instance[0].capabilityApplications[0].capabilityVariants[0].capability !== 'undefined') {
                capability = instance[0].capabilityApplications[0].capabilityVariants[0].capability.eClass;
                capability = capability.substr(48); //remove http://www.dfki.de/iui/basys/model/capability#//
            }
            else {
                capability = "Not Found";
            }

            //get type of instance
            let typeId = instance[0].resourceType.$ref.substr(19);
            let type = "";
            //loop over manufactures
            for (let i = 0; i < typ[0].catalogues.length; i++){
                //loop over resourceTypes
                type = typ[0].catalogues[i].resourceTypes.filter(val2 => val2.id === typeId);
                if (type.length > 0) break; //resource found! Stop searching and overriding type

            }

            //get topology of instance
            let topId = "";
            if(typeof instance[0].role !== 'undefined'){
                topId = instance[0].role.$ref.substr(15);
            }
            //TODO: get topology name over /services/topology/parent/{topId} later to save 3 nested loops

            //object building
            return {
                "componentId": val.componentId,
                "type": type[0].name, //from resource_types
                "componentName": val.componentName,
                "location": "S1", //from topology
                "serial": instance[0].serialNumber, //from resource_instances
                "capability": capability, //from resource_instances
                "currentMode": val.currentMode,
                "currentState": val.currentState,
                "docuLink": type[0].documentation //from resource_types
            };
        });

        services = serv[0].map((val, index, arr) => {
            // return element to new Array
            return {
                "componentId": val.componentId,
                "type": "Service",
                "componentName": val.componentName,
                "location": val.hostName
            };
        });

        management = man[0].map((val, index, arr) => {
            // return element to new Array
            return {
                "componentId": val.componentId,
                "type": "Management",
                "componentName": val.componentName,
                "location": val.hostName
            };
        });

        resources = trans[0];

        console.log("devices ", devices);

        //all data needs to be loaded first before executing main()
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

    self.devices = ko.mapping.fromJS(devices);
    self.services = ko.mapping.fromJS(services);

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

    let msg = JSON.parse(message.payloadString);
    console.log(msg.componentId);

    let devices = ko.mapping.toJS(viewModel.devices()); //convert mapped object back to a regular JS object

    //override values
    let updatedDevices = devices.map((val, index, arr) => {

        if (val.componentId === msg.componentId){  //update currentMode and currentState
            return {
                "componentId": val.componentId,
                "type": val.type,
                "componentName": val.componentName,
                "location": val.location,
                "serial": val.serial,
                "capability": val.capability,
                "currentMode": msg.currentMode, //update
                "currentState": msg.currentState, //update
                "docuLink": val.docuLink
            }
        }
        else { //don't change properties
            return val;
        }
    });

    //update viewModel
    ko.mapping.fromJS(updatedDevices, viewModel.devices);

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
                    graph.setTooltips(true);
                    graph.setEnabled(false);
                    //graph.htmlLabels = true;

                    // Changes the default style for edges "in-place"
                    var style = graph.getStylesheet().getDefaultEdgeStyle();
                    //style[mxConstants.STYLE_EDGE] = mxEdgeStyle.ElbowConnector;

                    style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
                    //style[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = "#fff";

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
        return ko.toJSON(viewModel.devices()[index]);
    }).subscribe(function() {
        let unmapped = ko.mapping.toJS(viewModel.devices);
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


/*#####################
        Pagination
#####################*/


$( "#devices-link" ).click(function() {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").show();
    $("#managementContainer").hide();
    $("#serviceContainer").hide();
});

$( "#management-link" ).click(function() {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").show();
    $("#serviceContainer").hide();
});

$( "#service-link" ).click(function() {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").hide();
    $("#serviceContainer").show();
});

/*################
        Main
################*/

function main() {

    $("#deviceContainer").show();
    $("#managementContainer").hide();
    $("#serviceContainer").hide();

    i18nextko.init(resources, 'en', ko);

    viewModel = new AppViewModel();
    ko.applyBindings(viewModel);

    initMQTT();

    graph = initGraph();

}