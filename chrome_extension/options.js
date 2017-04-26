document.getElementById("submit").onclick = function(){
  var addr = document.getElementById("addr").value;
  var state = document.getElementById("state");

  var connected = false;

  var socket = io("http://" + addr);
  console.log(addr);
  socket.on("connect", function(){
    connected = true;
    state.innerHTML = "Check successfull, saving...";
    chrome.storage.local.set({
      "addr": addr
    }, () => {
      state.innerHTML = "Right, saved!"
      setTimeout(() => {
        state.innerHTML = "";
      }, 3000);
    });
  });
  state.innerHTML = "Checking configuration...";
  setTimeout(() => {
    if(!connected){
      state.innerHTML = "Configuration check failed :(";
      socket.close();
    }
  }, 10000);


  return false;
}
