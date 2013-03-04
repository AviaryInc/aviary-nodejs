var https		= require('http'),
	querystring = require('querystring'),
	tunnel 		= require('tunnel');
	AviaryAuth 	= require('./aviary_auth');

var API_SERVER = 'api.aviary.com';
var API_VERSION = 'v1';

/*
 * Class for making REST calls to Aviary
 *
 * @param 	{String}	api_key		Your application key
 * @param	{String}	api_secret	Your application secret
 */
function Aviary(api_key, api_secret) {
	// TODO: force constructor
	// TODO: throw Error on missing parameters

	this.api_key = api_key;
	this.api_secret = api_secret;
};

/*
 * Starts an image render via REST and returns a job id if the call is successful
 *
 * @param 	{String}	url 			The image url
 * @param	{String}	action_list		A JSON representation of the actions to apply to the image
 * @param 	{Function}	success			A function to call when the render API call is complete
 * @param 	{Function}	error 			A function to call when the render API call fails
 */
Aviary.prototype.render = function (url, action_list, success, error) {
	var auth = new AviaryAuth(this.api_key, this.api_secret);
	var authObj = auth.getAuthObject();

	var params = {
		'apikey': authObj.api_key,
		'timestamp': authObj.timestamp.toString(),
		'salt': authObj.salt,
		'signature': authObj.signature,
		'encryptionmethod': authObj.encryption_method,
		'origurl': url,
		'actionlist': action_list
	};

	//params = querystring.stringify(params);

	doApiCall('POST', 'render', params, success, error);
};

/* 
 * Callback required to get rendered url
 * @callback 	renderAndWaitSuccess
 * @param 		url 					 	Url of the rendered image
 */

/* 
 * Called when a render fails
 * @callback 	renderAndWaitError
 * @param 		err 					 	An object describing the error
 */

/*
 * Starts a render job and polls until job is complete
 *
 * @param 	{Object}				config 					A config object describing the render
 * @param 	{String}				config.url				The image url to be rendered
 * @param	{String}				config.action_list		A JSON representation of the actions to apply to the image
 * @param 	{renderAndWaitSuccess}	config.success			callback
 * @param 	{renderAndWaitError}	config.error			callback
 */
Aviary.prototype.renderAndWait = function (config) {
	var AviaryInstance = this;
	var POLLING_DELAY = 500;
	var asyncPollingReady = true;
	var asyncPollingTimer = null;
	var jobId = null;

	config.url = config.url || '';
	config.action_list = config.action_list || '';
	config.success = config.success || function () {};
	config.error = config.error || function() {};
	config.polling_delay = config.polling_delay || POLLING_DELAY;

	var renderCompleteCallback = function(url) {
		config.success(url);
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
			config.errorCallback(data);
		}
	};
	var errorCallback = function(err) {
		config.error(err);
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

	AviaryInstance.render(config.url, config.action_list, renderCallback, errorCallback);
}

/*
 * Gets the status of a render job via REST and returns a status if successful
 *
 * @param 	{String}	job_id 			The id for a render job
 * @param 	{Function}	success			A function to call when the render API call is complete
 * @param 	{Function}	error 			A function to call when the render API call fails
 */
Aviary.prototype.getStatus = function(job_id, success, error) {
	// TODO: Write me
	var auth = new AviaryAuth(this.api_key, this.api_secret);
	var authObj = auth.getAuthObject();

	var params = {
		'apikey': authObj.api_key,
		'timestamp': authObj.timestamp.toString(),
		'salt': authObj.salt,
		'signature': authObj.signature,
		'encryptionmethod': authObj.encryption_method,
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
	var tunnelingAgent = tunnel.httpOverHttp({
		proxy: {
			host: 'localhost',
			port: 8888
		}
	});

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
		//port: 443,
		port: 80,
		method: method,
		path: fullPath,
		headers: headers,
		agent: tunnelingAgent
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
				// not valid json response
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