YouTube Playback for Volumio
===================================

Usage:
--------

#### NOTE: This plugin is in development and the API will strongly change in the upcoming updates.

### Adding a youtube video to the queue:

- Via __socket.io__ to volumio server:  
    Event: __callMethod__  
    Content:
    ```json
    {
        "endpoint" : "music_service/youtube",
        "method" : "add",
        "data" : "https://www.youtube.com/watch?v=vGZNdT72FsU"
    }

    ```

- Via direct method call to ```PiYoutube.add("https://www.youtube.com/watch?v=vGZNdT72FsU")```

--------------------------------------------------------------------------------


Features, ETAs:
-------------

- [x] Add youtube videos to queue
- [x] Add youtube playlists to queue - 2days
- [x] Chrome Extension for sending video to the volumio directly from your browser
- [ ] Import playlist from youtube (updating it on youtube causes it to update locally as well) - 5days
- [ ] WebUI Integration - 1week
- [ ] Mobile app integration - 2weeks



--------------------------------------------------------------------------------
Authors:
----------

- [Cristian Pintea](http://pintea.net)
- Torello Querci
- [Stefan Lässer](https://github.com/sla89)
