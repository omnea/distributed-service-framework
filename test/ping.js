const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const di = require('./../lib/di/di').create();


di.get('patterns/service')
    .then(service => service.start())
    .then(service => {
        debug("Service started");

        service.on('ping', 'pong:hi', function (packet, emitter) {
            console.log(packet);
            console.log(emitter);
        });
    })
    .catch(error);
