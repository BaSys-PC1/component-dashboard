/*######################
        API Requests
######################*/

let resources,
    viewModel,
    instances,
    graph,
    oldStyle,
    currentCell, sub, openedIndex,
    mockData = false,
    APIbaseURL = "http://10.2.0.68:8080",
    BrokerURL = "10.2.10.3",
    BrokerPort = 9001,
    camundaURL = "http://10.2.0.28:8081", //change to 10.2.10.7
    processes = [
        {
            name: "CeBIT 2018 mit Teaching",
            url: camundaURL + "/rest/engine/default/process-definition/key/process_cebit_2018/start",
            type: "POST",
            data: {
                "variables": {
                    "taughtIn": {
                        "value": "true",
                        "type": "String"
                    }
                },
                "businessKey": "cebit2018"
            },
            contentType: "application/json"
        },
        {
            name: "CeBIT 2018 ohne Teaching",
            url: camundaURL + "/rest/engine/default/process-definition/key/process_cebit_2018/start",
            type: "POST",
            data: {
                "variables": {
                    "taughtIn": {
                        "value": "false",
                        "type": "String"
                    }
                },
                "businessKey": "cebit2018"
            },
            contentType: "application/json"
        },
        {
            name: "Teach-In",
            url: camundaURL + "/rest/engine/default/process-definition/key/process_cebit_teachin_main/start",
            type: "POST",
            data: {
                "businessKey": "teachin2018"
            },
            contentType: "application/json"
        }];


