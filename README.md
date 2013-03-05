# aviary-nodejs

A NodeJS implementation of the Aviary Server-side Render Api.

## Installation

To install via npm:

	npm install aviary

## Usage

Right now the Aviary Render API is limited to Enterprise partners. Please contact [partners@aviary.com](mailto:partners@aviary.com) for more information.

### Sample Usage

	var Aviary = require('../lib/aviary').Aviary;

	var aviary = new Aviary('<apiKey>', '<apiSecret');

	var renderConfig = {
		url: '<image url>',
		actionList: '<actionlist'
	};

	var callback = function(error, url) {
		console.log(url);
	}

	aviary.renderAndWait(renderConfig, callback);