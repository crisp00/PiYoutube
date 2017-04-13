PiYoutube :: YouTube Playback for Volumio
===================================

Usage:

- Via socket.io to volumio server:  
  Event: __callMethod__  
  Content: {endpoint:"music_service/piyq",method:"addFromVideo",data:"__$YOUTUBE-URL$__"}

- Via direct method call to __PiYoutube.addFromVideo(youtube_url)__

--------------------------------------------------------------------------------

Coming soon:

- Adding whole YouTube playlists at a time
- Potentially mobile app integration

--------------------------------------------------------------------------------
Authors:
----------

- [Cristian Pintea](http://pintea.net)
- Torello Querci
