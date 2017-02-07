module.exports = class MessageMockBuilder {
	constructor(configReader) {
		this.config = configReader;
		this.message = emptyMessage(this.config.getExchangeName('service'));
	}

	get() {
		return this.message;
	}

	reject(exchange = 'test', queue = 'test.consume', count = 1, reason = 'rejected') {
		this._addReject(rejectionCause(exchange, queue, count, reason, this.message.fields.routingKey));
		return this;
	}

	exchange(name) {
		this.message.fields.exchange = name;
		return this;
	}

	route(name) {
		this.message.fields.routingKey = name;
		return this;
	}

	redelivered(name) {
		this.message.fields.redelivered = name;
		return this;
	}

	deleteHeader(header) {
		delete this.message.properties.headers[header];
		return this;
	}

	_addReject(rejection) {
		//https://www.rabbitmq.com/dlx.html -> Read on section "Dead-Lettered Messages"
		var existingRejection = this.message.properties.headers['x-death'].find(_rej => 
			rej.queue === _rej.queue && rej.reason === _rej.reason
		);

		if(!existingRejection)
			return this.message.properties.headers['x-death'].push(rejection);

		existingRejection.exchange = rejection.exchange;
		existingRejection.count++;
		existingRejection['routing-keys'] = rejection['routing-keys'];
		existingRejection.time = rejection.time;
	}
};

function emptyMessage(exchange) {
	return {
		"content": {
			"data": [58,68],
			"type": "Buffer"
		},
		"fields": {
			"consumerTag": "amq.ctag-OGIXpeQTHs3vw7-2UGyksA",
			"deliveryTag": 2,
			"exchange": exchange,
			"redelivered": false,
			"routingKey": "hi"
		},
		"properties": {
			"headers": {
				"x-death": []
			}
		}
	};
}

function rejectionCause(exchange, queue, count, reason, route) {
	return {
		"count": count,
		"exchange": exchange,
		"queue": queue,
		"reason": reason,
		"routing-keys": [
			route
		],
		"time": {
			"!": "timestamp",
			"value": 1483030566
		}
	};
}
