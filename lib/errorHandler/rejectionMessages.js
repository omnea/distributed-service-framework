module.exports = {
	REASON_BAD_FORMED: 'Message is bad formed: ',
	REASON_NO_ROUTE: 'Message no rejected (possible unrouteable message): ',
	REASON_NO_HEADERS: 'Fail to process message headers (no-headers): ',
	REASON_DEATHS_NO_ARRAY: 'Fail to process message headers (x-death is not an array): ',
	REASON_NO_NORMAL_REJECTIONS: 'Fail to process message headers (normalRejections not found): ',
	REASON_NO_ROUTING_KEYS: 'Fail to process message headers (normalRejections routing-keys is not an array): ',
	REASON_CORRUPTED_TOTAL_REJECTIONS: 'Fail to process message headers (totalRejections is not a number): ',
	REASON_NOT_FOUND_ORIGINAL_ROUTE: 'Fail to process message headers (not found original route): ',
	REASON_REJECTED_TOO_MANY_TIMES: (normal, total) => `Message rejected too many times (${normal},${total}): `
};
