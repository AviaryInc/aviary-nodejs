var uuid 		= require('node-uuid');
var crypto 		= require('crypto');

function AviaryAuth(api_key, api_secret) {
	this.api_key = api_key;
	this.api_secret = api_secret;
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

	auth.api_key 			= config.api_key || this.api_key;
	auth.api_secret 		= config.api_secret || this.api_secret;
	auth.salt 				= config.salt || this.getSalt();
	auth.timestamp 			= config.timestamp || this.getUnixTimestamp();
	auth.encryption_method 	= config.encryption_method || 'sha1';

	var sig = auth.api_key + auth.api_secret + auth.timestamp + auth.salt;

	return crypto.createHash(auth.encryption_method).update(sig).digest('hex');
}

AviaryAuth.prototype.getAuthObject = function(config) {
	config = config || {};

	var api_secret = config.api_secret || this.api_secret;	
	var authObj = {};

	authObj.api_key 			= config.api_key || this.api_key;
	authObj.salt 				= config.salt || this.getSalt();
	authObj.timestamp 			= config.timestamp || this.getUnixTimestamp();
	authObj.encryption_method 	= config.encryption_method || 'sha1';

	authObj.signature = this.getSignature({
		api_key: authObj.api_key, 
		api_secret: api_secret, 
		timestamp: authObj.timestamp, 
		salt: authObj.salt, 
		encryption_method: authObj.encryption_method
	});

	return authObj
};

module.exports = AviaryAuth;