//https://github.com/marcosdiez/i18next-ko
var resources = {
    'en': {
        'translation': {
            'type_k': 'Type',
            'type_v': 'Rolling',
            'name_k': 'Name',
            'location_k' : 'Location',
            'serial_k': 'Serial',
            'role_k': 'Role',
            'role_v': 'Transport'
        }
    },
    'de': {
        'translation': {
            'type_k': 'Typ',
            'type_v': 'Rollend',
            'name_k': 'Name',
            'location_k' : 'Ort',
            'serial_k': 'Seriennummer',
            'role_k': 'Rolle',
            'role_v': 'Transport'
        }
    }
};

i18nextko.init(resources, 'en', ko);

function AppViewModel () {
    var self = this;
    self.language = ko.observable('en');
    self.language.subscribe(function (value) {
        i18nextko.setLanguage(value);
    });

    self.name_v = ko.observable('MiR 100');
    self.location_v = 'Station 1';
    self.serial_v = '9H84B63492';
}

ko.applyBindings(new AppViewModel());