'use strict';

var http = require('http');
var spawn = require('child_process').spawn;
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
var ytdl = require('ytdl-core');
var libQ = require('kew');
var path = require('path');
var gapis = require('googleapis');
var request = require('request');
var dur = require("iso8601-duration");
var OAuth2Client = gapis.auth.OAuth2;
var querystring = require('querystring');
var https = require('https');

var secrets = require('./auth.json');
var token = require('./authToken.json');

var ytapi_key = "AIzaSyAl1Xq9DwdE_KD4AtPaE4EJl3WZe2zCqg4";

module.exports = Youtube;

function Youtube(context) {
  var self = this;

  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.context.logger;
  self.configManager = self.context.configManager;
  self.addQueue = [];
  self.trendResults = [];
  self.activitiesResults = [];
  self.searchResults = [];
  self.likedVideos = [];
  self.playlists = [];
  self.playlistItems = [];
  self.state = {};
  self.stateMachine = self.commandRouter.stateMachine;

  self.yt = gapis.youtube({
    version: 'v3',
    auth: ytapi_key
  });
}

Youtube.prototype.onVolumioStart = function() {
  var self = this;

  var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
  self.configFile = configFile;

  self.config = new(require('v-conf'))();
  self.config.loadFile(configFile);
  self.resultsLimit = self.config.get('results_limit');

  self.getAccessToken();

  if (self.isAccessGranted()) {
    self.accessToken = token;
    self.refreshAuthToken();
    self.updateYtApiAccessToken();
  }

  return libQ.resolve();
};

