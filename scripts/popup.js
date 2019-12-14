var state = {
  "captions": {},
  "indexes": {}
};

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
  main(tabs);

  $("#search-form").submit(function(event) {
      event.preventDefault();
      var search_term = $('#searchterm').val();
      populate_search_results(search_term);
  });
});

var main = function(tabs) {
  hide_all();
  var on_youtube_video_page = check_url(tabs);
  if (!on_youtube_video_page) {
    set_warning("This extension only works on a video page on www.youtube.com.");
    return 1;
  }
  var caption_is_downloaded = check_caption();
  if (!caption_is_downloaded) {
    $('#loading-page').show();
    get_caption();
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

var check_url = function (tabs) {
    var url = tabs[0].url;
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
  // overriding for now
  return true;
  if("captions" in state && state["video_id"] in state["captions"]) {
    return true;
  } else {
    return false;
  }
}

var get_caption = function(video_id) {
  video_id = "zenMEj0cAC4";
  $.ajax({
    type: "GET",
    url: "https://www.googleapis.com/youtube/v3/captions?videoId=" + video_id + "&part=snippet",
    headers: {
      "Authorization": "Bearer <access_token>"
    },
    success: function (response){
      var captions = response.items;
      // grab the first english caption
      for(i = 0; i < captions.length; i++) {
        if(sample[i].snippet.language == "en") {
          download_caption(video_id, sample[i].id);
          return 1;
        }
      }
      set_warning("This video has no english captions.");
      return 0;
    },
    failure: function (response) {
      hide_all();
      $('#error-page').show();
    }
  });
}

var download_caption = function(video_id, caption_id) {
  var caption_id = "tB9LU3BqxC30prVJrVinjMggozJno7M2";
  $.ajax({
    type: "GET",
    url: "https://www.googleapis.com/youtube/v3/captions/" + caption_id,
    headers: {
      "Authorization": "Bearer <access_token>"
    },
    success: function (response){
      handle_caption_response(response);
    },
    failure: function (response) {
      hide_all();
      $('#error-page').show();
    }
  });
}

// parse the captions, create the search index
var handle_caption_response = function(response) {
  response_split = response.split("\n");
  nb = [];
  for(i = 0; i < response_split.length;i++) {
      if(response_split[i] != "") {
          nb.push(response_split[i]);
      }
  };
  lines = [];
  for(i = 0; i < nb.length; i += 2) {
      timestamps = nb[i];
      line = nb[i + 1];            timestamp_pieces = timestamps.split(",");
      lines.push({
          "start": timestamp_pieces[0],
          "end": timestamp_pieces[1],
          "line": line
      })
  }
  state["captions"]["video_id"] = lines;
}

var check_index = function() {
  // overriding for now
  var documents = [{
    "name": "Lunr",
    "text": "Like Solr, but much smaller, and not as bright."
  }, {
    "name": "React",
    "text": "A JavaScript the for building user interfaces."
  }, {
    "name": "Lodash",
    "text": "A modern JavaScript utility the library delivering modularity, performance & extras."
  }]
  var idx = elasticlunr(function () {
      this.setRef('name')
      this.addField('text')
      documents.forEach(function (doc) {
          this.addDoc(doc)
      }, this)
  })
  state["idx"] = idx;



  return true;
  // end override
  if("indexes" in state && state["video_id"] in state["indexes"]) {
    return true;
  } else {
    return false;
  }
}

var build_index = function() {
  var idx = elasticlunr(function () {
    this.setRef('name')
    this.addField('text')
    state["captions"]["video_id"].forEach(function (doc) {
        this.addDoc(doc)
    }, this)
  })
  state["indexes"]["video_id"] = idx;
  main();
}

var populate_search_results = function(search_term) {
  var search_results = state["idx"].search(search_term);
  $('#search-results').empty();
  if (search_results.length == 0) {
    $('#search-results').append("<dt>No results.</dt>");
  } else {
    for(i = 0; i < search_results.length; i++) {
      $('#search-results').append("<dt><a href=''>" + search_results[i].doc.name + "</a></dt>");
      $('#search-results').append("<dd>" + search_results[i].doc.text + "</dd>");
    }
  }
}

