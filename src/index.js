'use strict';

var ytdl = require('ytdl-core');
var libQ = require('kew');
var gapis = require('googleapis');
var request = require('request');
var dur = require("iso8601-duration");

var yt = gapis.youtube('v3');
var ytapi_key = "AIzaSyBI8Z5gARDDBGKLLY-0ncLTWWXVZLInrzU";


module.exports = Youtube;

function Youtube(context) {
  var self = this;

  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.configManager;
  this.addQueue = [];
  this.state = {};
  this.stateMachine = this.commandRouter.stateMachine;
}

Youtube.prototype.onVolumioStart = function() {
  var self = this;

  var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
  self.configFile = configFile;

  self.config = new(require('v-conf'))();
  self.config.loadFile(configFile);
  self.resultsLimit = self.config.get('results_limit');

  return libQ.resolve();
};

Youtube.prototype.onStart = function() {
  //Getting the mdp plugin
  this.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
  this.logger.info("Youtube::onStart Adding to browse sources");
  this.addToBrowseSources();
  return libQ.resolve();
}

Youtube.prototype.onStop = function() {
  var self = this;
  return libQ.resolve();
};

Youtube.prototype.onRestart = function() {
  var self = this;
  return libQ.resolve();
};

Youtube.prototype.onInstall = function() {
  var self = this;
  //Perform your installation tasks here
};

Youtube.prototype.onUninstall = function() {
  var self = this;
  //Perform your deinstallation tasks here
};

Youtube.prototype.getUIConfig = function() {
  var self = this;
  var lang_code = this.commandRouter.sharedVars.get('language_code');

  return self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
      __dirname + '/i18n/strings_en.json',
      __dirname + '/UIConfig.json')
    .then(function(uiconf) {
      uiconf.sections[0].content[0].value = self.config.get('results_limit');

      return uiconf;
    })
    .fail(function() {
      libQ.reject(new Error());
    });
};

Youtube.prototype.setUIConfig = function(data) {
  var self = this;
  //Perform your UI configuration tasks here
};

Youtube.prototype.getConf = function(varName) {
  var self = this;
  //Perform your tasks to fetch config data here
};

Youtube.prototype.setConf = function(varName, varValue) {
  var self = this;
  //Perform your tasks to set config data here
};

Youtube.prototype.getConfigurationFiles = function() {
  return ['config.json'];
}

Youtube.prototype.pause = function() {
  var self = this;
  this.logger.info("Youtube::pause");

  return self.commandRouter.volumioPause();
};


Youtube.prototype.add = function(vuri) {
  var self = this;
  this.logger.info("Youtube::add");

  if (vuri.includes("list=")) {
    var playlistId = decodeURI(vuri.toString()).split("list=")[1].split("&")[0];
    this.addPlaylist(playlistId);
  } else {
    var regex = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/ig;
    var videoId = vuri.replace(regex, "$1");
    self.commandRouter.pushConsoleMessage(vuri + " kkk " + videoId);
    this.addVideo(videoId);
  }
};

Youtube.prototype.addVideo = function(videoId) {
  var self = this;
  this.logger.info("Youtube::addVideo");

  return this.commandRouter.addQueueItems([{
    uri: videoId,
    service: "youtube"
  }]);
}

Youtube.prototype.addPlaylist = function(playlistId, pageToken) {
  var self = this;
  this.logger.info("Youtube::addPlaylist " + playlistId);

  //Contact Youtube Data API v3 for the list of videos in the playlist
  var request = {
    auth: ytapi_key,
    part: "snippet",
    maxResults: 50,
    playlistId: playlistId
  };

  if (pageToken != undefined)
    request.pageToken = pageToken;

  yt.playlistItems.list(request, function(err, res) {
    if (err) {
      //Holy crap, something went wrong :/
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      var videos = res.items;
      //self.commandRouter.pushConsoleMessage(JSON.stringify(videos));
      for (var i = 0; i < videos.length; i++) {
        var video = {
          uri: videos[i].snippet.resourceId.videoId
        }
        self.addQueue = self.addQueue.concat([video]);
      }
      if (res.nextPageToken != undefined) {
        return self.addPlaylist(playlistId, res.nextPageToken);
      } else {
        return self.parseAddQueue();
      }
    }
  });

}

Youtube.prototype.parseAddQueue = function() {
  var self = this;

  var deferred = libQ.defer();
  if (self.addQueue.length > 0) {
    var videoDefer = libQ.defer();
    self.addVideo(self.addQueue[0].uri).then(function() {
      videoDefer.resolve()
    }, function(e) {
      videoDefer.resolve()
    });
    videoDefer.promise.then(function() {
      self.commandRouter.pushConsoleMessage("Added " + self.addQueue[0].url);
      self.addQueue.splice(0, 1);
      if (self.addQueue.length > 0) {
        return self.parseAddQueue();
      } else {
        return deferred.resolve();
      }
    });
  } else {
    return deferred.resolve({
      added: 0
    });
  }
  return deferred.promise;
}

Youtube.prototype.stop = function() {
  this.logger.info("Youtube::stop");

  return this.commandRouter.volumioStop();
}

