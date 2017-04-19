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
        endpoint : "music_service/youtube",
        method : "addFromVideo",
        data : "https://www.youtube.com/watch?v=vGZNdT72FsU"
    }
    
    ```

- Via direct method call to ```PiYoutube.addFromVideo("https://www.youtube.com/watch?v=vGZNdT72FsU")```

--------------------------------------------------------------------------------


Features, ETAs:
-------------

- [x] Add youtube videos to queue
- [ ] Add youtube playlists to queue - 2days
- [ ] Import playlist from youtube (updating it on youtube causes it to update locally as well) - 5days
- [ ] WebUI Integration - 1week
- [ ] Mobile app integration - 2weeks



--------------------------------------------------------------------------------
Authors:
----------

- [Cristian Pintea](http://pintea.net)
- Torello Querci
