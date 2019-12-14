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


  $('#searchterm').on('input', function() {
    var search_term = $('#searchterm').val();
    if(search_term == "" ) {
      $('#search-results').empty();
    $('#search-results').append("<dt>Enter a search term.</dt>");
    } else {
      populate_search_results(search_term);
    }
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
  // end override
  if("captions" in state && state["video_id"] in state["captions"]) {
    return true;
  } else {
    return false;
  }
}

var get_caption = function(video_id) {
  //video_id = "zenMEj0cAC4";
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
      this.setRef('start')
      this.addField('line')
      sample_document.forEach(function (doc) {
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
      $('#search-results').append("<dt><a href=''>" + search_results[i].doc.start + "</a></dt>");
      $('#search-results').append("<dd>" + search_results[i].doc.line + "</dd>");
    }
  }
}




var sample_document = [{
    "start": "0:00:02.460",
    "end": "0:00:06.620",
    "line": "So this video is going to inform you of how a turbo charger works"
}, {
    "start": "0:00:07.140",
    "end": "0:00:09.580",
    "line": "and the components needed for a turbocharger system"
}, {
    "start": "0:00:11.180",
    "end": "0:00:12.940",
    "line": "So...here's what happens"
}, {
    "start": "0:00:13.540",
    "end": "0:00:18.740",
    "line": "Now, we know in our engine cycle that at the end we're going to force out exhaust gases"
}, {
    "start": "0:00:19.180",
    "end": "0:00:26.300",
    "line": "So these exhaust gases are fed out through some piping into this turbine called a turbocharger"
}, {
    "start": "0:00:27.040",
    "end": "0:00:34.380",
    "line": "Which what happens here is that these exhaust gases spin the turbine, and this turbine is connected"
}, {
    "start": "0:00:34.400",
    "end": "0:00:45.120",
    "line": "by a shaft...(we can represent that right here) connected to another turbine which is sucking in outside air as it spins"
}, {
    "start": "0:00:45.240",
    "end": "0:00:50.700",
    "line": "this outside air is forced in and it's going to be pressurized now"
}, {
    "start": "0:00:50.800",
    "end": "0:00:58.380",
    "line": "so it's not just atmospheric pressure that you're putting into the engine, you're forcing in more air. So we call that boost"
}, {
    "start": "0:00:58.580",
    "end": "0:01:07.100",
    "line": "so this air is forced in, now what happens when you're forcing in a greater amount of air is when you add pressure, you also add heat"
}, {
    "start": "0:01:07.100",
    "end": "0:01:14.720",
    "line": "and you don't want to add already hot air into the engine, so you're gonna pass this air through an intercooler."
}, {
    "start": "0:01:15.380",
    "end": "0:01:23.800",
    "line": "now, this is just a bunch of coils, some of them use a liquid system, but most of them are air-based and it'll pass through some coils"
}, {
    "start": "0:01:23.860",
    "end": "0:01:25.380",
    "line": "and that will cool down the air."
}, {
    "start": "0:01:25.640",
    "end": "0:01:35.600",
    "line": "this cool air, then travels through the intake manifold and that will come into your engine chamber"
}, {
    "start": "0:01:35.980",
    "end": "0:01:41.180",
    "line": "now, there are some things that people have added in to make this more feasible"
}, {
    "start": "0:01:41.180",
    "end": "0:01:46.380",
    "line": "so we've got two things here now, the Blow-Off Valve, and we've got a wastegate"
}, {
    "start": "0:01:46.960",
    "end": "0:01:57.660",
    "line": "now, when you have exhaust gases coming through, and you don't want  to reach, say--8psi--so you set a limit on your wastegate"
}, {
    "start": "0:01:58.700",
    "end": "0:02:08.760",
    "line": "at 8psi, and what happens when this turbine spinning here realizes that the air sucking in is going to be forced in at 8psi"
}, {
    "start": "0:02:09.040",
    "end": "0:02:16.360",
    "line": "it'll open up this wastegate this wastegate will allow this air that's going into the exhaust turbine to feed out through the exhaust"
}, {
    "start": "0:02:16.360",
    "end": "0:02:20.200",
    "line": "instead of creating more boost. So that helps on this side"
}, {
    "start": "0:02:21.040",
    "end": "0:02:29.820",
    "line": "now, on the other hand every time you let go of the ignition, you're going to have boost inside of this intake"
}, {
    "start": "0:02:29.820",
    "end": "0:02:36.820",
    "line": "manifold that you can't use. So what happens is you'll shut off the throttle, this intake valve will close,"
}, {
    "start": "0:02:36.820",
    "end": "0:02:42.480",
    "line": "and you've got all this pressurized air that's wanting to go into this cylinder"
}, {
    "start": "0:02:42.740",
    "end": "0:02:48.580",
    "line": "so because it's got no where to go, you get a Blow-Off valve which will let that air escape."
}, {
    "start": "0:02:48.680",
    "end": "0:02:50.340",
    "line": "Now how this works is"
}, {
    "start": "0:02:50.480",
    "end": "0:02:57.540",
    "line": "once you get to the PSI that you set at, say you'll have a spring that at 6psi, it'll let air out."
}, {
    "start": "0:02:58.240",
    "end": "0:03:07.760",
    "line": "so you're revving up high in your car, you let go of the gas, and this throttle plate closes, and then all this air is being forced"
}, {
    "start": "0:03:07.920",
    "end": "0:03:12.540",
    "line": "into here and it reaches 6 psi, well this spring lifts up and it lets the air out"
}, {
    "start": "0:03:12.540",
    "end": "0:03:19.120",
    "line": "and you'll hear a hissing sound, that's what that is when you let off the throttle plate is this Blow-Off valve letting out air"
}, {
    "start": "0:03:20.180",
    "end": "0:03:28.820",
    "line": "so, those are the main four components. You've got the turbocharger which consists of the two turbines, used to force in air, you've got the intercooler which"
}, {
    "start": "0:03:28.860",
    "end": "0:03:39.280",
    "line": "cools the air going into the engine, you've got wastegate that lets exhaust gases escape if you've reached a high enough boost already, and you've got the blow-off valve for when you"
}, {
    "start": "0:03:39.280",
    "end": "0:03:43.640",
    "line": "let go of the gas the air has somewhere to go, and those are the four main components"
}, {
    "start": "0:03:43.960",
    "end": "0:03:44.960",
    "line": "of a turbocharger"
}]