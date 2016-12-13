exports.mock = function () {
	var _methods = {};
	var _helpers = {consumerTag: "3408c524309c57n2105"};
	
	return {
		_methods: _methods,
		_helpers: _helpers,
		create: function () {
			var amqp = {
				connect:        () => Promise.resolve(connection)
			};

			var connection = {
				createChannel:  () => Promise.resolve(channel),
				close:          () => Promise.resolve()
			};

			var channel = {
				assertExchange: () => Promise.resolve( {exchange: "testExchange"} ),
				assertQueue:    () => Promise.resolve( {queue:    "testQueue"} ),
				checkQueue:     () => Promise.resolve( {queue:    "testQueue"} ),
				checkExchange:  () => Promise.resolve( {queue:    "testQueue"} ),
				unbindQueue:    () => Promise.resolve(),
				bindQueue:      () => Promise.resolve(),
				close:          () => Promise.resolve(),
				ack:            () => Promise.resolve(),
				nack:           () => Promise.resolve(),
				publish:        () => Promise.resolve(),
				consume:        () => Promise.resolve({consumerTag: _helpers.consumerTag}),
				cancel:         () => Promise.resolve()
			};

			_methods.amqp = amqp;
			_methods.connection = connection;
			_methods.channel = channel;
			
			return Promise.resolve(amqp);
		}
	};
};
