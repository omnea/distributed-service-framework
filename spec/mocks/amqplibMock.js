exports.mock = function () {
	var _methods = {};
	
	return {
		_methods: _methods,
		create: function () {
			var amqp = {
				connect:        () => Promise.resolve(connection)
			};

			var connection = {
				createChannel:  () => Promise.resolve(channel)
			};

			var channel = {
				assertExchange: () => Promise.resolve( {exchange: "testExchange"} ),
				assertQueue:    () => Promise.resolve( {queue:    "testQueue"} ),
				bindQueue:      () => Promise.resolve(),
				close:          () => Promise.resolve(),
				ack:            () => Promise.resolve(),
				nack:           () => Promise.resolve(),
				publish:        () => Promise.resolve(),
				consume:        () => Promise.resolve({consumerTag: "3408c524309c57n2105"})
			};

			_methods.amqp = amqp;
			_methods.connection = connection;
			_methods.channel = channel;
			
			return amqp;
		}
	};
};
