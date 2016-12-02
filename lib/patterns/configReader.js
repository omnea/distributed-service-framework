var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');
var merge = require('deepmerge');

module.exports = class ConfigReader {
	constructor(config, userConfig){
		this.config = this._mergeConfs(config, userConfig);

		this._processConfigExpressions(this.config);
	}

	existQueue(queue){
		return !!this.config.service.queues[queue];
	}

	getServiceName(){
		return this.config.service.name;
	}

	getQueueName(queue) {
		if(!this.config.service.queues[queue])
			throw new Error('Not found in cofig the queue ' + queue);

		return this.config.service.name + this.config.service.queueSeparator + this.config.service.queues[queue].name;
	}

	getQueueOptions(queue) {
		if(!this.config.service.queues[queue])
			throw new Error('Not found in cofig the queue ' + queue);

		return this.config.service.queues[queue].options;
	}

	getQueueBindings(queue) {
		if(!this.config.service.queues[queue])
			throw new Error('Not found in cofig the queue ' + queue);

		return this.config.service.queues[queue].bindings || [];
	}

	getExchangeName() {
		if(!this.config.service.name)
			throw new Error('Error: Service without name.');

		return this.config.service.name;
	}

	getExchangeOptions() {
		if(!this.config.service.exchanges.service)
			throw new Error('Not found the exchange config');

		return this.config.service.exchanges.service.options;
	}

	getExchangeType() {
		if(!this.config.service.exchanges.service)
			throw new Error('Not found the exchange config');

		return this.config.service.exchanges.service.type;
	}

	getCloseTimeout(){
		return this.config.service.closeTimeout || 0;
	}

	getAMQPConfig(){
		if(!this.config.amqp)
			throw new Error('Not found amqp config');

		return this.config.amqp;
	}

	_processConfigExpressions(obj){
		for(let key in obj){
			let value = obj[key];

			if(value !== Object(value) && !Array.isArray())
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
};
