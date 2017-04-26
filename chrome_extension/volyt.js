document.getElementById("send").onclick = () => {
  chrome.storage.local.get("addr", (obj) => {
    if(obj.addr != undefined){
      console.log("Connecting to " + obj.addr);
      var connected = false;
      var socket = io("http://" + obj.addr);
      socket.on("connect", () => {
        console.log("Connected! Sending video..");
        connected = true;
        chrome.tabs.query({
            active: true,
            lastFocusedWindow: true
        }, function(tabs) {
            // and use that tab to fill in out title and url
            var tab = tabs[0];
            socket.emit("callMethod", {endpoint:"music_service/youtube",method:"add",data: tab.url});
            console.log("Sent!");
        });
      });
      setTimeout(() => {
        if(!connected){
          socket.close();
          console.log("Connection to " + obj.addr + " faile: Timeout");
        }
      }, 10000);
    }else{
      showMissingAddressNotification();
    }
  });
}


function showMissingAddressNotification(){
  chrome.notifications.create({"title": "Volumio Youtube Misconfiguration",
                                "message": "Your volumio address is missing or wrong. Check the extension's settings.",
                                "type": "basic",
                                "iconUrl": "icon.png",
                                });
}
