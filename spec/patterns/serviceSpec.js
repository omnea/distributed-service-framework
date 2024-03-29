var di = require(__dirname + '/../../lib/di/di').create();

var AmqpMock = require('../mocks/amqpMock');

var SERVICE_CONFIG = {
	"name": "NO_NAMED_SERVICE_TEST",
	"queueSeparator": '.',
	"closeTimeout": 1,
	"queues": {
		"consume": {
			"name": "_consume_test",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {
					"x-dead-letter-exchange": false,
					"x-dead-letter-routing-key": false,
					"x-message-ttl": false
				}
			}
		},
		"delay": {
			"name": "_delay_test",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {
					"x-dead-letter-exchange": false,
					"x-dead-letter-routing-key": false,
					"x-message-ttl": false
				}
			}
		},
		"error": {
			"name": "_error_test",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {
					"x-dead-letter-exchange": false,
					"x-dead-letter-routing-key": false,
					"x-message-ttl": false
				}
			}
		}
	}
};

var QUEUE_NAME_RESULT_CONSUME = SERVICE_CONFIG.name + SERVICE_CONFIG.queueSeparator +  SERVICE_CONFIG.queues.consume.name;
var QUEUE_NAME_RESULT_DELAY = SERVICE_CONFIG.name + SERVICE_CONFIG.queueSeparator +  SERVICE_CONFIG.queues.delay.name;
var QUEUE_NAME_RESULT_ERROR = SERVICE_CONFIG.name + SERVICE_CONFIG.queueSeparator +  SERVICE_CONFIG.queues.error.name;

