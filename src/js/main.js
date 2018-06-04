/*######################
        API Requests
######################*/

let resources,
    viewModel,
    instances,
    graph,
    devices = [],
    services = [],
    management = [],
    oldStyle,
    currentCell, sub, openedIndex,
    mockData = false,
    APIbaseURL = "http://10.2.0.68:8080",
    BrokerURL = "broker.mqttdashboard.com",
    BrokerPort = 8000;


//initially get data from all services
function loadInitialData(mockData, callback) {
    let dev_url = (mockData) ? "/data/device_components.json" : APIbaseURL + "/services/registry/DEVICE_COMPONENT",
        man_url = (mockData) ? "/data/management_components.json" : APIbaseURL + "/services/registry/MANAGEMENT_COMPONENT",
        serv_url = (mockData) ? "/data/service_components.json" : APIbaseURL + "/services/registry/SERVICE_COMPONENT",
        inst_url = (mockData) ? "/data/resource_instances.json" : APIbaseURL + "/services/resourceinstance/",
        typ_url = (mockData) ? "/data/resource_types.json" : APIbaseURL + "/services/resourcetype/",
        trans_url = "/data/translation.json";

    $.when(
        $.getJSON(dev_url),
        $.getJSON(man_url),
        $.getJSON(serv_url),
        $.getJSON(inst_url),
        $.getJSON(typ_url),
        $.getJSON(trans_url)
    )
        .done(function (dev, man, serv, inst, typ, trans) {

            //devices
            let devCount = 0;

            function addDevice(obj) {
                devices.push(obj);
                devCount++;
                checkCallback();
            }

            let devs = dev[0];
            for (let i = 0; i < devs.length; i++) {
                let obj = {};
                obj.componentId = devs[i].componentId;
                obj.componentName = devs[i].componentName;
                obj.currentMode = devs[i].currentMode;
                obj.currentState = devs[i].currentState;

                //get instance of device
                let instance = inst[0].resourceInstances.filter(val2 => val2.id === devs[i].componentId);
                obj.serial = instance[0].serialNumber;

                //get capability
                let capability = "";

                console.log(instance[0].capabilityApplications[0]);

                for (let i = 0; i < instance[0].capabilityApplications[0].capabilityVariants.length; i++) {
                    if (i > 0)
                        capability += ", ";

                    capability += instance[0].capabilityApplications[0].capabilityVariants[i].name;

                }
                obj.capability = capability;

                //get type of instance
                let typeId = instance[0].resourceType.$ref.substr(instance[0].resourceType.$ref.lastIndexOf('/') + 1);

                //loop over manufactures
                let type = "";
                for (let i = 0; i < typ[0].catalogues.length; i++) {
                    //loop over resourceTypes
                    type = typ[0].catalogues[i].resourceTypes.filter(val2 => val2.id === typeId);
                    if (type.length > 0) break; //resource found! Stop searching and overriding type
                }
                obj.type = type[0].name;
                obj.docuLink = type[0].documentation;

                //get topology of instance
                if (typeof instance[0].role !== 'undefined') {
                    let topId = instance[0].role.$ref.substr(instance[0].role.$ref.lastIndexOf('/') + 1);
                    if (!mockData) {
                        $.getJSON(APIbaseURL + "/services/topology/parent/" + topId)
                            .done(function (top) {
                                obj.location = top.name;
                                addDevice(obj);
                            })
                            .fail(function () {
                                obj.location = "Not Found";
                                addDevice(obj);
                            });
                    }
                    else {
                        obj.location = "S1";
                        addDevice(obj);
                    }
                }
                else {
                    obj.location = "Not Found";
                    addDevice(obj);
                }

            }

            //services
            services = serv[0].map((val, index, arr) => {
                // return element to new Array
                return {
                    "componentId": val.componentId,
                    "type": "Service",
                    "componentName": val.componentName,
                    "location": val.hostName
                };
            });

            //management
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


            checkCallback();

            //all data needs to be loaded first before executing main()
            function checkCallback() {
                //console.log(devCount, devs.length);
                // console.log(services.length , serv[0].length);
                // console.log(management.length, man[0].length);
                if (devCount === devs.length &&
                    services.length === serv[0].length &&
                    management.length === man[0].length
                ){
                    console.log("devices ", devices);
                    callback();
                }

            }

        })
        .fail(function () {
            // Executed if at least one request fails
            console.error("Failed to get JSON data");
        });

}


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
        hostname: ko.observable(BrokerURL),
        port: ko.observable(BrokerPort),
        clientID: ko.observable("client-Z3M4")
    };

    self.restConfig = {
        mockData: ko.observable(mockData),
        hostname: ko.observable(APIbaseURL)
    };
    self.changeMockData = function () {
        self.restConfig.mockData(!self.restConfig.mockData());
        loadInitialData(self.restConfig.mockData(), function () {
            console.log("reloaded data", self.restConfig.mockData());
        });
    };

    ko.computed(function () {
        return ko.toJSON(self.mqttConfig);
    }).subscribe(function () {
        // called whenever any of the properties of mqttConfig changes
        console.log("changed mqtt settings");
        initMQTT();
    });


}


