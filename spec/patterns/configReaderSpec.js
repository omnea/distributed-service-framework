
var di = require(__dirname + '/../../lib/di/di').create();

describe('Patterns', function() {
	describe('ConfigReader', function() {

		var config;

		beforeEach(function(done) {
			di.injectDependency('config', {create: function () {return Promise.resolve(CONFIG);}});

			di.get('patterns/configReader', CONFIG).then(instance => config = instance)
			.then(done)
			.catch(err => console.log(err));
		});

		describe('get', function() {
			it('should use the production configuration if NODE_ENV is "production"', function(done) {
				var oldEnv = process.env.NODE_ENV;

				process.env.NODE_ENV = 'production';

				var di = require(__dirname + '/../../lib/di/di').create(true);

				di.get('patterns/configReader').then(instance => {
					expect(instance.getEnvironment()).toBe('production');
				})
				.then(done)
				.catch(e => console.log(e));

				process.env.NODE_ENV = oldEnv;
			});

			it('the user config parameter should be optional', function(done) {
				var di = require(__dirname + '/../../lib/di/di').create(true);

				di.injectDependency('config', {create: function () {return Promise.resolve();}});

				di.get('patterns/configReader').then(instance => {
					done();
				});
			});

			it('should throw an error if there is a variable not defined', function(done) {
				var di = require(__dirname + '/../../lib/di/di').create(true);

				di.injectDependency('config', {create: function () {return Promise.resolve({});}});

				di.get('patterns/configReader').then(instance => {
					expect(() => instance.getEnvironment()).toThrow();
					expect(() => instance.getServiceName()).toThrow();
					expect(() => instance.getQueueName()).toThrow();
					expect(() => instance.getQueueOptions()).toThrow();
					expect(() => instance.getQueueBindings()).toThrow();
					expect(() => instance.getGlobalErrorQueueName()).toThrow();
					expect(() => instance.getGlobalErrorExchangeName()).toThrow();
					expect(() => instance.getGlobalErrorQueueOptions()).toThrow();
					expect(() => instance.getExchangeName()).toThrow();
					expect(() => instance.getExchangeOptions()).toThrow();
					expect(() => instance.getExchangeType()).toThrow();
					expect(() => instance.iterateQueues()).toThrow();
					expect(() => instance.iterateExchanges()).toThrow();
					expect(() => instance.getAMQPConfig()).toThrow();
					expect(instance.getCloseTimeout()).toBe(0);
				})
				.then(done);
			});

			it('should return the correct configuration', function() {
				expect(config.get('amqp.url')).toEqual(CONFIG.amqp.url);
				expect(config.get('service.name')).toEqual(CONFIG.service.name);
				expect(config.get('service.exchanges.service.options.durable')).toEqual(CONFIG.service.exchanges.service.options.durable);
				expect(config.get('service.queues.error.options.arguments')).toEqual(CONFIG.service.queues.error.options.arguments);
				expect(config.get('service.queues.delay.bindings.route')).toEqual(CONFIG.service.queues.delay.bindings.route);
			});

			it('should return the correct configuration joining several arguments', function() {
				expect(config.get('amqp', 'url')).toEqual(CONFIG.amqp.url);
				expect(config.get('service', 'name')).toEqual(CONFIG.service.name);
				expect(config.get('service', 'exchanges.service.options', 'durable')).toEqual(CONFIG.service.exchanges.service.options.durable);
				expect(config.get('service.queues.error.options', 'arguments')).toEqual(CONFIG.service.queues.error.options.arguments);
				expect(config.get('service.queues', 'delay.bindings.route')).toEqual(CONFIG.service.queues.delay.bindings.route);
			});

			it('should return the processed expression correctly', function() {
				expect(config.get('service.queues.error.bindings')[0].exchange).toBe(EXCHANGE_NAME_FN());
				expect(config.get('service.queues.consume.options.arguments.x-dead-letter-exchange')).toBe(EXCHANGE_NAME_FN());
			});

			describe('Should cancel the load if there is any incorrect expression', function() {
				
				it('', function(done) {
					var di = require(__dirname + '/../../lib/di/di').create(true);

					di.injectDependency('config', {create: function () {return Promise.resolve({
						"non-existent-action": {"_process_": true, "action": "non-existent-action"},
					});}});

					di.get('patterns/configReader').catch(err => {
						expect(err instanceof Error).toBe(true);
						done();
					})
					.then(done);
				});

				it('', function(done) {
					var di = require(__dirname + '/../../lib/di/di').create(true);

					di.injectDependency('config', {create: function () {return Promise.resolve({
						"no-existent-amqp": {"_process_": true, "action": "get-amqp-name", "type": "no-sense", "name": "delay"}
					});}});

					di.get('patterns/configReader').catch(err => {
						expect(err instanceof Error).toBe(true);
						done();
					})
					.then(done);
				});
			});

			it('should return undefined for not existent data', function() {
				expect(config.get('service.hola.not.exist')).toBe(undefined);
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
				expect(config.get()).toBe(undefined);
				expect(config.get('.', '.', '.', '.', '.')).toBe(undefined);
				expect(config.get('.', '', '.', '', '', '.')).toBe(undefined);
				expect(config.get('.', '', '.', '', undefined, '.')).toBe(undefined);
				expect(config.get('service', 3, {adios: 3}, NaN, undefined, 'hola.not.existe')).toBe(undefined);
			});
		});

		describe('existQueue', function() {
			it('should return true if the queue exist', function() {
				expect(config.existQueue('error')).toBe(true);
			});

			it('should return false if the queue not exist', function() {
				expect(config.existQueue('superscalifrasticospirialidoso')).toBe(false);
			});
		});

		describe('getServiceName', function() {
			it('should return the service name', function() {
				expect(config.getServiceName()).toBe(CONFIG.service.name);
			});
		});

		describe('getQueueName', function() {
			it('should return the queue correct name', function() {
				expect(config.getQueueName('error')).toBe(QUEUE_NAME_FN('error'));
			});

			it('should throw and exception is the queue don\'t exist', function() {
				expect(() => config.getQueueName('HOLA :D')).toThrow();
			});
		});

		describe('getQueueOptions', function() {
			it('should return the queue correct options', function() {
				expect(config.getQueueOptions('error')).toEqual(CONFIG.service.queues.error.options);
			});

			it('should throw and exception is the queue don\'t exist', function() {
				expect(() => config.getQueueOptions('HOLA :D')).toThrow();
			});
		});

		describe('getQueueBindings', function() {
			it('should return the queue correct bindings', function() {
				expect(config.getQueueBindings('error')).toEqual(GET_ERROR_BINDINGS('error'));
			});

			it('should return empty array if the queu has not bindings', function() {
				expect(config.getQueueBindings('consume')).toEqual([]);
			});

			it('should throw and exception is the queue don\'t exist', function() {
				expect(() => config.getQueueBindings('HOLA :D')).toThrow();
			});
		});

		describe('getExchangeName', function() {
			it('should return the queue correct exchange name', function() {
				expect(config.getExchangeName()).toBe(EXCHANGE_NAME_FN());
			});
		});

		describe('getExchangeOptions', function() {
			it('should return the queue correct exchange options', function() {
				expect(config.getExchangeOptions()).toEqual(EXCHANGE_OPTIONS_FN());
			});
		});

		describe('getExchangeType', function() {
			it('should return the queue correct exchange type', function() {
				expect(config.getExchangeType()).toBe(EXCHANGE_TYPE_FN());
			});
		});

		describe('getCloseTimeout', function() {
			it('should return the queue correct timeout', function() {
				expect(config.getCloseTimeout()).toBe(CONFIG.service.closeTimeout);
			});
		});

		describe('getGlobalErrorQueueOptions', function() {
			it('should return the global error queue options', function() {
				expect(config.getGlobalErrorQueueOptions()).toEqual(CONFIG.service.globalErrorQueue.options);
			});
		});

		describe('getAMQPConfig', function() {
			it('should return the correct amqp config', function() {
				expect(config.getAMQPConfig()).toEqual(CONFIG.amqp);
			});
		});

		//methods for getting data
	});
});

