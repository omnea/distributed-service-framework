var merge = require('deepmerge');

module.exports = class ConfigReader {
	constructor(config, userConfig){
		this.config = this._mergeConfs(config, userConfig);

		this._processConfigExpressions(this.config);
	}

	existQueue(queue){
		return !!this.get('service.queues', queue);
	}

	getServiceName(){
		var name = this.get('service.name');

		if(!name)
			throw new Error('Error: Service without name.');

		return name;
	}

	getQueueName(queue) {
		var queueName = this.get('service.queues', queue, 'name');
		var separator = this.get('service.queueSeparator') || '.';

		if(!queueName)
			throw new Error('Not found in cofig the queue name of ' + queue);

		return this.getServiceName() + separator + queueName;
	}

	getQueueOptions(queue) {
		var queueOptions = this.get('service.queues', queue, 'options');

		if(!queueOptions)
			throw new Error('Not found in cofig the queue options of ' + queue);

		return queueOptions;
	}

	getQueueBindings(queue) {
		if(!this.get('service.queues', queue))
			throw new Error('Not found in cofig the queue ' + queue);

		return this.get('service.queues', queue, 'bindings') || [];
	}

	getExchangeName() {
		return this.getServiceName();
	}

	getExchangeOptions() {
		var options = this.get('service.exchanges.service.options');

		if(!options)
			throw new Error('Not found the exchange config');

		return options;
	}

	getExchangeType() {
		var type = this.get('service.exchanges.service.type');

		if(!type)
			throw new Error('Not found the exchange config');

		return type;
	}

	getCloseTimeout(){
		return this.get('service.closeTimeout') || 0;
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

	get(){
		var levels = Array.prototype.join.call(arguments, '.').split('.');

		var finalItem = this.config;

		levels.forEach(level => {
			if(typeof finalItem === 'undefined') return;
			if(finalItem === null || !finalItem[level]) {
				finalItem = undefined;
				return;
			}

			finalItem = finalItem[level];
		});

		return finalItem;
	}
};
