var merge = require('deepmerge');

module.exports = class ConfigReader {
	constructor(config, userConfig){
		this.config = this._mergeConfs(config, userConfig);

		this._processConfigExpressions(this.config);
	}

	get(){
		var levels = Array.prototype.join.call(arguments, '.').split('.');

		var finalItem = this.config;

		levels.forEach(level => {
			if(typeof finalItem === 'undefined') return;
			if(finalItem === null || (!finalItem[level] && finalItem[level] !== "")) {
				finalItem = undefined;
				return;
			}

			finalItem = finalItem[level];
		});

		return finalItem;
	}

	getEnvironment(){
		var environment = this.get('environment');

		if(typeof environment === 'undefined')
			throw new Error('Error: Not environment found.');

		return environment;
	}

	existQueue(queue){
		return Boolean(this.get('service.queues', queue));
	}

	getServiceName(){
		var name = this.get('service.name');

		if(typeof name === 'undefined')
			throw new Error('Error: Service without name.');

		return name;
	}

	getQueueName(queue) {
		var queueName = this.get('service.queues', queue, 'name');
		var separator = this.get('service.globalSeparator') || '.';

		if(typeof queueName === 'undefined')
			throw new Error('Not found in config the queue name of ' + queue);

		return this.getServiceName() + separator + queueName;
	}

	getQueueOptions(queue) {
		var queueOptions = this.get('service.queues', queue, 'options');

		if(typeof queueOptions === 'undefined')
			throw new Error('Not found in config the queue options of ' + queue);

		return queueOptions;
	}

	getQueueBindings(queue) {
		if(!this.get('service.queues', queue))
			throw new Error('Not found in config the queue ' + queue);

		return this.get('service.queues', queue, 'bindings') || [];
	}

	getGlobalErrorQueueName() {
		var queueName = this.get('service.globalErrorQueue.name');

		if(typeof queueName === 'undefined')
			throw new Error('Not found the global error queue name in config');

		return queueName;
	}

	getGlobalErrorExchangeName() {
		var name = this.get('service.globalErrorExchange.name');

		if(typeof name === 'undefined')
			throw new Error('Not found the global error exchange name in config');

		return name;
	}

	getGlobalErrorQueueOptions() {
		var queueName = this.get('service.globalErrorQueue.options');

		if(typeof queueName === 'undefined')
			throw new Error('Not found the global error queue options in config');

		return queueName;
	}

	getExchangeName(name) {
		if(!name) name = "service";

		var exchangeName = this.get('service.exchanges', name, 'name');
		var separator = this.get('service.globalSeparator') || '.';

		if(typeof exchangeName === 'undefined')
			throw new Error('Not found name in config for the exchange ' + name);

		return this.getServiceName() + (exchangeName ? (separator + exchangeName) : "");
	}

	getExchangeOptions(name) {
		if(!name) name = "service";

		var options = this.get('service.exchanges', name, 'options');

		if(typeof options === 'undefined')
			throw new Error('Not found options in config for the exchange ' + name);

		return options;
	}

	getExchangeType(name) {
		if(!name) name = "service";

		var type = this.get('service.exchanges', name, 'type');

		if(typeof type === 'undefined')
			throw new Error('Not found type in config for the exchange ' + name);

		return type;
	}

	getCloseTimeout(){
		return this.get('service.closeTimeout') || 0;
	}

	iterateQueues(fn) {
		var queues = this.get('service.queues');

		if(typeof queues === 'undefined')
			throw new Error('Configuration without queues');

		for(let name in queues) {
			fn(name);
		}
	}

	iterateExchanges(fn) {
		var exchanges = this.get('service.exchanges');

		if(typeof exchanges === 'undefined')
			throw new Error('Configuration without exchanges');

		for(let name in exchanges) {
			fn(name);
		}
	}

	getAMQPConfig(){
		var config = this.get('amqp');
		if(!config)
			throw new Error('Not found amqp config');

		return config;
	}

	_processConfigExpressions(obj){
		for(let key in obj){
			let value = obj[key];

			if(value !== Object(value) && !Array.isArray(value))
				continue;

			if(value._process_ === true){
				obj[key] = this._processExpression(value);
				continue;
			}

			this._processConfigExpressions(value);
		}
	}

	_processExpression(expression) {
		var action = expression.action;

		if(action === 'get-amqp-name')
			return this._searchAmqpName(expression.type, expression.name);

		if(action === 'get-global-error-exchange')
			return this.getGlobalErrorExchangeName();

		throw new Error('Config expression error: Not found action ' + action);
	}

	_searchAmqpName(type, name) {
		if(type === 'exchange')
			return this.getExchangeName(name);

		if(type === 'queue')
			return this.getQueueName(name);

		throw new Error('Config expression error: Not found amqp entity ' + type);
	}

	_mergeConfs (predefinedOptions, conf) {
		if(!predefinedOptions) predefinedOptions = {};
		if(!conf) conf = {};
		
		return merge(predefinedOptions, conf);
	}
};