var QUEUE_NAME_FN = type => CONFIG.service.name + CONFIG.service.globalSeparator + CONFIG.service.queues[type].name;
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
	"environment": "production",
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
		"globalSeparator": ".",
		"exchanges": {
			"service": {
				"name": "",
				"type": "topic",
				"options": {
					"durable": true,
					"internal": false,
					"autoDelete": false,
					"alternateExchange": "error"
				}
			},
			"delay": {
				"name": "delay",
				"type": "fanout",
				"options": {
					"durable": true,
					"internal": false,
					"autoDelete": false,
					"alternateExchange": "error"
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
						"x-dead-letter-exchange": {"_process_": true, "action": "get-amqp-name", "type": "exchange", "name": "service"},
						"x-dead-letter-routing-key": "_error",
						"x-message-ttl": 10000
					}
				}
			},
			"delay": {
				"name": "receive",
				"options": {
					"exclusive": false,
					"durable": true,
					"autoDelete": false,
					"arguments": {
						"x-dead-letter-exchange": {"_process_": true, "action": "get-amqp-name", "type": "exchange", "name": "service"},
						"x-message-ttl": 5000
					}
				},
				"bindings": [
					{
						"exchange": {"_process_": true, "action": "get-amqp-name", "type": "queue", "name": "delay"},
						"route": "_error"
					}
				]
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
		},
		"globalErrorQueue": {
			"name": "globalError",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {}
			}
		},
		"globalErrorExchange": {
			"name": "global-error"
		}
	},
};
