console.log("Youtube Watch");

if(document.readyState === "complete"){
  console.log("Loaded");
  var a = document.createElement("A");
  a.href = "#";
  a.onclick = function(){alert("Fuck off!!")};
  a.className = "yt-uix-button   yt-uix-sessionlink yt-uix-button-opacity yt-uix-button-size-default yt-uix-button-has-icon yt-uix-tooltip yt-uix-button-empty";
  var span = document.createElement("SPAN");
  span.className = "yt-uix-button-icon-wrapper";
  var img = document.createElement("IMG");
  img.src = chrome.extension.getURL("icon.png");
  img.className = "yt-uix-button-icon";
  img.style.position = "relative";
  img.style.height = "100%";
  span.appendChild(img);
  a.appendChild(span);
  var masthead = document.getElementById("yt-masthead-user");
  //masthead.insertBefore(a, masthead.childNodes[0]);
  console.log("Done");
}else{
  document.addEventListener("load", function(){
    console.log("Loaded");
    var a = document.createElement("A");
    a.href = "#";
    a.onclick = function(){alert("Fuck off!!")};
    var img = document.createElement("IMG");
    img.src = chrome.extension.getURL("icon.png");
    a.appendChild(img);
    var textnode = document.createTextNode("Water");
    a.appendChild(textnode);
    var masthead = document.getElementById("yt-masthead-user");
    masthead.insertBefore(a, masthead.childNodes[0]);
    console.log("Done");
  });
}





function isYoutubeUrl(url){
  var valid = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/?.+$/;
  return valid.test(url);
}
