function initialize() {
  //Setup Google Map
  var myLatlng = new google.maps.LatLng(17.7850,0);
  var light_grey_style = [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},
                          {"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},
                          {"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
                          {"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},
                          {"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},
                          {"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
                          {"featureType":"administrative.province","stylers":[{"visibility":"off"}]},
                          {"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},
                          {"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}];
  var myOptions = {
    zoom: 2,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.LEFT_BOTTOM
    },
    styles: light_grey_style
  };
  var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
  
  //Setup two laysers of heat map and link to Twitter array we will append data to
  var PosTweets = new google.maps.MVCArray();
  var heatmapPos = new google.maps.visualization.HeatmapLayer({
    data: PosTweets,
    radius: 20,
    dissipating: true,
    gradient: ['rgba(0, 0, 255, 0)', 'rgba(0, 255, 8, 0.8)', 'rgba(143, 184, 255, 1)', 'rgba(143, 0, 255, 1)','rgba(0, 0, 255, 1)']
  });
  heatmapPos.setMap(map);
  //heat map layer for negative tweets
  var NegTweets = new google.maps.MVCArray();
  var heatmapNeg = new google.maps.visualization.HeatmapLayer({
    data: NegTweets,
    radius: 20,
    dissipating: true,
    gradient: ['rgba(144, 0, 0, 0)', 'rgba(255, 147, 0, 0.8)', 'rgba(255, 205, 0, 1)', 'rgba(227, 0, 0, 1)', 'rgba(144, 0, 0, 1)']
  });
  heatmapNeg.setMap(map);

  if(io !== undefined){
    var socket = io.connect('http://localhost:8081/');
    // ask server for trends and topics
    socket.on("connected", function(r) {
      //the server we are ready to start receiving topics.
      socket.emit("give topics");
    });
    
    socket.on('twitter-topics', function (data) {
      if(data){
        for(var i = 0; i<data.trending[0].trends.length; i++){
          var topic = document.createElement("a");
          topic.setAttribute('class','list-group-item');
          topic.setAttribute('id', i);
          topic.innerHTML = data.trending[0].trends[i].name;
          topic.addEventListener("click", click);
          document.getElementById('trending').appendChild(topic);
        }
        for(var j = 0; j<data.topics.length; j++){
          var topic = document.createElement("a");
          topic.setAttribute('class','list-group-item');
          topic.setAttribute('id', j+i);
          topic.innerHTML = data.topics[j];
          topic.addEventListener("click", click);
          document.getElementById("topics").appendChild(topic);
        }
      }
      else
        console.log('Improper JSON Object Format');
      //after receiving trends, start receiving tweets
    });//end of twitter trend event

    // received everytime a new tweet is receieved.
    socket.on('twitter-stream', function (data) {
      //Add tweet to the heat map array.
      var tweetLocation = new google.maps.LatLng(data.lng,data.lat);
      if(data.isPos == 1)
        NegTweets.push(tweetLocation);
      else
        PosTweets.push(tweetLocation);
      //document.getElementById("tweets").scrollTop = document.getElementById("tweets").scrollHeight;
      //flash marker on the map quickly
      var image = "css/Twitter_logo_blue.png";
      var marker = new google.maps.Marker({
        position: tweetLocation,
        map: map,
        icon: image
      });
      setTimeout(function(){
        marker.setMap(null);
      },1000);

    });//end of twitter stream event


    function click (){
      if(document.getElementsByClassName("list-group-item active").length == 0){
        if(this.className == 'list-group-item'){
          this.className = 'list-group-item active';
          var kw = {'keyword': this.innerHTML};
          socket.emit("filter tweets", kw);
        }
      }
      else{
        this.className = 'list-group-item';
        socket.emit("stop filter");
      }
    }//end of click envent
  }// end of sqshandler checking


}//end of initialize