/*################
        MQTT
################*/

function initMQTT() {

    // Create a client instance
    client = new Paho.MQTT.Client(viewModel.mqttConfig.hostname(), Number(viewModel.mqttConfig.port()), viewModel.mqttConfig.clientID());

    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({onSuccess: onConnect});
}


// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("hybrit/devices");
    message = new Paho.MQTT.Message(viewModel.mqttConfig.clientID() + " connected");
    message.destinationName = "hybrit/devices/connection";
    client.send(message);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    console.log("arrived", message);
    let msg = JSON.parse(message.payloadString);
    console.log(msg.componentId);

    let devices = ko.mapping.toJS(viewModel.devices()); //convert mapped object back to a regular JS object

    //override values
    let updatedDevices = devices.map((val, index, arr) => {

        if (val.componentId === msg.componentId) {  //update currentMode and currentState
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

$("#stop-btn").click(function () {
    let unmapped = ko.mapping.toJS(viewModel.devices);
    let msg = '{"eClass": "http://www.dfki.de/iui/basys/model/component#//CommandRequest","componentId" : "' + unmapped[openedIndex].componentId + '","controlCommand": "STOP"}';
    message = new Paho.MQTT.Message(msg);
    message.destinationName = "basys/components/command";
    client.send(message);
});

$("#reset-btn").click(function () {
    let unmapped = ko.mapping.toJS(viewModel.devices);
    let msg = '{"eClass": "http://www.dfki.de/iui/basys/model/component#//CommandRequest","componentId" : "' + unmapped[openedIndex].componentId + '","controlCommand": "RESET"}';
    message = new Paho.MQTT.Message(msg);
    message.destinationName = "basys/components/command";
    client.send(message);
});


/*################
        MxGraph
################*/

function initGraph() {
    if (mxClient.isBrowserSupported()) {
        var divs = document.getElementsByClassName('mxgraph');

        for (var i = 0; i < divs.length; i++) {
            (function (container) {
                var xml = mxUtils.getTextContent(container);
                var xmlDocument = mxUtils.parseXml(xml);

                if (xmlDocument.documentElement != null && xmlDocument.documentElement.nodeName == 'mxGraphModel') {
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

function markCurrentState(state) {

    let vertices = graph.getChildCells(graph.getDefaultParent(), true, false);

    for (let i = 0; i < vertices.length; i++) {
        if (vertices[i].value === state) {
            currentCell = vertices[i];
        }
    }

    //change style of active state
    if (currentCell !== null) {

        let oldColor = graph.getCellStyle(currentCell)[mxConstants.STYLE_STROKECOLOR];

        graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, "#F00", [currentCell]);

        return oldColor;
    }
    else {
        console.error("Current state '" + state + "' not found.");
        return null;
    }

}

$('#finiteAutomaton').on('show.bs.modal', function (event) {

    let button = $(event.relatedTarget); // Button that triggered the modal
    // Extract info from data-* attributes
    let state = button.data('state');
    openedIndex = button.data('index');

    oldStyle = markCurrentState(state);

    //detect changes on currently opened instance for further UI updates
    sub = ko.computed(function () {
        return ko.toJSON(viewModel.devices()[openedIndex]);
    }).subscribe(function () {
        let unmapped = ko.mapping.toJS(viewModel.devices);
        console.log("changed to ", unmapped[openedIndex].currentState);
        graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, oldStyle, [currentCell]);
        oldStyle = markCurrentState(unmapped[openedIndex].currentState);
    });

}).on('hidden.bs.modal', function (event) {

    //remove subscription
    sub.dispose();
    //reset stroke color when closing the modal
    graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, oldStyle, [currentCell]);
    //reset index
    openedIndex = null;

});


/*#####################
        Pagination
#####################*/


$("#devices-link").click(function () {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").show();
    $("#managementContainer").hide();
    $("#serviceContainer").hide();
});

$("#management-link").click(function () {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").show();
    $("#serviceContainer").hide();
});

$("#service-link").click(function () {
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
    loadInitialData(mockData, function () {
        $("#deviceContainer").show();
        $("#managementContainer").hide();
        $("#serviceContainer").hide();

        i18nextko.init(resources, 'en', ko);

        viewModel = new AppViewModel();
        ko.applyBindings(viewModel);

        initMQTT();

        graph = initGraph();
    });
}

main();
