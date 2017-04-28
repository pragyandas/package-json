'use strict';
var url = require('url');
var fetch = require('node-fetch');
var Agent = require('https-proxy-agent');
var registryUrl = require('registry-url');
var registryAuthToken = require('registry-auth-token');
var semver = require('semver');
var config = require('rc')('npm');

module.exports = function (name, version) {
	var scope = name.split('/')[0];
	var regUrl = registryUrl(scope);
	var pkgUrl = url.resolve(regUrl, encodeURIComponent(name).replace(/^%40/, '@'));
	var authInfo = registryAuthToken(regUrl);
	var headers = {};

	if (authInfo) {
		headers.authorization = authInfo.type + ' ' + authInfo.token;
	}

	var options ={
		headers: headers
	};

	var proxy = process.env.https_proxy || config['https-proxy'] || config.proxy;

	if(proxy){
		var agent = new Agent(proxy);
		options.agent = agent;
	}
		

	return fetch(pkgUrl, options)
		.then(function (response) {
			if (!response.ok) {
				throw Error(response.statusText)
			}
			return response.json();
		})
		.then(function (res) {
			var data = res;
			if (version === 'latest') {
				data = data.versions[data['dist-tags'].latest];
			} else if (version) {
				if (!data.versions[version]) {
					var versions = Object.keys(data.versions);
					version = semver.maxSatisfying(versions, version);

					if (!version) {
						throw new Error('Version doesn\'t exist');
					}
				}

				data = data.versions[version];

				if (!data) {
					throw new Error('Version doesn\'t exist');
				}
			}

			return data;
		})
		.catch(function (err) {
			if (err.statusCode === 404) {
				throw new Error('Package `' + name + '` doesn\'t exist');
			}

			throw err;
		});
};
