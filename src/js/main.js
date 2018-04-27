//https://github.com/marcosdiez/i18next-ko
var resources = {
    'en': {
        'translation': {
            'type_k': 'Type',
            'name_k': 'Name',
            'location_k': 'Location',
            'serial_k': 'Serial',
            'role_k': 'Role',
        }
    },
    'de': {
        'translation': {
            'type_k': 'Typ',
            'name_k': 'Name',
            'location_k': 'Ort',
            'serial_k': 'Seriennummer',
            'role_k': 'Rolle',
        }
    }
};

var instances = [{
        type: 'MiR',
        name: 'R195',
        location: 'Station 1',
        serial: '9H8734834',
        role: 'Transport'
    },
    {
        type: 'UR10',
        name: 'U323',
        location: 'Station 2',
        serial: '5H843834',
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

}

ko.applyBindings(new AppViewModel());