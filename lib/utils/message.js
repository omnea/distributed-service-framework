exports.getBuffer = function (data) {
	if(typeof data === 'number')
		data = String(data);

	return new Buffer.from(data);
};

exports.fromArguments = function (route, content) {
	return {route, content: exports.getBuffer(content)};
};
