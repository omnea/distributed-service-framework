exports.create = function () {


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
	};

	exports._methods = {
		amqp:       amqp,
		connection: connection,
		channel:    channel
	};

	return amqp;
};

exports._methods = {};
