
var di = require(__dirname + '/../../lib/di/di').create();

describe('Patterns', function() {
	describe('ConfigReader', function() {

		var config;

		beforeEach(function(done) {
			di.get('patterns/configReader').then(instance => config = instance)
			.then(done)
			.catch(err => console.log(err));
		});

		describe('get', function() {
			it('should return the correct configuration', function() {
				expect(config.get('amqp.url')).toEqual(CONFIG.amqp.url);
				expect(config.get('service.name')).toEqual(CONFIG.service.name);
				expect(config.get('service.exchanges.service.options.durable')).toEqual(CONFIG.service.exchanges.service.options.durable);
				expect(config.get('service.queues.delay.options.arguments')).toEqual(CONFIG.service.queues.delay.options.arguments);
				expect(config.get('service.queues.error.bindings.route')).toEqual(CONFIG.service.queues.error.bindings.route);
			});

			it('should return the correct configuration joining several arguments', function() {
				expect(config.get('amqp', 'url')).toEqual(CONFIG.amqp.url);
				expect(config.get('service', 'name')).toEqual(CONFIG.service.name);
				expect(config.get('service', 'exchanges.service.options', 'durable')).toEqual(CONFIG.service.exchanges.service.options.durable);
				expect(config.get('service.queues.delay.options', 'arguments')).toEqual(CONFIG.service.queues.delay.options.arguments);
				expect(config.get('service.queues', 'error.bindings.route')).toEqual(CONFIG.service.queues.error.bindings.route);
			});

			it('should return the processed expression correctly', function() {
				expect(config.get('service.queues.error.bindings')[0].exchange).toBe(EXCHANGE_NAME_FN());
				expect(config.get('service.queues.consume.options.arguments.deadLetterExchange')).toBe(EXCHANGE_NAME_FN());
			});

			it('should return undefined for not existen data', function() {
				expect(config.get('service.hola.not.existe')).toBe(undefined);
				expect(config.get('a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.')).toBe(undefined);
			});

			it('should return undefined for unexpected input', function() {
				expect(config.get('..-35"·$5"%·& \'.\'........')).toBe(undefined);
				expect(config.get(3)).toBe(undefined);
				expect(config.get('')).toBe(undefined);
				expect(config.get('.')).toBe(undefined);
				expect(config.get('..')).toBe(undefined);
				expect(config.get('....')).toBe(undefined);
				expect(config.get(/ [^3]/gi)).toBe(undefined);
				expect(config.get([])).toBe(undefined);
				expect(config.get({})).toBe(undefined);
				expect(config.get(NaN)).toBe(undefined);
				expect(config.get('.', '.', '.', '.', '.')).toBe(undefined);
				expect(config.get('.', '', '.', '', '', '.')).toBe(undefined);
				expect(config.get('service', 3, {adios: 3}, NaN, undefined, 'hola.not.existe')).toBe(undefined);
			});
		});

		describe('existQueue', function() {
			it('should return true if the queue exist', function() {
				expect(config.existQueue('error')).toBe(true);
			});

			it('should return false if the queue exist', function() {
				expect(config.existQueue('superscalifrasticospirialidoso')).toBe(false);
			});
		});

		describe('getServiceName', function() {
			it('should return the service name', function() {
				expect(config.getServiceName()).toBe(CONFIG.service.name);
			});
		});

		describe('getQueueName', function() {
			it('should returnt the queue correct name', function() {
				expect(config.getQueueName('error')).toBe(QUEUE_NAME_FN('error'));
			});

			it('should throw and expection is the queue don\'t exist', function() {
				expect(() => config.getQueueName('HOLA :D')).toThrow();
			});
		});

		describe('getQueueOptions', function() {
			it('should returnt the queue correct options', function() {
				expect(config.getQueueOptions('error')).toEqual(CONFIG.service.queues.error.options);
			});

			it('should throw and expection is the queue don\'t exist', function() {
				expect(() => config.getQueueOptions('HOLA :D')).toThrow();
			});
		});

		describe('getQueueBindings', function() {
			it('should returnt the queue correct bindings', function() {
				expect(config.getQueueBindings('error')).toEqual(GET_ERROR_BINDINGS('error'));
			});

			it('should returnt empty array if the queu has nt bindings', function() {
				expect(config.getQueueBindings('consume')).toEqual([]);
			});

			it('should throw and expection is the queue don\'t exist', function() {
				expect(() => config.getQueueBindings('HOLA :D')).toThrow();
			});
		});

		describe('getExchangeName', function() {
			it('should returnt the queue correct exchange name', function() {
				expect(config.getExchangeName()).toBe(EXCHANGE_NAME_FN());
			});
		});

		describe('getExchangeOptions', function() {
			it('should returnt the queue correct exchange options', function() {
				expect(config.getExchangeOptions()).toEqual(EXCHANGE_OPTIONS_FN());
			});
		});

		describe('getExchangeType', function() {
			it('should returnt the queue correct exchange type', function() {
				expect(config.getExchangeType()).toBe(EXCHANGE_TYPE_FN());
			});
		});

		describe('getCloseTimeout', function() {
			it('should returnt the queue correct timeout', function() {
				expect(config.getCloseTimeout()).toBe(CONFIG.service.closeTimeout);
			});
		});

		describe('getAMQPConfig', function() {
			it('should returnt the correct amqp config', function() {
				expect(config.getAMQPConfig()).toEqual(CONFIG.amqp);
			});
		});

		//methods for getting data
	});
});

var QUEUE_NAME_FN = type => CONFIG.service.name + CONFIG.service.queueSeparator + CONFIG.service.queues[type].name;
var EXCHANGE_NAME_FN = () => CONFIG.service.name;
var EXCHANGE_OPTIONS_FN = () => CONFIG.service.exchanges.service.options;
var EXCHANGE_TYPE_FN = () => CONFIG.service.exchanges.service.type;
var GET_ERROR_BINDINGS = type => [{ exchange: EXCHANGE_NAME_FN(), route: CONFIG.service.queues[type].bindings[0].route }];

var USER_CONFIG = {
	amqp: {
		url: "localhost",
		channelMax: 3,
		heartbeat: 13
	},
	service: {
		name: "HOLA_:D"
	}
};

var CONFIG = {
	"amqp": {
		"url": "88.99.15.151",
		"port": 5672,
		"user": "test",
		"pass": "test",
		"heartbeat": 20,
		"channelMax": 3
	},
	"service": {
		"name": "NO_NAMED_SERVICE",
		"closeTimeout": 60,
		"queueSeparator": ".",
		"exchanges": {
			"service": {
				"type": "topic",
				"options": {
					"durable": true,
					"internal": false,
					"autoDelete": false,
					"alternateExchange": "Error"
				}
			}
		},
		"queues": {
			"consume": {
				"name": "consume",
				"options": {
					"exclusive": false,
					"durable": true,
					"autoDelete": false,
					"arguments": {
						"deadLetterExchange": {"_process_": true, "action": "get-amqp-name", "type": "exchange", "name": "service"},
						"deadLetterRoutingKey": "_error"
					}
				}
			},
			"delay": {
				"name": "receive",
				"options": {
					"exclusive": false,
					"durable": true,
					"autoDelete": false,
					"arguments": {}
				}
			},
			"error": {
				"name": "error",
				"options": {
					"exclusive": false,
					"durable": true,
					"autoDelete": false,
					"arguments": {}
				},
				"bindings": [
					{
						"exchange": {"_process_": true, "action": "get-amqp-name", "type": "exchange", "name": "service"},
						"route": "_error"
					}
				]
			}
		}
	}
};
