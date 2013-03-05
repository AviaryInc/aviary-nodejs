var uuid 		= require('node-uuid');
var crypto 		= require('crypto');

function AviaryAuth(apiKey, apiSecret) {
	this.apiKey = apiKey;
	this.apiSecret = apiSecret;
}

AviaryAuth.prototype.getSalt = function() {
	return uuid.v4(); 
};

AviaryAuth.prototype.getUnixTimestamp = function () {
	return (new Date()).getTime() / 1000; 
};

AviaryAuth.prototype.getSignature = function(config) {
	config = config || {};

	var auth = {};

	auth.apiKey 			= config.apiKey || this.apiKey;
	auth.apiSecret 		= config.apiSecret || this.apiSecret;
	auth.salt 				= config.salt || this.getSalt();
	auth.timestamp 			= config.timestamp || this.getUnixTimestamp();
	auth.encryptionMethod 	= config.encryptionMethod || 'sha1';

	var sig = auth.apiKey + auth.apiSecret + auth.timestamp + auth.salt;

	// TODO: Validate encyrption_method

	return crypto.createHash(auth.encryptionMethod).update(sig).digest('hex');
};

AviaryAuth.prototype.getAuthObject = function(config) {
	config = config || {};

	var authObj = {};

	authObj.apiKey 			= config.apiKey || this.apiKey;
	authObj.salt 				= config.salt || this.getSalt();
	authObj.timestamp 			= config.timestamp || this.getUnixTimestamp();
	authObj.encryptionMethod 	= config.encryptionMethod || 'sha1';
	authObj.apiSecret 			= config.apiSecret || this.apiSecret;

	authObj.signature = this.getSignature(authObj);

	delete authObj.apiSecret;

	return authObj;
};

module.exports = AviaryAuth;