var di = require(__dirname + '/../../lib/di/di').create();

var AmqpMock = require('../mocks/amqpMock');

var SERVICE_CONFIG = {
	"name": "NO_NAMED_SERVICE_TEST",
	"queues": {
		"service": {
			"nameSufix": "_receive_test",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {
					
				}
			}
		}
	}
};

var QUEUE_NAME_RESULT = "NO_NAMED_SERVICE_TEST_receive_test";

describe('Patterns', function() {
	describe('Service', function() {
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

		it('should connect to amqp when started', function(done) {
			spyOn(amqpMock._methods.connection,'connect').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.connection.connect).toHaveBeenCalled();
				expect(amqpMock._methods.connection.connect.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to create a channel when started', function(done) {
			spyOn(amqpMock._methods.connection,'channel').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.connection.channel).toHaveBeenCalled();
				expect(amqpMock._methods.connection.channel.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to create a queue when started', function(done) {
			spyOn(amqpMock._methods.channel,'queue').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith(QUEUE_NAME_RESULT, SERVICE_CONFIG.queues.service.options);
				expect(amqpMock._methods.channel.queue.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to consume when started', function(done) {
			spyOn(amqpMock._methods.channel,'consume').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.channel.consume).toHaveBeenCalled();
				expect(amqpMock._methods.channel.consume.calls.count()).toEqual(1);
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

		it('should emit the messages after the callback finish', function(done) {
			var serviceName = "Service";
			var route = "Route";
			var messageToEmit1 = {route: Math.random() + '', content: Math.random() + ''};
			var messageToEmit2 = {route: Math.random() + '', content: Math.random() + ''};
			var messageToEmit3 = {route: Math.random() + '', content: Math.random() + ''};
			var message = "HOLA :DDDDD";

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			service.start()
			.then(service => {
				service.on(serviceName, route, (packet, emitter) => {
					setTimeout(() => { //Set timeout because the emission is done after the function is finish.
						expect(amqpMock._methods.channel.emit).toHaveBeenCalled();
						expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit1.route, messageToEmit1.content);
						expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit2.route, messageToEmit2.content);
						expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(SERVICE_CONFIG.name, messageToEmit3.route, messageToEmit3.content);
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

		it('should reject the messages after the callback fail', function(done) {
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
	});
});
