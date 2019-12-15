chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.function == "seek") {
        var s = document.createElement("script");
        s.type="text/javascript";
        s.text = "var p = document.getElementById('movie_player'); p.seekTo(" + request.seek_time + "); p.playVideo();";
        document.head.appendChild(s);
    }
    sendResponse("Search Received.");
});