Youtube.prototype.explodeUri = function(videoId) {
  var self = this;
  this.logger.info("Youtube::explodeUri " + "https://youtube.com/oembed?format=json&url=" + videoId);

  var deferred = libQ.defer();


  yt.videos.list({
    auth: ytapi_key,
    part: "snippet,contentDetails",
    id: videoId
  }, function(err, res) {
    if (err) {
      //Holy crap, something went wrong :/
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else if (res.items.length == 0) {
      deferred.reject(new Error("Video is not valid"));
    } else {
      self.logger.info("Youtube -> " + JSON.stringify(res));
      deferred.resolve({
        uri: videoId,
        service: 'youtube',
        name: res.items[0].snippet.title,
        title: res.items[0].snippet.title,
        artist: "Youtube",
        type: 'track',
        albumart: res.items[0].snippet.thumbnails.default.url,
        duration: dur.toSeconds(dur.parse(res.items[0].contentDetails.duration)),
        trackType: "YouTube",
        samplerate: '44 KHz',
        bitdepth: '24 bit'
      });
    }
  });
  return deferred.promise;
};

Youtube.prototype.getState = function() {
  this.logger.info("Youtube::getState");
};

Youtube.prototype.addToBrowseSources = function() {
  var data = {
    name: 'Youtube',
    uri: 'youtube',
    plugin_type: 'music_service',
    plugin_name: 'youtube'
  };
  this.commandRouter.volumioAddToBrowseSources(data);
  this.commandRouter.volumioAddToBrowseSources(data);
};

Youtube.prototype.clearAddPlayTrack = function(track) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::clearAddPlayTrack');

  var deferred = libQ.defer();
  ytdl.getInfo("https://youtube.com/watch?v=" + track.uri, {
    filter: "audioonly"
  }, function(err, info) {
    if (err) {
      console.log("Error opening Youtube stream, video is probably not valid.");
    } else {
      self.mpdPlugin.sendMpdCommand('stop', [])
        .then(function() {
          return self.mpdPlugin.sendMpdCommand('clear', []);
        })
        .then(function(values) {
          return self.mpdPlugin.sendMpdCommand('load "' + info["formats"][0]["url"] + '"', []);
        })
        .fail(function(data) {
          return self.mpdPlugin.sendMpdCommand('add "' + info["formats"][0]["url"] + '"', []);
        })
        .then(function() {
          //self.commandRouter.stateMachine.setConsumeUpdateService('youtube', true);
          //this.mpdPlugin.ignoreUpdate(true);
          self.mpdPlugin.clientMpd.on('system', function(status) {
            var timeStart = Date.now();
            self.logger.info('Youtube Status Update: ' + status);
            self.mpdPlugin.getState().then(function(state) {
              state.trackType = "Fucking Youtube!!!!";
              return self.commandRouter.stateMachine.syncState(state, "youtube");
            });
          });
          return self.mpdPlugin.sendMpdCommand('play', []).then(function() {
            self.commandRouter.pushConsoleMessage("Youtube::After Play");
            return self.mpdPlugin.getState().then(function(state) {
              state.trackType = "Fucking Youtube!!!!";
              self.commandRouter.pushConsoleMessage("Youtube: " + JSON.stringify(state));
              return self.commandRouter.stateMachine.syncState(state, "youtube");
            });
          });
        })
        .fail(function(e) {
          return defer.reject(new Error());
        });
    }
  });
}

Youtube.prototype.stop = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::stop');

  //self.commandRouter.stateMachine.setConsumeUpdateService('youtube');
  return self.mpdPlugin.stop().then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });
};


Youtube.prototype.pause = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::pause');

  // TODO don't send 'toggle' if already paused
  //self.commandRouter.stateMachine.setConsumeUpdateService('youtube');
  return self.mpdPlugin.pause().then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });
};


Youtube.prototype.resume = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::resume');

  // TODO don't send 'toggle' if already playing
  //self.commandRouter.stateMachine.setConsumeUpdateService('youtube');
  return self.mpdPlugin.resume().then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });
};

Youtube.prototype.seek = function(position) {
  var self = this;
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::seek');

  //self.commandRouter.stateMachine.setConsumeUpdateService('youtube', true);
  return self.mpdPlugin.seek(position);
};

Youtube.prototype.next = function() {
  var self = this;
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::next');
  return this.mpdPlugin.sendMpdCommand('next', []).then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });;
};

Youtube.prototype.previous = function() {
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::previous');
  return this.mpdPlugin.sendMpdCommand('previous', []).then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });;
};

Youtube.prototype.prefetch = function(nextTrack) {
  var self = this;
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::prefetch');

  ytdl.getInfo("https://youtube.com/watch?v=" + nextTrack.uri, {
    filter: "audioonly"
  }, function(err, info) {
    if (err) {
      console.log("Error opening Youtube stream, video is probably not valid.");
    } else {
      return self.mpdPlugin.sendMpdCommand('add "' + info["formats"][0]["url"] + '"', [])
        .then(function() {
          return self.mpdPlugin.sendMpdCommand('consume 1', []);
        });
    }
  });
};

Youtube.prototype.updateSettings = function(data) {
  var self = this;
  var resultsLimit = data['results_limit'];

  if (resultsLimit <= 0) {
    self.commandRouter.pushToastMessage('error', 'Saving settings failed', 'Results limit must be greater than 0 (zero).');
  } else {
    self.config.set('results_limit', resultsLimit);
    self.resultsLimit = resultsLimit;
    self.commandRouter.pushToastMessage('error', 'Settings saved', 'Settings successsfully updated.');
  }

  return libQ.resolve();
};
