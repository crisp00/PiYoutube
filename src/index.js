'use strict';

var ytdl = require('ytdl-core');
var libQ = require('kew');
var gapi = require('googleapis');
var yt = gapi.youtube('v3');


var gapi_key = "AIzaSyBI8Z5gARDDBGKLLY-0ncLTWWXVZLInrzU";


var r;
var n;

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
	this.logger.info("Youtube::onStart Adding to browse sources");
	this.addToBrowseSources();
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

	return {success: true, plugin: "youtube"};
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


PiYoutube.prototype.add	 = function(vuri){
  var self = this;
  this.logger.info("PiYoutube::addFromVideo");

	if(vuri.includes("list=")){
		var playlistID = vuri.toString().split("list=")[1].split("&")[0];
		this.addPlaylist(playlistID);
	}else{
		this.addVideo(vuri);
	}
};

PiYoutube.prototype.addVideo = function(url){
	return this.commandRouter.addQueueItems([{
		uri: url,
		service: "youtube"
	}]);
}

PiYoutube.prototype.addPlaylist = function(playlistId){
	var self = this;
	yt.playlistItems.list({
		auth: gapi_key,
		part: "snippet",
		maxResults: 50,
		playlistId: playlistId
	}, function(err, resp){
		if(err){
			self.logger.error(err);
		}else{
			var defer = libQ.defer();
			var p = defer.promise;
			n = 0;
			r = resp;
			self.logger.info(JSON.stringify(resp.items[0].snippet));
			for(var i = 0; i < resp.items.length; i++){
				self.logger.info(resp.items[i].snippet.resourceId.videoId);
				p = p.then(function(){
					self.logger.info(r.items[n].snippet.resourceId.videoId);
					var url = "https://youtube.com/watch?v=" + r.items[n].snippet.resourceId.videoId;
					self.logger.info("PiYoutube::qqq(" + n + ") " + url);
					n++;
					return self.commandRouter.addQueueItems([{
						uri: url,
						service: "youtube"
					}]).catch(function(e){
						self.logger.error(e.message);
					});
				}, function(e){
					self.logger.error(e.stack);
				});
			}
			defer.resolve(resp, 0);
		}
	});
}

PiYoutube.prototype.stop = function(){
	this.logger.info("PiYoutube::stop");

	return this.commandRouter.volumioStop();;
}

PiYoutube.prototype.explodeUri = function(uri) {
	var self = this;

	var defer=libQ.defer();

	ytdl.getInfo(uri, { filter: "audioonly"}, function(err, info){
		if(err){
			defer.reject(new Error("Error opening Youtube stream, video is probably not valid."));
		}else {

			defer.resolve({
				uri: info["formats"][0]["url"],
				service: 'mpd',
				name: info["title"],
				title: info["title"],
				duration: info["length_seconds"],
				type: 'track',
				trackType: "YouTube",
				albumart: info["thumbnail_url"].replace("default", "0")
			});
		}
	})

	return defer.promise;
};

PiYoutube.prototype.getState = function(){
	this.logger.info("PiYoutube::getState");
};

PiYoutube.prototype.addToBrowseSources = function () {
	var data = {name: 'Youtube', uri: 'youtube',plugin_type:'music_service',plugin_name:'youtube'};
	this.commandRouter.volumioAddToBrowseSources(data);
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
