PiYoutube :: YouTube Playback for Volumio
===================================

Usage:
--------

- Via __socket.io__ to volumio server:  
    Event: __callMethod__  
    Content: ```{ endpoint : "music_service/piyq", method : "addFromVideo", data : "$YOUTUBE-URL$"}```

- Via direct method call to __PiYoutube.addFromVideo__(youtube_url)

--------------------------------------------------------------------------------

Coming soon:
-------------

- Adding whole YouTube playlists at a time
- Potentially mobile app integration

--------------------------------------------------------------------------------
Authors:
----------

- [Cristian Pintea](http://pintea.net)
- Torello Querci
