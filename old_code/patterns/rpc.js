module.exports = class RPC {
	constructor(channel, returnQueue) {
		this.channel = null;
		this.queue = null;
	}
	
	setQueue (queue) {
		this.queue = queue;
	}
	
	setChannel (channel) {
		this.channel = channel;
	}
	
	declare (lare) {
		return new Promise((resolve, reject) => {
			
		});
	}
	
	subscribe () {
		return new Promise((resolve, reject) => {
			
		});
	}
	
	consume () {
		return new Promise((resolve, reject) => {
			
		});
	}

	send(service, route, callback) {
		return new Promise((resolve, reject) => {

		});
	}

	stop() { //stop consume

	}

	unsubscribe(){ //delete bindings. Call stop if is consuming

	}
};
