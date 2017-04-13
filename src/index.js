'use strict';

var ytdl = require('ytdl-core');
var libQ = require('kew');


this.state = {};

module.exports = PiYoutube;
function PiYoutube(context) {
	var self = this;

  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.onfigManager;
}

PiYoutube.prototype.onVolumioStart = function () {
	var self = this;

	return libQ.resolve();
};

PiYoutube.prototype.onStart = function(){
  //Getting the mdp plugin
  this.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
 	return libQ.resolve();
}

PiYoutube.prototype.onStop = function () {
	var self = this;
var defer=libQ.defer();
return defer.promise;
	//Perform stop tasks here
};

PiYoutube.prototype.onRestart = function () {
	var self = this;
var defer=libQ.defer();
return defer.promise;
	//Perform restart tasks here
};

PiYoutube.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

PiYoutube.prototype.onUninstall = function () {
	var self = this;
	//Perform your deinstallation tasks here
};

PiYoutube.prototype.getUIConfig = function () {
	var self = this;

	return {success: true, plugin: "piyq"};
};

PiYoutube.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your UI configuration tasks here
};

PiYoutube.prototype.getConf = function (varName) {
	var self = this;
	//Perform your tasks to fetch config data here
};

PiYoutube.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your tasks to set config data here
};

//Optional functions exposed for making development easier and more clear
PiYoutube.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to fetch system config data here
};

PiYoutube.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to set system config data here
};

PiYoutube.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your tasks to fetch additional config data here
};

PiYoutube.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your tasks to set additional config data here
};

PiYoutube.prototype.pause = function(){
	var self = this;
	this.logger.info("PiYoutube::pause");

	return self.commandRouter.volumioPause();
};


PiYoutube.prototype.addFromVideo = function(vuri){
  var self = this;
  this.logger.info("PiYoutube::addFromVideo");
	self.commandRouter.addQueueItems([{
		uri: vuri,
		service: "piyq"
	}]);
};

PiYoutube.prototype.stop = function(){
	this.logger.info("PiYoutube::stop");

	return this.commandRouter.volumioStop();;
}

PiYoutube.prototype.explodeUri = function(uri) {
	var self = this;

	var defer=libQ.defer();

	ytdl.getInfo(uri, { filter: "audioonly"}, function(err, info){
		if(err){
			console.log("Error opening Youtube stream, video is probably not valid.");
		}else {

			console.log(info)
			defer.resolve({
				uri: info["formats"][0]["url"],
				service: 'mpd',
				name: info["title"],
				title: info["title"],
				duration: info["length_seconds"],
				type: 'track',
				trackType: "YouTube",
				albumart: info["thumbnail_url"]
			});
		}
	})

	return defer.promise;
};

PiYoutube.prototype.getState = function(){
	this.logger.info("PiYoutube::getState");
};

PiYoutube.prototype.addToBrowseSources = function () {

	var data = {name: 'Youtube', uri: 'PiYoutube', plugin_type:'music_service', plugin_name:'piyq'};
	return this.commandRouter.volumioAddToBrowseSources(data);
};

PiYoutube.prototype.play = function(){
	console.log("PiYoutube::play");
}

PiYoutube.prototype.clearAddPlayTrack = function(track){
	console.log("PiYoutube::clearAddPlayTrack");
	var self = this;

	return self.mpdPlugin.sendMpdCommand('stop',[])
        .then(function()
        {
						self.logger.info("PiYoutube=> Clear");
            return self.mpdPlugin.sendMpdCommand('clear',[]);
        })
        .then(function()
        {
						self.logger.info("PiYoutube=> Load");
            return self.mpdPlugin.sendMpdCommand('load "'+track.uri+'"',[]);
        })
        .fail(function (e) {
						self.logger.info("PiYoutube=> Add");
            return self.mpdPlugin.sendMpdCommand('add "'+track.uri+'"',[]);
        })
        .then(function()
        {
						self.logger.info("PiYoutube=> Before Play");
            return (self.commandRouter.stateMachine.setConsumeUpdateService('mpd')
						.then(function(){
							return self.mpdPlugin.sendMpdCommand('play',[]);
						}));
        });
}
