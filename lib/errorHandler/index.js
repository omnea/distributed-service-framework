const logic = require('./logic');
const amqpStart = require('./amqpConfig');

amqpStart(logic.onMessage);

