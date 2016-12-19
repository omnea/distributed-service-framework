const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const SF = require('../lib/app');

var config = require('./rejectMessageConfig.json');

SF.start(config)
.then(service => {
    service.on('test', 'hi', function (packet, emitter) {
        return Promise.reject(new Error('Message rejected by test'));
    });
})
.catch(error);
