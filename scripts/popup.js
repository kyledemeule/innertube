var state = {
  "access_token": "",
  "captions": {},
  "indexes": {},
  "url": "",
  "tab_id": ""
};

var auth = function() {
  chrome.identity.getAuthToken({interactive: true}, function(token) {
    state["access_token"] = token;
  });
}

window.onload = auth();

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
  state["url"] = tabs[0].url;
  state["tab_id"] = tabs[0].id;

  $("#search-form").submit(function(event) {
      event.preventDefault();
      var search_term = $('#searchterm').val();
      populate_search_results(search_term);
  });


  $('#searchterm').on('input', function() {
    var search_term = $('#searchterm').val();
    if(search_term == "" ) {
      $('#search-results').empty();
    $('#search-results').append("<dt>Enter a search term.</dt>");
    } else {
      populate_search_results(search_term);
    }
  });

  $('body').on('click', 'a.search-result', function () {
      event.preventDefault();
      var seek_time = $(this).attr("value");
      chrome.tabs.sendMessage(state["tab_id"], {function: "seek", seek_time: seek_time}, function(response) {});
  });

  //load saved captions
  chrome.storage.local.get(['captions'], function(result) {
    if (result["captions"] == undefined) {
      state["captions"] = {};
    } else {
      state["captions"] = result["captions"];
    }
    main();
  });

});

var main = function() {
  hide_all();

  var on_youtube_video_page = check_url();
  if (!on_youtube_video_page) {
    set_warning("This extension only works on a video page on www.youtube.com.");
    return 1;
  }

  var caption_is_downloaded = check_caption();
  if (!caption_is_downloaded) {
    $('#loading-page').show();
    get_caption(state["video_id"]);
    return
  }
  var caption_is_valid = check_valid_caption();
  if (!caption_is_valid) {
    set_warning("This videos creator has disabled third party caption access.");
    return
  }
  var index_is_built = check_index();
  if (!index_is_built) {
    $('#loading-page').show();
    build_index();
    return
  }
  $('#search-page').show();
}

var hide_all = function () {
  $('#loading-page').hide();
  $('#search-page').hide();
  $('#error-page').hide();
  $('#warning-page').hide();
};

var set_warning = function(warning) {
  hide_all();
  $('#warning-message').html(warning);
  $('#warning-page').show();
}

var check_url = function () {
    var url = state["url"];
    u = new URL(url);
    if (u.hostname == "www.youtube.com" || u.hostname == "youtube.com") {
      usp = new URLSearchParams(u.search);
      if(usp.get('v')) {
        video_id = usp.get('v');
        state["video_id"] = video_id;
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
};

var check_caption = function() {
  if("captions" in state && state["video_id"] in state["captions"]) {
    return true;
  } else {
    return false;
  }
}

var check_valid_caption = function() {
  if("captions" in state && state["video_id"] in state["captions"] && state["captions"][state["video_id"]].length != 0) {
    return true;
  } else {
    return false;
  }
}

var get_caption = function(video_id) {
  console.log("api.youtube.captions.list")
  $.ajax({
    type: "GET",
    url: "https://www.googleapis.com/youtube/v3/captions?videoId=" + video_id + "&part=snippet",
    headers: {
      "Authorization": "Bearer " + state.access_token
    },
    success: function (response){
      var captions = response.items;
      // grab the first english caption
      for(i = 0; i < captions.length; i++) {
        if(captions[i].snippet.language == "en") {
          download_caption(video_id, captions[i].id);
          return 1;
        }
      }
      set_warning("This video has no english captions.");
      return 0;
    },
    error: function (qXHR, textStatus, errorThrown) {
      if(qXHR.status == 401) {
        set_warning("Credentials are invalid.");
      } else {
        hide_all();
        $('#error-page').show();
      }
    }
  });
}

var download_caption = function(video_id, caption_id) {
  console.log("api.youtube.captions.download")
  $.ajax({
    type: "GET",
    url: "https://www.googleapis.com/youtube/v3/captions/" + caption_id,
    headers: {
      "Authorization": "Bearer " + state.access_token
    },
    data: {
      tfmt: "sbv"
    },
    success: function (response){
      handle_caption_response(response);
      return 1;
    },
    error: function (qXHR, textStatus, errorThrown) {
      if(qXHR.status == 401) {
        set_warning("Credentials are invalid.");
      } else if(qXHR.status == 403) {
        handle_403_captions();
      } else {
        hide_all();
        $('#error-page').show();
      }
    }
  });
}

// parse the captions, create the search index
var handle_caption_response = function(response) {
  lines = [];
  response_split = response.split("\n\n");
  for(i = 0; i < response_split.length;i++) {
    seg_split = response_split[i].split("\n");
    timestamp = seg_split.shift();
    timestamp_pieces = timestamp.split(",");
    line = seg_split.join(" ");
    lines.push({
        "start": timestamp_pieces[0],
        "end": timestamp_pieces[1],
        "line": line
    })
  }
  state["captions"][state["video_id"]] = lines;
  chrome.storage.local.set({"captions": state["captions"]}, function() {
    console.log("Saved caption to storage.");
  });
  main();
}

var handle_403_captions = function() {
  state["captions"][state["video_id"]] = [];
  chrome.storage.local.set({"captions": state["captions"]}, function() {
    console.log("Saved 403 caption to storage.");
  });
  set_warning("This videos creator has disabled third party caption access.");
}

var check_index = function() {
  if("indexes" in state && state["video_id"] in state["indexes"]) {
    return true;
  } else {
    return false;
  }
}

var build_index = function() {
  var idx = elasticlunr(function () {
    this.setRef('start')
    this.addField('line')
    state["captions"][state["video_id"]].forEach(function (doc) {
        this.addDoc(doc)
    }, this)
  })
  state["indexes"][state["video_id"]] = idx;
  main();
}

var populate_search_results = function(search_term) {
  var search_results = state["indexes"][state["video_id"]].search(search_term);
  $('#search-results').empty();
  if (search_results.length == 0) {
    $('#search-results').append("<dt>No results.</dt>");
  } else {
    for(i = 0; i < search_results.length; i++) {
      var video_time = parse_video_time(search_results[i].doc.start);
      $('#search-results').append("<dt><a href='#' class='search-result' value='" + video_time + "'>" + search_results[i].doc.start + "</a></dt>");
      $('#search-results').append("<dd>" + search_results[i].doc.line + "</dd>");
    }
  }
}

var parse_video_time = function(time_string) {
  if (typeof(time_string) != "string") {
    return 0;
  } else {
    // format should be hour:minute:second
    var pieces = time_string.split(":");
    if(pieces.length != 3) {
      return 0;
    }
    var number_pieces = pieces.map(x => new Number(x))
    // return in seconds
    return Math.floor(3600 * number_pieces[0] + 60 *number_pieces[1] + number_pieces[2]);
  }
}

var clear_cache = function() {
  chrome.storage.local.set({"captions": {}}, function() {
      console.log("Captions cache cleared.");
  });
}
