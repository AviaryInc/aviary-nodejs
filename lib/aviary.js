var https		= require('https'),
	querystring = require('querystring'),
	// tunnel 		= require('tunnel');
	AviaryAuth 	= require('./aviary_auth');

var API_SERVER = 'api.aviary.com';
var API_VERSION = 'v1';

/**
 * Class for making REST calls to Aviary
 *
 * @param 	{String}	apiKey		Your application key
 * @param	{String}	apiSecret	Your application secret
 */
function Aviary(apiKey, apiSecret) {
	// TODO: force constructor
	// TODO: throw Error on missing parameters

	this.apiKey = apiKey;
	this.apiSecret = apiSecret;
};

/**
 * Starts an image render via REST and returns a job id if the call is successful
 *
 * @param 	{String}	url 			The image url
 * @param	{String}	actionList		A JSON representation of the actions to apply to the image
 * @param 	{Function}	success			A function to call when the render API call is complete
 * @param 	{Function}	error 			A function to call when the render API call fails
 */
Aviary.prototype.render = function (url, actionList, success, error) {
	var auth = new AviaryAuth(this.apiKey, this.apiSecret);
	var authObj = auth.getAuthObject();

	var params = {
		'apikey': authObj.apiKey,
		'timestamp': authObj.timestamp.toString(),
		'salt': authObj.salt,
		'signature': authObj.signature,
		'encryptionmethod': authObj.encryptionMethod,
		'origurl': url,
		'actionlist': actionList
	};

	doApiCall('POST', 'render', params, success, error);
};

/* *
 * Callback required to get rendered url
 * 
 * @callback 	renderAndWaitCallback
 * @param 		error 	Error object
 * @param 		url 	Url of the rendered image
 */

/**
 * Starts a render job and polls until job is complete
 *
 * @param 	{Object}				config 					A config object describing the render
 * @param 	{String}				config.url				The image url to be rendered
 * @param	{String}				config.actionList		A JSON representation of the actions to apply to the image
 * @param 	{renderAndWaitCallback}	callback				callback
 */
// TODO: see mongolib or fs.readFile for single callback(err, data)
Aviary.prototype.renderAndWait = function (config, callback) {

	var AviaryInstance = this;
	var POLLING_DELAY = 1000;
	var asyncPollingReady = true;
	var asyncPollingTimer = null;
	var jobId = null;

	config.url = config.url || '';
	config.actionList = config.actionList || '';
	config.polling_delay = config.polling_delay || POLLING_DELAY;

	var renderCompleteCallback = function(url) {
		callback(null, url);
	};

	var renderCallback = function(data) {
		if (data && data.id) {
			jobId = data.id;
			asyncPollingTimer = setInterval(function () {
				if (asyncPollingReady) {
					AviaryInstance.getStatus(jobId, getJobStatusCallback, errorCallback);
				}
				asyncPollingReady = false;
			}, config.polling_delay);
		} else {
			callback(data, null);
		}
	};
	var errorCallback = function(err) {
		callback(err, null);
	};

	var getJobStatusCallback = function(data) {
		if (!data|| (data && data.code > 4)) {
			// error (stop polling)
			errorCallback(data);
			clearInterval(asyncPollingTimer);
		} else {
			if (data && data.code === 4) {
				clearInterval(asyncPollingTimer);
				renderCompleteCallback(data.url);
			}
		}
		asyncPollingReady = true;
	};

	AviaryInstance.render(config.url, config.actionList, renderCallback, errorCallback);
}



/**
 * Gets the status of a render job via REST and returns a status if successful
 *
 * @param 	{String}	job_id 			The id for a render job
 * @param 	{Function}	success			A function to call when the render API call is complete
 * @param 	{Function}	error 			A function to call when the render API call fails
 */
Aviary.prototype.getStatus = function(job_id, success, error) {
	// TODO: Write me
	var auth = new AviaryAuth(this.apiKey, this.apiSecret);
	var authObj = auth.getAuthObject();

	var params = {
		'apikey': authObj.apiKey,
		'timestamp': authObj.timestamp.toString(),
		'salt': authObj.salt,
		'signature': authObj.signature,
		'encryptionmethod': authObj.encryptionMethod,
		'jobid': job_id
	};

	//params = querystring.stringify(params);

	doApiCall('GET', 'render', params, success, error);
};

function doApiCall(method, path, params, success, error) {
	success = success || function() {};
	error = error || function() {};

	//var fullPath = '/' + API_VERSION + '/' + path;
	var fullPath =  '/' + path;
	var headers = {};

	// proxy tunnel for Charles
	// Check for charles in ./config
	/*
	var tunnelingAgent = tunnel.httpOverHttp({
		proxy: {
			host: 'localhost',
			port: 8888
		}
	});
	*/

	if (typeof params != 'string') {
		params = querystring.stringify(params);
	}

	method = method.toUpperCase();
	
	if (params && method == 'POST') {
		headers['Content-Length'] = params.length;
		headers['Content-Type'] = 'application/x-www-form-urlencoded';

	} else if (params && method == 'GET') {
		fullPath += '?' + params;
	}

	headers.Host = API_SERVER;

	var options = {
		host: API_SERVER,
		port: 443,
		//port: 80,
		method: method,
		path: fullPath,
		headers: headers
		//,agent: tunnelingAgent
	};

	var request = https.request(options, function(resp) {
		var chunks = [];
		resp.setEncoding('utf8');

		resp.on('data', function(chunk) {
			chunks.push(chunk);
		});

		resp.on('end', function() {
			var body = chunks.join('');

			try {
				body = JSON.parse(body);
			} catch (e) {
				// TODO: call onError - not valid json response
				error(e);
			}

			success(body);
		});

		resp.on('error', error);
	});


	if (params && method == 'POST') {
		request.write(params);
	}
	
	request.on('error', error);

	request.end();
}

module.exports = Aviary;