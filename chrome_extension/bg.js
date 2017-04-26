console.log("Bg Start");
var connected = false;

chrome.storage.local.get("addr", (items) => {
  if(items.addr != undefined){
    var fail = false;
    var socket = on("http://" + items.addr);
    socket.on("connect", () => {
      console.log("connected on " + items.addr);
      connected = true;
    });
    setTimeout(() => {
      if(!connected){
        console.log("Connection timed out for " + items.addr);
        socket.close();
        showMissingAddressNotification();
      }
    }, 10000);
  }else{
    showMissingAddressNotification();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  chrome.storage.local.get("addr", (items) => {
    if(items.addr != undefined){
      var fail = false;
      var socket = on("http://" + items.addr);
      socket.on("connect", () => {
        console.log("connected on " + items.addr);
        connected = true;
      });
      setTimeout(() => {
        if(!connected){
          console.log("Connection timed out for " + items.addr);
          socket.close();
          showMissingAddressNotification();
        }
      }, 10000);
    }else{
      showMissingAddressNotification();
    }
  });
});


function showMissingAddressNotification(){
  chrome.notifications.create({"title": "Volumio Youtube Misconfiguration",
                                "message": "Your volumio address is missing or wrong. Check the extension's settings.",
                                "type": "basic",
                                "iconUrl": "icon.png",
                                });
}





// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: '(http|https):\\/\\/(www\\.)?(youtube\\.com\\/watch\\?v=|youtu\\.be\\/).*' },
          })
        ],
        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});
