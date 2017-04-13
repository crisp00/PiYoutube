PiYoutube :: YouTube Playback for Volumio
===================================

Usage:

- Via socket.io to volumio server:  
  Event: callMethod  
  Content: {endpoint:"music_service/piyq",method:"addFromVideo",data:"$YOUTUBE-URL$"}

- Via direct method call to PiYoutube.addFromVideo(youtube_url)


Coming soon:
- Adding whole YouTube playlists at a time
- Potentially mobile app integration