//initially get data from all services
function loadInitialData(mockData, callback) {
    let dev_url = (mockData) ? "/data/device_components.json" : viewModel.restConfig.hostname() + "/services/registry/DEVICE_COMPONENT",
        man_url = (mockData) ? "/data/management_components.json" : viewModel.restConfig.hostname() + "/services/registry/MANAGEMENT_COMPONENT",
        serv_url = (mockData) ? "/data/service_components.json" : viewModel.restConfig.hostname() + "/services/registry/SERVICE_COMPONENT",
        inst_url = (mockData) ? "/data/resource_instances.json" : viewModel.restConfig.hostname() + "/services/resourceinstance/",
        typ_url = (mockData) ? "/data/resource_types.json" : viewModel.restConfig.hostname() + "/services/resourcetype/";

    let devCount = 0,
        devices = [],
        services = [],
        management = [];

    $.when(
        $.getJSON(dev_url),
        $.getJSON(man_url),
        $.getJSON(serv_url),
        $.getJSON(inst_url),
        $.getJSON(typ_url)
    )
        .done(function (dev, man, serv, inst, typ) {

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
                let capability = [];
                let capabilityAssertionId = instance[0].capabilityApplications[0].capabilityAssertion.$ref.substr(instance[0].capabilityApplications[0].capabilityAssertion.$ref.lastIndexOf('/') + 1);
                console.log("hier" + capabilityAssertionId);

                //TODO: maybe wait for async result
                $.getJSON(APIbaseURL + "/services/entity/" + capabilityAssertionId)
                    .done(function (ent) {
                        capability.push({
                            'name': ent.name,
                            'taught': false
                        });
                        console.log("hier auch" + ent.name);
                    });


                for (let i = 0; i < instance[0].capabilityApplications[0].capabilityVariants.length; i++) {
                    capability.push({
                        'name': instance[0].capabilityApplications[0].capabilityVariants[i].name,
                        'taught': true
                    });
                }
                obj.capability = capability;

                //get type of instance
                let typeId = instance[0].resourceType.$ref.substr(instance[0].resourceType.$ref.lastIndexOf('/') + 1);
                //console.log(instance[0].resourceType.$ref);
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
                        $.getJSON(APIbaseURL + "/services/topology/parent/" + topId) //+ "?callback=?" treat request as JSONP to avoid cross-domain call issues
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

            checkCallback();

            //all data needs to be loaded first before executing main()
            function checkCallback() {
                //console.log(devCount, devs.length);
                // console.log(services.length , serv[0].length);
                // console.log(management.length, man[0].length);
                if (devCount === devs.length &&
                    services.length === serv[0].length &&
                    management.length === man[0].length
                ) {
                    //update new requested files
                    ko.mapping.fromJS(devices, viewModel.devices);
                    ko.mapping.fromJS(services, viewModel.services);
                    ko.mapping.fromJS(management, viewModel.management);

                    console.log("new devices", viewModel.devices());
                    callback();
                }

            }

        })
        .fail(function () {
            // Executed if at least one request fails
            console.log("Failed to get JSON data");
            $(".alert-danger span").text("Failed to get all JSON data from " + APIbaseURL).show();
            $(".alert-danger").show();
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

    self.devices = ko.mapping.fromJS([]);
    self.management = ko.mapping.fromJS([]);
    self.services = ko.mapping.fromJS([]);

    self.currentCapability = ko.observable([]);
    self.runningPID = ko.observable(0);


    let rnd = Math.floor((Math.random() * 100) + 1);
    self.mqttConfig = {
        hostname: ko.observable(BrokerURL),
        port: ko.observable(BrokerPort),
        clientID: ko.observable("client-" + rnd)
    };

    self.restConfig = {
        mockData: ko.observable(mockData),
        hostname: ko.observable(APIbaseURL)
    };
    self.changeMockData = function () {
        self.restConfig.mockData(!self.restConfig.mockData());
        //self.restConfig.mockData.valueHasMutated();
        self.restConfig.mockData.notifySubscribers(self.restConfig.mockData());

        console.log("set to", self.restConfig.mockData());
        $(".alert").hide();

        loadInitialData(self.restConfig.mockData(), function () {
        });
    };

    //check every 5 seconds if process is still running to activate button again
    let timeout;

    function checkProcessState(id) {
        timeout = setTimeout(function () {
            $.ajax({
                url: camundaURL + "/rest/history/process-instance/" + id,
                success: function (data) {
                    if (data.state === "COMPLETED") {
                        viewModel.runningPID(0);
                    }
                    else {
                        checkProcessState(id);
                    }
                }
            });
        }, 5000);
    }

    self.startProcess = function (process) {
        console.log(process);
        $.ajax({
            url: process.url,
            type: process.type,
            data: JSON.stringify(process.data),
            contentType: process.contentType,
            success: function (data) {
                console.log("started " + data.id);
                viewModel.runningPID(data.id);
                checkProcessState(data.id);
            }
        });
    };
    self.stopProcess = function (process) {
        console.log(process);
        $.ajax({
            url: "http://10.2.0.28:8081/rest/process-instance/" + viewModel.runningPID(),
            type: "DELETE",
            success: function (data) {
                console.log("deleted running process");
                viewModel.runningPID(0);
                clearTimeout(timeout);
            }
        });
    };

    self.changeMQTTdata = function () {
        console.log("changed mqtt settings");
        initMQTT();
    };
    self.changeRESTdata = function () {
        console.log("changed REST settings", self.restConfig.hostname());
        loadInitialData(self.restConfig.mockData(), function () {
            ko.mapping.fromJS(devices, viewModel.devices);
            console.log("new devices", self.devices());
        });
    };

    self.processes = processes;


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

$('.mode-group label').click( function() {
    let unmapped = ko.mapping.toJS(viewModel.devices);
    console.log($(this).data("mode") + "clicked");
    let msg = '{"eClass" : "http://www.dfki.de/iui/basys/model/component#//ChangeModeRequest","componentId" :"' + unmapped[openedIndex].componentId + '","mode" : "' + $(this).data("mode") + '"}';
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

    //set toggle button
    $(".mode-group > label.active").removeClass("active");
    $(".mode-group > label").addClass("disabled");

    $("#l_"+viewModel.devices()[openedIndex].currentMode()).addClass('active').removeClass('disabled');

    if(state === "STOPPED"){
        $(".mode-group > label.disabled").removeClass("disabled");
    }

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

$('#capabilityOverview').on('show.bs.modal', function (event) {

    let button = $(event.relatedTarget); // Button that triggered the modal
    // Extract info from data-* attributes
    let openedIndex = button.data('index');

    let unmapped = ko.mapping.toJS(viewModel.devices()[openedIndex].capability);

    viewModel.currentCapability(unmapped);

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
    $("#processesContainer").hide();
});

$("#management-link").click(function () {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").show();
    $("#serviceContainer").hide();
    $("#processesContainer").hide();

});

$("#service-link").click(function () {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").hide();
    $("#serviceContainer").show();
    $("#processesContainer").hide();

});

$("#processes-link").click(function () {
    $('#pagination li').removeClass('active');
    $(this).parent().addClass("active");

    $("#deviceContainer").hide();
    $("#managementContainer").hide();
    $("#serviceContainer").hide();
    $("#processesContainer").show();

});

$('.alert .close').click(function () {
    $(this).parent().hide();
});



/*################
        Main
################*/

function main() {

    $.getJSON("/data/translation.json").done(function (trans) {
        resources = trans;

        i18nextko.init(resources, 'en', ko);

        viewModel = new AppViewModel();
        ko.applyBindings(viewModel);

        $("#deviceContainer").show();

        initMQTT();

        graph = initGraph();

        loadInitialData(mockData, function () {
        });
    });

}

main();