Youtube.prototype.onStart = function() {
  var self = this;
  //Getting the mdp plugin
  self.mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
  self.logger.info("Youtube::onStart Adding to browse sources");
  self.addToBrowseSources();
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
  var lang_code = self.commandRouter.sharedVars.get('language_code');
  return self.commandRouter.i18nJson(path.join(__dirname, 'i18n', 'strings_' + lang_code + '.json'),
      __dirname + '/i18n/strings_en.json',
      __dirname + '/UIConfig.json')
    .then(function(uiconf) {
      if (self.accessToken != null) {
        uiconf.sections[0].description = 'Volumio has access to your YouTube account. We will only use it to display videos related to your account!';
        uiconf.sections[0].content = [];
      } else {
        self.pollPermissions();
        uiconf.sections[0].description = uiconf.sections[0].description.replace('{0}', self.accessData.verification_url);
        uiconf.sections[0].content[0].value = self.accessData.user_code;
      }

      uiconf.sections[1].content[0].value = self.config.get('results_limit');
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
  self.logger.info("Youtube::pause");

  return self.commandRouter.volumioPause();
};


Youtube.prototype.add = function(vuri) {
  var self = this;
  self.logger.info("Youtube::add");

  if (vuri.includes("list=")) {
    var playlistId = decodeURI(vuri.toString()).split("list=")[1].split("&")[0];
    self.addPlaylist(playlistId);
  } else {
    var regex = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/ig;
    var videoId = vuri.replace(regex, "$1");
    self.commandRouter.pushConsoleMessage(vuri + " kkk " + videoId);
    self.addVideo(videoId);
  }
};

Youtube.prototype.addVideo = function(videoId) {
  var self = this;
  self.logger.info("Youtube::addVideo");

  return self.commandRouter.addQueueItems([{
    uri: videoId,
    service: "youtube"
  }]);
}

Youtube.prototype.addPlaylist = function(playlistId, pageToken) {
  var self = this;
  self.logger.info("Youtube::addPlaylist " + playlistId);

  //Contact Youtube Data API v3 for the list of videos in the playlist
  var request = {
    part: "snippet",
    maxResults: 50,
    playlistId: playlistId
  };

  if (pageToken != undefined)
    request.pageToken = pageToken;

  self.yt.playlistItems.list(request, function(err, res) {
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
  var self = this;
  self.logger.info("Youtube::stop");
  return self.commandRouter.volumioStop();
}

Youtube.prototype.handleBrowseUri = function(uri) {
  var self = this;
  self.logger.info('handleBrowseUri: ' + uri);
  self.commandRouter.pushToastMessage('info', 'YouTube', 'Fetching data from YouTube. This may take some time.');

  if (uri.startsWith('youtube')) {
    if (uri === 'youtube') { //root
      return self.getRootContent();
    } else if (uri.startsWith('youtube/root/playlists')) {
      return self.getUserPlaylists();
    } else if (uri.startsWith('youtube/root/likedVideos')) {
      return self.getUserLikedVideos();
    } else if (uri.startsWith('youtube/playlist/')) {
      return self.getPlaylistItems(uri.split('/').pop());
    }
  }

  return libQ.reject();
};

Youtube.prototype.explodeUri = function(uri) {
  var self = this;
  var deferred = libQ.defer();

  if (uri.startsWith('youtube/playlist/')) {
    self.logger.info("Youtube::explodeUri Playlist: " + uri);

    self.addPlaylist(uri.split('/').pop());
  } else {
    self.logger.info("Youtube::explodeUri " + "https://youtube.com/oembed?format=json&url=" + uri);


    self.yt.videos.list({
      part: "snippet,contentDetails",
      id: uri
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
          uri: uri,
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
  }

  return deferred.promise;
};

Youtube.prototype.search = function(query) {
  var self = this;
  if (!query || !query.value || query.value.length === 0) {
    return libQ.resolve([]);
  }

  self.commandRouter.pushToastMessage('info', 'YouTube', 'Fetching data from YouTube. This may take some time.');
  return self.doSearch(query.value);
};

Youtube.prototype.getState = function() {
  var self = this;
  self.logger.info("Youtube::getState");
};

Youtube.prototype.addToBrowseSources = function() {
  var self = this;
  self.commandRouter.volumioAddToBrowseSources({
    name: 'Youtube',
    uri: 'youtube',
    plugin_type: 'music_service',
    plugin_name: 'youtube'
  });
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
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::seek');

  //self.commandRouter.stateMachine.setConsumeUpdateService('youtube', true);
  return self.mpdPlugin.seek(position);
};

Youtube.prototype.next = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::next');
  return self.mpdPlugin.sendMpdCommand('next', []).then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });;
};

Youtube.prototype.previous = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::previous');
  return self.mpdPlugin.sendMpdCommand('previous', []).then(function() {
    return self.mpdPlugin.getState().then(function(state) {
      state.trackType = "Fucking Youtube!!!!";
      return self.commandRouter.stateMachine.syncState(state, "youtube");
    });
  });;
};

Youtube.prototype.prefetch = function(nextTrack) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Youtube::prefetch');

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

Youtube.prototype.getRootContent = function() {
  var self = this;

  if (!self.isAccessGranted()) {
    self.commandRouter.pushToastMessage('info', 'Volumio has no permissions', 'Grant Volumio access to your YouTube account to access your playlists.');
    return self.getTrend();
  }

  var promise = self.getActivities()
    .then(function(activities) {
      activities.navigation.lists.unshift({
        title: 'My Youtube',
        icon: 'fa fa-youtube',
        availableListViews: ['list', 'grid'],
        items: [{
            service: 'youtube',
            type: 'folder',
            title: 'Channels',
            icon: 'fa fa-folder-open-o',
            uri: 'youtube/my/channels'
          },
          {
            service: 'youtube',
            type: 'folder',
            title: 'My Playlists',
            icon: 'fa fa-folder-open-o',
            uri: 'youtube/root/playlists'
          },
          {
            service: 'youtube',
            type: 'folder',
            title: 'Liked Videos',
            icon: 'fa fa-folder-open-o',
            uri: 'youtube/root/likedVideos'
          }
        ]
      });
      return activities;
    });

  return promise;
}

Youtube.prototype.getUserLikedVideos = function(pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    part: "snippet",
    myRating: 'like',
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.videos.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      self.likedVideos = self.likedVideos.concat(self.processYouTubeResponse(res.items, self.likedVideos.length));

      if (res.nextPageToken != undefined && self.canLoadFurtherVideos(self.likedVideos.length)) {
        self.getUserLikedVideos(res.nextPageToken, deferred);
      } else {
        if (self.likedVideos.length > 0) {
          var items = self.likedVideos.slice(0);
          self.likedVideos = []; //clean up

          deferred.resolve({
            navigation: {
              prev: {
                uri: 'youtube'
              },
              lists: [{
                title: 'Liked Videos',
                icon: 'fa fa-youtube',
                availableListViews: ['list', 'grid'],
                items: items
              }]
            }
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}

Youtube.prototype.getUserPlaylists = function(pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    part: "snippet",
    mine: true,
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.playlists.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      self.playlists = self.playlists.concat(self.processYouTubeResponse(res.items, self.playlists.length));

      if (res.nextPageToken != undefined && self.canLoadFurtherVideos(self.playlists.length)) {
        self.getUserPlaylists(res.nextPageToken, deferred);
      } else {
        if (self.playlists.length > 0) {
          var items = self.playlists.slice(0);
          self.playlists = []; //clean up

          deferred.resolve({
            navigation: {
              prev: {
                uri: 'youtube'
              },
              lists: [{
                title: 'My Youtube playlists',
                icon: 'fa fa-youtube',
                availableListViews: ['list', 'grid'],
                items: items
              }]
            }
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}
Youtube.prototype.getActivities = function(pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    part: "snippet",
    home: true,
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.activities.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      self.activitiesResults = self.activitiesResults.concat(self.processYouTubeResponse(res.items, self.activitiesResults.length));

      if (res.nextPageToken != undefined && self.canLoadFurtherVideos(self.activitiesResults.length)) {
        self.getActivities(res.nextPageToken, deferred);
      } else {
        if (self.activitiesResults.length > 0) {
          var items = self.activitiesResults.slice(0);
          self.activitiesResults = []; //clean up

          deferred.resolve({
            navigation: {
              prev: {
                uri: '/'
              },
              lists: [{
                title: 'Youtube activities',
                icon: 'fa fa-youtube',
                availableListViews: ['list', 'grid'],
                items: items
              }]
            }
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}

Youtube.prototype.getTrend = function(pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    chart: 'mostPopular',
    part: "snippet",
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.videos.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      self.trendResults = self.trendResults.concat(self.processYouTubeResponse(res.items, self.trendResults.length));

      if (res.nextPageToken != undefined && self.canLoadFurtherVideos(self.trendResults.length)) {
        self.getTrend(res.nextPageToken, deferred);
      } else {
        if (self.trendResults.length > 0) {
          var items = self.trendResults.slice(0);
          self.trendResults = []; //clean up

          deferred.resolve({
            navigation: {
              prev: {
                uri: '/'
              },
              lists: [{
                title: 'Youtube trendy videos',
                icon: 'fa fa-youtube',
                availableListViews: ['list', 'grid'],
                items: items
              }]
            }
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}

Youtube.prototype.doSearch = function(query, pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    q: query,
    part: "snippet",
    type: "video,playlist,channel",
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.search.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      self.searchResults = self.searchResults.concat(self.processYouTubeResponse(res.items, self.searchResults.length));

      if (res.nextPageToken != undefined && self.canLoadFurtherVideos(self.searchResults.length)) {
        self.doSearch(query, res.nextPageToken, deferred);
      } else {
        if (self.searchResults.length > 0) {
          var items = self.searchResults.slice(0);
          self.searchResults = []; //clean up

          deferred.resolve({
            title: 'Youtube (found ' + items.length + ' videos)',
            icon: 'fa fa-youtube',
            availableListViews: ['list', 'grid'],
            items: items
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}

Youtube.prototype.getPlaylistItems = function(playlistId, pageToken, deferred) {
  var self = this;

  if (deferred == null) {
    deferred = libQ.defer();
  }

  var request = {
    playlistId: playlistId,
    part: "snippet",
    maxResults: 50
  };

  if (pageToken != undefined) {
    request.pageToken = pageToken;
  }

  self.yt.playlistItems.list(request, function(err, res) {
    if (err) {
      self.logger.error(err.message + "\n" + err.stack);
      deferred.reject(err);
    } else {
      // always load all playlist items
      // dont call processYouTubeResponse() here!
      var videos = res.items;
      for (var i = 0; i < videos.length; i++) {
        self.playlistItems = self.playlistItems.concat(self.parseVideoData(videos[i]));
      }

      if (res.nextPageToken != undefined) {
        self.getPlaylistItems(playlistId, res.nextPageToken, deferred);
      } else {
        if (self.playlistItems.length > 0) {
          var items = self.playlistItems.slice(0);
          self.playlistItems = []; //clean up

          deferred.resolve({
            navigation: {
              prev: {
                uri: 'youtube'
              },
              lists: [{
                title: 'Youtube Playlist - showing ' + items.length + ' videos',
                icon: 'fa fa-youtube',
                availableListViews: ['list', 'grid'],
                items: items
              }]
            }
          });
        } else {
          deferred.resolve({});
        }
      }
    }
  });

  return deferred.promise;
}

Youtube.prototype.processYouTubeResponse = function(videos, numLoadedVideos) {
  var self = this;
  var loadVideos = self.calcLoadVideoLimit(numLoadedVideos, videos.length);
  var parsedVideos = [];
  for (var i = 0; i < loadVideos; i++) {
    parsedVideos.push(self.parseVideoData(videos[i]));
  }

  return parsedVideos;
}

Youtube.prototype.canLoadFurtherVideos = function(numOfCurrLoadedVideos) {
  var self = this;
  return self.resultsLimit > numOfCurrLoadedVideos;
}

Youtube.prototype.calcLoadVideoLimit = function(numLoadedVideos, numAvailableVideos) {
  var self = this;
  var loadVideos = self.canLoadFurtherVideos(numLoadedVideos) ?
    self.resultsLimit - numLoadedVideos : 0;

  //don't load more videos than available
  if (loadVideos > numAvailableVideos) {
    loadVideos = numAvailableVideos;
  }

  return loadVideos;
}

Youtube.prototype.parseVideoData = function(videoData) {
  var albumart;
  if (videoData.snippet.thumbnails != null) {
    //try to get highest quality image first
    if (videoData.snippet.thumbnails.high !== null) {
      albumart = videoData.snippet.thumbnails.high.url;
    } else if (videoData.snippet.thumbnails.medium !== null) {
      albumart = videoData.snippet.thumbnails.medium.url;
    } else if (videoData.snippet.thumbnails.default !== null) {
      albumart = videoData.snippet.thumbnails.default.url;
    }
  }

  var url, type;

  // TODO rework by reusing same code snippets by extracting them to methods
  if (videoData.kind) {
    switch (videoData.kind) {
      case 'youtube#video':
        url = videoData.id;
        type = 'song';
        break;
      case 'youtube#searchResult':
        switch (videoData.id.kind) {
          case 'youtube#video':
            url = videoData.id.videoId;
            type = 'song';
            break;
          case 'youtube#playlist':
            url = 'youtube/playlist/' + videoData.id.playlistId;
            type = 'folder';
            break;
          case 'youtube#channel':
            url = 'youtube/playlist/' + videoData.id.channelId;
            type = 'folder';
            break;
          default:
            url = 'youtube/unhandled-search-kind: ' + videoData.id.kind;
            break;
        }
        break;
      case 'youtube#playlist':
        url = 'youtube/playlist/' + videoData.id;
        type = 'folder';
        break;
      case 'youtube#channel':
        url = 'youtube/channel/' + videoData.id;
        type = 'folder';
        break;
      case 'youtube#playlistItem':
        url = videoData.snippet.resourceId.videoId;
        type = 'song';
        break;
      case 'youtube#subscription':
        // TODO handle this:
        // 		"snippet": {
        // "publishedAt": "2017-05-08T23:37:10.000Z",
        // "title": "KMVT",
        // "description": "KMVT 15, the local non-profit 501(c)(3) award winning community media center, has been providing training, education and equipment to the residents of Mountain View since 1982. Today, KMVT 15 provides those same services to Los Altos, Cupertino, Sunnyvale and Foster City. KMVT 15 continues to be a much needed service and resource, linking the community to the latest technologies of communication.\n\nThe recipient of many national and regional awards, KMVT 15's mission is to provide media education, hands-on training, and civic engagement. It serves as a resource to narrow the digital divide through the use of technology, and provides the community with the tools to create media and utilize technology in a socially responsible manner.\n\nWe are the Voice of the Community!\nKMVT 15 Silicon Valley Community Media & Television is YOUR local TV station and voice.",
        // "resourceId": {
        // 	"kind": "youtube#channel",
        // 	"channelId": "UCuMbNv6DYU4XiKrMJpfyV-Q"
        // },
        break;
      default:
        url = 'youtube/unhandled-kind: ' + videoData.kind;
        break;
    }
  }
  return {
    service: 'youtube',
    type: type,
    title: videoData.snippet.title,
    // TODO: no channel title in subscriptions and
    artist: videoData.snippet.channelTitle,
    albumart: albumart,
    uri: url
  };
}

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

Youtube.prototype.getAccessToken = function() {
  var self = this;
  var deferred = libQ.defer();

  var postData = querystring.stringify({
    'client_id': secrets.volumio.client_id,
    'scope': 'https://www.googleapis.com/auth/youtube.readonly'
  });

  var options = {
    host: 'accounts.google.com',
    path: '/o/oauth2/device/code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // Set up the request
  var codeReq = https.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      self.accessData = JSON.parse(chunk);
      deferred.resolve(self.accessData);
    });
  });

  codeReq.on('error', (e) => {
    deferred.reject(e);
  });

  codeReq.write(postData);
  codeReq.end();

  return deferred.promise;
}

Youtube.prototype.pollPermissions = function() {
  var self = this;
  var deferred = libQ.defer();

  var postData = querystring.stringify({
    'client_id': secrets.volumio.client_id,
    'client_secret': secrets.volumio.client_secret,
    'code': self.accessData.device_code,
    'grant_type': 'http://oauth.net/grant_type/device/1.0'
  });

  var options = {
    host: 'www.googleapis.com',
    path: '/oauth2/v4/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // Set up the request
  var codeReq = https.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      var data = JSON.parse(chunk);

      if (res.statusCode == '200') {
        fs.writeFile(path.join(__dirname, 'authToken.json'), chunk, function(err) {
          if (err) {
            self.logger.error("Could not save the authentication token!");
          }
        });

        self.accessToken = data;
        self.commandRouter.pushToastMessage('success', 'Access granted', 'Volumio has now access to your YouTube account.');
        self.updateYtApiAccessToken();

        deferred.resolve(data);
      } else if (res.statusCode == '400') {
        //Authorization pending
        self.logger.info('Authorization pending, polling again in ' + self.accessData.interval + ' seconds.');
        // add one second to polling interval to avoid Polling too frequently error
        setTimeout(self.pollPermissions.bind(self), self.accessData.interval * 1000 + 1000);
      } else {
        self.commandRouter.pushToastMessage('error', data.error, data.error_description);
        deferred.reject(new Error(data.error + ': ' + data.error_description));
      }
    });
  });

  codeReq.on('error', (e) => {
    deferred.reject(e);
  });

  codeReq.write(postData);
  codeReq.end();

  return deferred.promise;
}

Youtube.prototype.refreshAuthToken = function() {
  var self = this;
  var deferred = libQ.defer();

  var postData = querystring.stringify({
    'client_id': secrets.volumio.client_id,
    'client_secret': secrets.volumio.client_secret,
    'refresh_token': self.accessToken.refresh_token,
    'grant_type': 'refresh_token'
  });

  var options = {
    host: 'www.googleapis.com',
    path: '/oauth2/v4/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // Set up the request
  var codeReq = https.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      var data = JSON.parse(chunk);

      if (res.statusCode == '200') {
        self.accessToken.expires_in = data.expires_in;
        self.accessToken.access_token = data.access_token;

        fs.writeFile(path.join(__dirname, 'authToken.json'), JSON.stringify(self.accessToken), function(err) {
          if (err) {
            self.logger.error('Could not write authToken file:' + err);
          }
        });

        setTimeout(self.refreshAuthToken.bind(self), self.accessToken.expires_in * 1000);
        self.updateYtApiAccessToken();

        self.logger.info('refresh token again in seconds: ' + self.accessToken.expires_in);

        deferred.resolve({});
      } else {
        self.logger.info('Clearing authentication file!');

        self.commandRouter.pushToastMessage('error', data.error, data.error_description);
        fs.writeFile(path.join(__dirname, 'authToken.json'), JSON.stringify({}), function(err) {
          if (err) {
            self.logger.error('Could not write authToken file:' + err);
          }
        });
        deferred.reject(new Error(data.error + ': ' + data.error_description));
      }
    });
  });

  codeReq.on('error', (e) => {
    deferred.reject(e);
  });

  codeReq.write(postData);
  codeReq.end();

  return deferred.promise;
}

Youtube.prototype.updateYtApiAccessToken = function() {
  var self = this;

  var oauth2Client = new OAuth2Client(
    secrets.volumio.client_id,
    secrets.volumio.client_secret,
    secrets.volumio.redirect_uris[0]
  );

  oauth2Client.setCredentials(self.accessToken);

  self.yt = gapis.youtube({
    version: 'v3',
    auth: oauth2Client
  });
}

Youtube.prototype.isAccessGranted = function() {
  return token && token.refresh_token && token.access_token;
}