describe('Patterns', function() {
	describe('Service', function() {

		describe('General', function() {
			var service;
			var amqpMock;
			var errorMessages;

			beforeEach(function(done) {
				amqpMock = AmqpMock.mock();

				di.injectDependency('connectors/amqp', amqpMock);

				Promise.all([
					di.get('utils/errorMessages').then(messages => errorMessages = messages),
					di.get('patterns/service', {service: SERVICE_CONFIG}).then(instance => service = instance)
				]).then(done)
				.catch(err => console.log(err));
			});

			it('should connect to amqp when started', function(done) {
				spyOn(amqpMock._methods.connection,'connect').and.callThrough();

				service.start()
				.then(() => {
					expect(amqpMock._methods.connection.connect).toHaveBeenCalled();
					expect(amqpMock._methods.connection.connect.calls.count()).toEqual(1);
					done();
				})
				.catch(err => console.log(err));
			});

			it('should cancel in case of internal error', function(done) {
				var di = require(__dirname + '/../../lib/di/di').create();

				di.injectDependency('connectors/amqp', AmqpMock.mock({channel_error: true, consume_error: true}));
				
				di.get('patterns/service', {service: SERVICE_CONFIG})
				.then(instance => {
					return instance.start()
					.catch(err => done());
				});
			});

			it('should try to create three channels when started', function(done) {
				spyOn(amqpMock._methods.connection,'channel').and.callThrough();

				service.start()
				.then(() => {
					expect(amqpMock._methods.connection.channel).toHaveBeenCalled();
					expect(amqpMock._methods.connection.channel.calls.count()).toEqual(3);
					done();
				})
				.catch(err => console.log(err));
			});

			it('should try to create three queues when started', function(done) {
				spyOn(amqpMock._methods.channel,'queue').and.callThrough();

				service.start()
				.then(() => {
					expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith(QUEUE_NAME_RESULT_CONSUME, SERVICE_CONFIG.queues.consume.options);
					expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith(QUEUE_NAME_RESULT_DELAY, SERVICE_CONFIG.queues.delay.options);
					expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith(QUEUE_NAME_RESULT_ERROR, SERVICE_CONFIG.queues.error.options);
					expect(amqpMock._methods.channel.queue.calls.count()).toEqual(3);
					done();
				})
				.catch(err => console.log(err));
			});

			it('should try to consume when started', function(done) {
				spyOn(amqpMock._methods.channel,'consume').and.callThrough();

				service.start()
				.then(() => {
					expect(amqpMock._methods.channel.consume).toHaveBeenCalled();
					expect(amqpMock._methods.channel.consume.calls.count()).toEqual(2);
					done();
				})
				.catch(err => console.log(err));
			});

			it('should throw and error if the callback do not return a Promise', function(done) {

				service.setErrorHandler((err) => {
					expect(err.message).toBe(errorMessages.callbackNotReturnPromise + ":DDDDD");
					done();
				});

				service.start()
				.then(service => {
					service.on("Service", "route", () => ":DDDDD");
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");
				})
				.catch(err => console.log(err));
			});

			it('should call close on the amqp if the callback do not return a Promise', function(done) {
				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.setErrorHandler((err) => {
					expect(amqpMock._methods.connection.close).toHaveBeenCalled();
					expect(amqpMock._methods.connection.close.calls.count()).toEqual(1);
					done();
				});

				service.start()
				.then(service => {
					service.on("Service", "route", () => ":DDDDD");
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDD");
				})
				.catch(err => console.log(err));
			});

			it('should wait untill all messages are processed when close', function(done) {
				var errorRoute = "route";
				var waitRoute = "route2";

				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.setErrorHandler((err) => {
					expect(amqpMock._methods.connection.close).toHaveBeenCalled();
					expect(amqpMock._methods.connection.close.calls.count()).toEqual(1);
					done();
				});

				service.start()
				.then(service => {
					service.on("Service", waitRoute, () => new Promise((resolve, reject) => {
						setTimeout(resolve, 100);	
					}));

					service.on("Service", errorRoute, () => ":DDDDD");
					
					amqpMock.mockHelpers.publish("Service", waitRoute, "HOLA :DDDDDD");
					amqpMock.mockHelpers.publish("Service", errorRoute, "HOLA :DDDDDD");
				})
				.catch(err => console.log(err));
			});

			it('should close the connection if a message takes more than the close timeout', function(done) {
				var errorRoute = "route";
				var waitRoute = "route2";
				var serviceName = "Service";

				var isTheCallbackExecuted = false;

				var checkNotFinish = function() {
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							resolve();
							isTheCallbackExecuted = true;
						}, 2000);
					});
				};

				spyOn({checkNotFinish},'checkNotFinish').and.callThrough();
				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.setErrorHandler((err) => {
					expect(amqpMock._methods.connection.close).toHaveBeenCalled();
					expect(amqpMock._methods.connection.close.calls.count()).toEqual(1);
					expect(isTheCallbackExecuted).toBe(false);
					done();
				});

				service.start()
				.then(service => {
					service.on(serviceName, waitRoute, checkNotFinish);
					service.on(serviceName, errorRoute, () => "not a promise");
					
					amqpMock.mockHelpers.publish(serviceName, waitRoute, "HOLA :DDDDDD");
					amqpMock.mockHelpers.publish(serviceName, errorRoute, "HOLA :DDDDDD");
				})
				.catch(err => console.log(err));
			});

			it('should emit the messages after the callback finish', function(done) {
				var serviceName = "Service";
				var route = "Route";
				var messageToEmit1 = {route: Math.random() + '', content: Math.random() + ''};
				var messageToEmit2 = {route: Math.random() + '', content: Math.random() + ''};
				var messageToEmit3 = {route: Math.random() + '', content: Math.random() + ''};
				var message = "HOLA :DDDDD";

				var processesContents = [
					new Buffer.from(String(messageToEmit1.content)),
					new Buffer.from(String(messageToEmit2.content)),
					new Buffer.from(String(messageToEmit3.content)),
				];

				spyOn(amqpMock._methods.channel,'emit').and.callThrough();

				service.start()
				.then(service => {
					service.on(serviceName, route, (packet, emitter) => {
						setTimeout(() => { //Set timeout because the emission is done after the function is finish.
							expect(amqpMock._methods.channel.emit).toHaveBeenCalled();
							expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit1.route, processesContents[0]);
							expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit2.route, processesContents[1]);
							expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit3.route, processesContents[2]);
							done();
						}, 0);
						
						emitter.emit(messageToEmit1.route, messageToEmit1.content);
						emitter.emit(messageToEmit2.route, messageToEmit2.content);
						emitter.emit(messageToEmit3.route, messageToEmit3.content);
						return Promise.resolve();
					});
					
					amqpMock.mockHelpers.publish(serviceName, route, message);
				})
				.catch(err => console.log(err));
			});

			it('should ack the messages after the callback finish', function(done) {
				var serviceName = "Service";
				var route = "Route";
				var message = "HOLA :DDDD";

				spyOn(amqpMock._methods.channel,'ack').and.callThrough();

				service.start()
				.then(service => {
					service.on(serviceName, route, (packet, emitter) => {
						setTimeout(() => { //Set timeout because the emission is done after the function is finish.
							expect(amqpMock._methods.channel.ack).toHaveBeenCalled();
							expect(amqpMock._methods.channel.ack).toHaveBeenCalledWith(packet);
							done();
						}, 0);
						
						return Promise.resolve();
					});
					
					amqpMock.mockHelpers.publish(serviceName, route, message);
				})
				.catch(err => console.log(err));
			});

			it('should reject the messages after the callback fail', function(done) {
				var serviceName = "Service";
				var route = "Route";
				var message = "HOLA :DDD";

				spyOn(amqpMock._methods.channel,'reject').and.callThrough();

				service.start()
				.then(service => {
					service.on(serviceName, route, (packet, emitter) => {
						setTimeout(() => { //Set timeout because the emission is done after the function is finish.
							expect(amqpMock._methods.channel.reject).toHaveBeenCalled();
							expect(amqpMock._methods.channel.reject).toHaveBeenCalledWith(packet);
							done();
						}, 0);
						
						return Promise.reject();
					});
					
					amqpMock.mockHelpers.publish(serviceName, route, message);
				})
				.catch(err => console.log(err));
			});

			it('should not close the connection in case of error in handler', function(done) {
				var serviceName = "Service";
				var route = "Route";
				var message = "HOLA :DD";

				spyOn(amqpMock._methods.channel,'close').and.callThrough();
				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.start()
				.then(service => {
					service.on(serviceName, route, (packet, emitter) => {
						setTimeout(() => { //Set timeout because the emission is done after the function is finish.
							expect(amqpMock._methods.channel.close).not.toHaveBeenCalled();
							expect(amqpMock._methods.connection.close).not.toHaveBeenCalled();
							done();
						}, 100); //100 miliseconds for avoiding order problems. With 0 always there is the posibility that any other async event put the close after this check. 100ms should be enough for not beeing before the close.
						
						return Promise.reject();
					});
					
					amqpMock.mockHelpers.publish(serviceName, route, message);
				})
				.catch(err => console.log(err));
			});

			it('should stop consuming messages after the off', function(done) {

				var callback = jasmine.createSpy('callback');

				service.start()
				.then(service => {
					service.on("Service", "route", callback);
					service.off("Service", "route", callback);
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");
				})
				.then(() => {
					setTimeout(() => {
						expect(callback).not.toHaveBeenCalled();
						done();
					}, 100);
				})
				.catch(err => console.log(err));
			});

			it('should stop consuming messages after the off', function(done) {

				var callback = jasmine.createSpy('callback');

				service.start()
				.then(service => {
					service.instanceOn("Service", "route", callback);
					service.instanceOff("Service", "route", callback);
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");
				})
				.then(() => {
					setTimeout(() => {
						expect(callback).not.toHaveBeenCalled();
						done();
					}, 100);
				})
				.catch(err => console.log(err));
			});

			it('should stop and restart with success', function(done) {
				spyOn(amqpMock._methods.channel,'consume').and.callThrough();
				spyOn(amqpMock._methods.channel,'cancel').and.callThrough();
				
				var callback = jasmine.createSpy('callback');

				service.start()
				.then(service => {
					expect(amqpMock._methods.channel.consume).toHaveBeenCalled();
					expect(amqpMock._methods.channel.consume.calls.count()).toEqual(2);

					service.stop()
					.then(() => {
						expect(amqpMock._methods.channel.cancel).toHaveBeenCalled();
						expect(amqpMock._methods.channel.cancel.calls.count()).toEqual(2);
					})
					.then(done);
				})
				.catch(err => console.log(err));
			});

			it('should register the event "close" after the connection', function(done) {
				spyOn(amqpMock._methods.connection,'on').and.callThrough();

				service.start()
				.then(service => {
					expect(amqpMock._methods.connection.on).toHaveBeenCalled();
					done();
				})
				.catch(err => console.log(err));
			});

			it('should call stop after the connection close', function(done) {
				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.start()
				.then(service => {
					amqpMock.mockHelpers.closeConnection({});
					
					setTimeout(() => {
						expect(amqpMock._methods.connection.close).toHaveBeenCalled();
						done();
					});
				})
				.catch(err => console.log(err));
			});

			it('should emit the message when service emit is called', function (done) {
				var serviceName = "Service";
				var route = "Route";
				var messageToEmit = {route: Math.random() + '', content: Math.random() + ''};
				var message = "HOLA :DDDDD";

				var processesContents = [
					new Buffer.from(String(messageToEmit.content))
				];

				spyOn(amqpMock._methods.channel,'emit').and.callThrough();

				service.start()
				.then(service => {

					service.emit(messageToEmit.route, messageToEmit.content)
					.then(() => {
						expect(amqpMock._methods.channel.emit).toHaveBeenCalled();
						expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit.route, processesContents[0]);
						done();
					});

					return Promise.resolve();
				})
				.catch(err => console.log(err));
			});

			it('should stop consuming messages after the once is executed', function(done) {

				var callback = jasmine.createSpy('callback').and.callFake(() => Promise.resolve());

				service.start()
				.then(service => {
					service.once("Service", "route", callback);
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");

					setTimeout(() => {
						expect(callback.calls.count()).toEqual(1);

						amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");

						setTimeout(() => {
							expect(callback.calls.count()).toEqual(1);
							done();
						}, 0);
					}, 0);

				})
				.catch(err => console.log(err));
			});

			it('should stop consuming messages after the instanceOnce is executed', function(done) {

				var callback = jasmine.createSpy('callback').and.callFake(() => Promise.resolve());

				service.start()
				.then(service => {
					service.instanceOnce("Service", "route", callback);
					
					amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");

					setTimeout(() => {
						expect(callback.calls.count()).toEqual(1);

						amqpMock.mockHelpers.publish("Service", "route", "HOLA :DDDDDDD");

						setTimeout(() => {
							expect(callback.calls.count()).toEqual(1);
							done();
						}, 0);
					}, 0);

				})
				.catch(err => console.log(err));
			});
		});

		describe('Middlewares', function() {
			var service;
			var amqpMock;
			var errorMessages;

			beforeEach(function(done) {
				amqpMock = AmqpMock.mock();

				di.injectDependency('connectors/amqp', amqpMock);

				Promise.all([
					di.get('utils/errorMessages').then(messages => errorMessages = messages),
					di.get('patterns/service', SERVICE_CONFIG).then(instance => service = instance)
				]).then(done)
				.catch(err => console.log(err));
			});

			it('should execute the middlewares', function(done) {
				var middleware = jasmine.createSpy('middleware').and.callFake(() => Promise.resolve());

				service.middleware(middleware);

				service.start()
				.then(service => service.on('test', 'test', () => Promise.resolve()))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(middleware).toHaveBeenCalled();
						expect(middleware.calls.count()).toEqual(1);
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('should stop if a middleware reject the returned promise', function(done) {
				var middleware = jasmine.createSpy('middleware').and.callFake(() => Promise.reject());
				var handler = jasmine.createSpy('handler').and.callFake(() => Promise.resolve());

				service.middleware(middleware);

				service.start()
				.then(service => service.on('test', 'test', handler))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(handler).not.toHaveBeenCalled();
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('should stop if a middleware doesn\'t return a promise', function(done) {
				var middleware = jasmine.createSpy('middleware').and.callFake(() => 'Not a promise :D');
				var handler = jasmine.createSpy('handler').and.callFake(() => Promise.resolve());

				service.middleware(middleware);

				service.start()
				.then(service => service.on('test', 'test', handler))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(handler).not.toHaveBeenCalled();
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('should execute the middlewares in order', function(done) {
				var middlewaresResultsOrdered = [];
				var middlewaresResults = [];

				var middlewares = new Array(100).fill(0).map((_, index) => {
					middlewaresResultsOrdered.push(index);
					service.middleware(() => { 
						middlewaresResults.push(index);
						return Promise.resolve();
					});
				});

				service.start()
				.then(service => service.on('test', 'test', () => Promise.resolve()))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(middlewaresResults).toEqual(middlewaresResultsOrdered);
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('shouldn\'t execute the after middlewares in case of error in dev code', function(done) {
				var middleware = jasmine.createSpy('middleware').and.callFake(() => Promise.resolve());
				var handler = jasmine.createSpy('handler').and.callFake(() => Promise.reject());

				service.middleware(middleware, true);

				service.start()
				.then(service => service.on('test', 'test', handler))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(middleware).not.toHaveBeenCalled();
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('shouldn\'t execute the after middlewares in the dev code doesn\'t return a promise', function(done) {
				var middleware = jasmine.createSpy('middleware').and.callFake(() => Promise.resolve());
				var handler = jasmine.createSpy('handler').and.callFake(() => 'Not a promise :D');

				service.middleware(middleware, true);

				service.start()
				.then(service => service.on('test', 'test', handler))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.then(() => {
					setTimeout(() => {
						expect(middleware).not.toHaveBeenCalled();
						done();
					}, 0);
				})
				.catch(err => console.log(err));
			});

			it('should execute the error handler if a middleware doesn\'t return a promise', function(done) {
				var middlewareReturn = 'Not a promise :D';
				var expected_message = errorMessages.callbackNotReturnPromise + middlewareReturn;

				service.middleware(() => middlewareReturn, true);

				service.setErrorHandler((err) => {
					expect(err.message).toBe(expected_message);
					done();
				});

				service.start()
				.then(service => service.on('test', 'test', () => Promise.resolve()))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.catch(err => console.log(err));
			});

			it('should finish the service execution if a middleware doesn\'t return a promise', function(done) {
				var middlewareReturn = 'Not a promise :D';

				spyOn(amqpMock._methods.channel,'close').and.callThrough();
				spyOn(amqpMock._methods.connection,'close').and.callThrough();

				service.middleware(() => middlewareReturn, true);

				service.start()
				.then(service => service.on('test', 'test', () => {
					setTimeout(() => { //Set timeout because the emission is done after the function is finish.
						expect(amqpMock._methods.channel.close).toHaveBeenCalled();
						expect(amqpMock._methods.connection.close).toHaveBeenCalled();
						done();
					}, 0);
				}))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.catch(err => console.log(err));
			});

			it('shouldn\'t emit the messages if a middleware doesn\'t return a promise', function(done) {
				var middlewareReturn = 'Not a promise :D';

				spyOn(amqpMock._methods.channel,'emit').and.callThrough();

				service.middleware(() => middlewareReturn, true);

				service.start()
				.then(service => service.on('test', 'test', () => {
					setTimeout(() => { //Set timeout because the emission is done after the function is finish.
						expect(amqpMock._methods.channel.emit).not.toHaveBeenCalled();
						done();
					}, 0);
				}))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.catch(err => console.log(err));
			});

			it('shouldn\'t ack if a middleware doesn\'t return a promise', function(done) {
				var middlewareReturn = 'Not a promise :D';

				spyOn(amqpMock._methods.channel,'ack').and.callThrough();

				service.middleware(() => middlewareReturn, true);

				service.start()
				.then(service => service.on('test', 'test', () => {
					setTimeout(() => { //Set timeout because the emission is done after the function is finish.
						expect(amqpMock._methods.channel.ack).not.toHaveBeenCalled();
						done();
					}, 0);
				}))
				.then(() => amqpMock.mockHelpers.publish('test', 'test', 'test'))
				.catch(err => console.log(err));
			});
		});
	});

});
