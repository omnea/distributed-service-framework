var debug = require('debug')('Omnea:SF:Service:log');
var error = require('debug')('Omnea:SF:Service:error');

module.exports = class Service {
	constructor(connector, emitterFactory, router, rpcPattern, config, name, inputMiddlewares, outputMiddlewares){
		this.connector = connector;
		this.config = config;
		this.name = name;
		this.router = router;
		this.emitterFactory = emitterFactory;
		//this.rpcPattern = rpcPattern;
		this.inputMiddlewares = inputMiddlewares;
		this.outputMiddlewares = outputMiddlewares;

		this.queues = null;
		this.channel = null;
		this.started = false;

		this.connector.on('error', err => this._handleDisconnect(err));
	}	

	/*
	1. Connect
	2. Declare channel
	3. Declare exchanges and queues.
		3.1 Declare service exchange
		3.2 Declase service queue
	4. Read config and create subscriptions
	5. Consume from queues
	*/
	start() {
		debug('Connecting to services net...');

		return this.connector.connect()
		.then(_ => this._createChannel()) //2.
		.then(_ => this._declareExchange())//3.1
		.then(_ => this._declareQueues()) //3.2
		.then(_ => this._subscribe()) //4.
		.then(_ => this._consume()) //5
		.then(_ => this.started = true)
		.then(_ => debug('Connected to services net'))
		.catch(err => {
			error("Failed on service load", err);
			throw err;
		})
		.then(_ => this);
	}

	addInputMiddleware(callback) {
		this.inputMiddlewares.push(callback);
		debug("Added new middleware");
	}

	addOutputMiddleware(callback) {
		this.outputMiddlewares.push(callback);
		debug("Added new middleware");
	}

	addRoute(service, route, callback) {
		this._checkStarted('adding routes');

		this.router.add(service, route, callback);
		
		return this.channel.bindQueue(this.queues.service, service, route)
		.then(_ => debug("Added route: " + service + ":" + route))
		.catch(err => {
			error(err);
			throw new Error('Bind failed for: ', service, route, err.message);
		});
	}

	removeRotue(service, route, callback) {
		this._checkStarted('removing routes');

		this.router.remove(service, route, callback);
		
		return this.channel.unbindQueue(this.queues.service, service, route)
		.then(_ => debug("Removed route: " + service + ":" + route))
		.catch(err => {
			error(err);
			throw new Error('Unbind failed for: ', service, route, err.message);
		});
	}

	/*
	1. Apply middlewares
	2. Search callback
	3. Call callback and get returned promise.
		3.1 If not promise, throw error
		3.2 Create a new Emmiter()
	4. Add a then on promise
		4.1 Send all events on the emitter
		4.2 Make ack
	5. Add a catch on the promise and log the error.
	*/
	_onMessage(packet) {
		var method = this.router.get(packet.getService(), packet.getRoute()); //2.

		if(!method) return;

		var emitter = this.emitterFactory.build(this.rpcPattern);

		this._executeMiddlewares(packet) //1.
		.then(data => this._executeMethod(method, emitter, data)) //3.1, 3.2
		.then(result => { //4.1, 4.2, 4.3

		}).catch(err => { //5

		});
	}

	_executeMiddlewares (value) {
		var flow = Promise.resolve(value);

		for (let middleware of this.inputMiddlewares) {
			flow = flow.then(middleware);
		}

		return flow;
	}

	_createChannel() {
		return this.connector.channel()
		.then(channel => {
			this.channel = channel;
			channel.on('error', err => this._handleChannelClose(err));
		});
	}

	_declareExchange() {
		var options = Object.assign({}, this.config.exchanges.service);
		return this.channel.exchange(this.name, options.type, options.options);
	}

	_declareQueues() {
		var options = Object.assign({}, this.config.queues.service);
		return this.channel.queue(this.name + options.nameSufix, options.options)
		.then(queueName => {
			this.queues = {
				rpc: null,
				service: queueName
			};
		});
	}

	_subscribe() {
		return Promise.resolve();
	}

	_consume() {
		return Promise.resolve();
	}

	_checkStarted(action){
		if(this.started)
			return true;
		throw new Error('Service not connected. You must connect the service before ' + action);
	}

	_executeMethod(method, emitter, data) {
		if(!Array.isArray(method))
			return method(emitter, data);

		let future = Promise.resolve(data);

		method.forEach(method => {
			future = future.then(data => method(emitter, data));
		});

		return future;
	}

	_handleDisconnect(err) {
		error(err);
		return new Promise((resolve, reject) => {
			setTimeout(_ => {
				this.start().then(resolve);
			}, 1000);
		});
	}

	_handleChannelClose(err) {
		error(err);
	}
};
