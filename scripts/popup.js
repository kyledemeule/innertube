chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url;
    u = new URL(url);
    if (u.hostname == "www.youtube.com" || u.hostname == "youtube.com") {
      $('#not-youtube-warning').hide();
      $('#search-content').show();
    } else {
      $('#not-youtube-warning').show();
      $('#search-content').hide();
    }
    usp = new URLSearchParams(u.search);
    video_id = usp.get('v');
    console.log(video_id);
});
