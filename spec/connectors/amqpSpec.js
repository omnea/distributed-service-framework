var di = require(__dirname + '/../../lib/di/di').create();

var amqplibMock = require('../mocks/amqplibMock').mock();

describe('Connectors', function() {
	describe('AMQP', function() {
		var amqp;

		beforeEach(function(done) {
			di.injectDependency('connectors/amqplib', amqplibMock);

			di.get('connectors/amqp', CONNECTION_PARAMS)
			.then(instance => amqp = instance)
			.then(done)
			.catch(err => {
				console.log(err);
				done(err);
			});
		});

		it('should call AMQP:connect when connect is called', function(done) {
			spyOn(amqplibMock._methods.amqp, 'connect').and.callThrough();

			amqp.connect()
			.then(_ => {
				expect(amqplibMock._methods.amqp.connect).toHaveBeenCalledWith(URL_CONNETION_RESULT);
				expect(amqplibMock._methods.amqp.connect.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:createChannel when a new channel is created', function(done) {
			spyOn(amqplibMock._methods.connection, 'createChannel').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(_ => {
				expect(amqplibMock._methods.connection.createChannel).toHaveBeenCalled();
				expect(amqplibMock._methods.connection.createChannel.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:assertExchange when a exchange is declared', function(done) {
			spyOn(amqplibMock._methods.channel, 'assertExchange').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.exchange("name", "type", "options"))
			.then(_ => {
				expect(amqplibMock._methods.channel.assertExchange).toHaveBeenCalledWith("name", "type", "options");
				expect(amqplibMock._methods.channel.assertExchange.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:assertQueue when a queue is declared', function(done) {
			spyOn(amqplibMock._methods.channel, 'assertQueue').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.queue("name", "options"))
			.then(_ => {
				expect(amqplibMock._methods.channel.assertQueue).toHaveBeenCalledWith("name", "options");
				expect(amqplibMock._methods.channel.assertQueue.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:bindQueue when a new queue is binded', function(done) {
			spyOn(amqplibMock._methods.channel, 'bindQueue').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.bindQueue("queueName", "exchangeSource", "route", "options"))
			.then(_ => {
				expect(amqplibMock._methods.channel.bindQueue).toHaveBeenCalledWith("queueName", "exchangeSource", "route", "options");
				expect(amqplibMock._methods.channel.bindQueue.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:close when a new channel closed', function(done) {
			spyOn(amqplibMock._methods.channel, 'close').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.close())
			.then(_ => {
				expect(amqplibMock._methods.channel.close).toHaveBeenCalled();
				expect(amqplibMock._methods.channel.close.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:consume when starting to consuming from a queue', function(done) {
			spyOn(amqplibMock._methods.channel, 'consume').and.callThrough();

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.consume("test_queue", "function"))
			.then(_ => {
				expect(amqplibMock._methods.channel.consume).toHaveBeenCalledWith("test_queue", "function");
				expect(amqplibMock._methods.channel.consume.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:ack when adknowledge a message', function(done) {
			spyOn(amqplibMock._methods.channel, 'ack').and.callThrough();

			var message = {content: "data"};

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.ack(message)) //Fake message
			.then(_ => {
				expect(amqplibMock._methods.channel.ack).toHaveBeenCalledWith(message);
				expect(amqplibMock._methods.channel.ack.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:nack when reject a message', function(done) {
			spyOn(amqplibMock._methods.channel, 'nack').and.callThrough();

			var message = {content: "data"};

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.reject(message)) //Fake message
			.then(_ => {
				expect(amqplibMock._methods.channel.nack).toHaveBeenCalledWith(message, false, false);
				expect(amqplibMock._methods.channel.nack.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should call AMQP:publish when emit a message', function(done) {
			spyOn(amqplibMock._methods.channel, 'publish').and.callThrough();

			var message = {content: "data"};
			var service = "Service";
			var route = "Route";

			amqp.connect()
			.then(connection => connection.channel())
			.then(channel => channel.emit(service, route, message)) //Fake message
			.then(_ => {
				expect(amqplibMock._methods.channel.publish).toHaveBeenCalledWith(service, route, message);
				expect(amqplibMock._methods.channel.publish.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

	});
});

var CONNECTION_PARAMS = {url: 'localhost', port: '9047', user: 'user', pass: 'pass'};
var URL_CONNETION_RESULT = 'amqp://user:pass@localhost:9047';
