'use strict';

var ytdl = require('ytdl-core');
var libQ = require('kew');

module.exports = PiYoutubeQueue;

function PiYoutubeQueue(context) {
	var self = this;

  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.onfigManager;
}

PiYoutubeQueue.prototype.onVolumioStart = function () {
	var self = this;

	return libQ.resolve();
};

PiYoutubeQueue.prototype.onStart = function(){
  //Getting the mdp plugin
  this.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
 	return libQ.resolve();
}

PiYoutubeQueue.prototype.onStop = function () {
	var self = this;
var defer=libQ.defer();
return defer.promise;
	//Perform stop tasks here
};

PiYoutubeQueue.prototype.onRestart = function () {
	var self = this;
var defer=libQ.defer();
return defer.promise;
	//Perform restart tasks here
};

PiYoutubeQueue.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

PiYoutubeQueue.prototype.onUninstall = function () {
	var self = this;
	//Perform your deinstallation tasks here
};

PiYoutubeQueue.prototype.getUIConfig = function () {
	var self = this;

	return {success: true, plugin: "piyq"};
};

PiYoutubeQueue.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your UI configuration tasks here
};

PiYoutubeQueue.prototype.getConf = function (varName) {
	var self = this;
	//Perform your tasks to fetch config data here
};

PiYoutubeQueue.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your tasks to set config data here
};

//Optional functions exposed for making development easier and more clear
PiYoutubeQueue.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to fetch system config data here
};

PiYoutubeQueue.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to set system config data here
};

PiYoutubeQueue.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your tasks to fetch additional config data here
};

PiYoutubeQueue.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your tasks to set additional config data here
};

PiYoutubeQueue.prototype.pause = function(){
	var self = this;
	this.logger.info("PiYoutubeQueue::pause");

	return self.commandRouter.volumioPause();
};


PiYoutubeQueue.prototype.addFromVideo = function(vuri){
  var self = this;
  this.logger.info("PiYoutubeQueue::addFromVideo");
	self.commandRouter.addQueueItems([{
		uri: vuri,
		service: "piyq"
	}]);
};

PiYoutubeQueue.prototype.stop = function(){
	this.logger.info("PiYoutubeQueue::stop");

	return this.commandRouter.volumioStop();;
}

PiYoutubeQueue.prototype.explodeUri = function(uri) {
	var self = this;

	var defer=libQ.defer();

	ytdl.getInfo(uri, { filter: "audioonly"}, function(err, info){
		if(err){
			console.log("Error opening Youtube stream, video is probably not valid.");
		}else {

			console.log(info.title)
			defer.resolve({
				uri: info["formats"][0]["url"],
				service: 'piyq',
				name: info["title"],
				title: info["title"],
				duration: info["length_seconds"],
				type: 'track',
				trackType: "flac",
				albumart: info["thumbnail_url"]
			});
		}
	})

	return defer.promise;
};

PiYoutubeQueue.prototype.addToBrowseSources = function () {

	var data = {name: 'Youtube', uri: 'PiYoutubeQueue', plugin_type:'music_service', plugin_name:'piyq'};
	return this.commandRouter.volumioAddToBrowseSources(data);
};

PiYoutubeQueue.prototype.clearAddPlayTrack = function(track){
	console.log("PiYoutubeQueue::clearAddPlayTrack");
	var self = this;

	return self.mpdPlugin.sendMpdCommand('stop',[])
        .then(function()
        {
            return self.mpdPlugin.sendMpdCommand('clear',[]);
        })
        .then(function()
        {
            return self.mpdPlugin.sendMpdCommand('load "'+track.uri+'"',[]);
        })
        .fail(function (e) {
            return self.mpdPlugin.sendMpdCommand('add "'+track.uri+'"',[]);
        })
        .then(function()
        {
            self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
            return self.mpdPlugin.sendMpdCommand('play',[]);
        });
}
