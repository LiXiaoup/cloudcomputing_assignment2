//Setup web server and socket
var twitter = require('twit'),
    express = require('express'),
    mysql = require('mysql'),
    aws = require('aws-sdk'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
//add
    fs = require('fs'),
    util = require('util'),
    async = require('async');
    configure = require('./configure.json');

//end of add

//Setup twitter stream api
var twit = new twitter({
  consumer_key: 'ejCEHa6IMNxi51zrQTE136wdi',
  consumer_secret: 'gfWykQNDhbTy3Oswl0s7npWexglTeZvAQqS5zJExkAjURX2q1s',
  access_token: '391259637-BQfA6SgSl0ELifYdYCLxBODeAPxNOjGs0rVdlkXA',
  access_token_secret: 'zkq1ca7QQS6aohh1NYXgpl7E2SF33fvcV1QXDF5HYMVta'
}),
stream = null, topic = null;

// Set up RDS connection
var mydb = new mysql.createConnection({
  host     : 'clouda2.cnjryr7wwjlv.us-west-2.rds.amazonaws.com',
  user     : 'CloudA2',
  password : 'tweetsentiments',
  database : 'tweets'
});
//connect to specified database
mydb.connect(function(err){
  if(!err)  console.log("Database is connected ...");  
  else      console.log("Error connecting database ...");  
});

// configure aws credentials
var config = new aws.Config({
  "accessKeyId": "AKIAJGP3K7W2PFEZ645A", 
  "secretAccessKey": "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", 
  "region": "us-east-1"
  //"region": "us-east-1"  need to modify the configure???
});

//add
//var sqsUrl: "https://sqs.us-west-2.amazonaws.com/603471414146/CloudA2";
var sqs1 = new aws.SQS();
var sqs2 = new aws.SQS();

var receiveMessageParams = {
  QueueUrl: configure.QueueUrl2,
  MaxNumberOfMessages: 10,
  VisibilityTimeout: 30,
  WaitTimeSeconds: 20,
  AttributeNames: ["sentiment"]
};

function getMessages() {
  sqs.receiveMessage(receiveMessageParams, receiveMessageCallback);


function receiveMessageCallback(err, data) {
  if(err) logger.error("Error receiving sqs message: " + err);
  if (data && data.Messages && data.Messages.length > 0) {
    data.Message.forEach(processMessage);
    readMessage();
  } 
  else {
    process.stdout.write("-");
    setTimeout(getMessages(), 50);
  }
}

function processMessage(sqsMessgae) {
  var msgObj = JSON.parse(sqsMessage.MessageBody);
  outputPoint = {"name": msgObj.name, "text": msgObj.text, "topic": msgObj.topic, "lat": msgObj.lat,"lng": msgObj.lng, "isPos": ispos};
  sqs.deleteMessage({
    "QueueUrl": configure.QueueUrl2,
    "ReceiptHandle": sqsMessage.ReceiptHandle
  }, function(err, data){ if(err) logger.error(err);});
}
}



//end of add

//var sqs = new aws.SQS({region: "us-west-2", params: {QueueUrl: "https://sqs.us-west-2.amazonaws.com/603471414146/CloudA2",QueueName: 'CloudA2'}});
//var sns = new aws.SNS({params: {TopicArn: 'arn:aws:sns:us-west-2:603471414146:Message'}});

//Use the default port (for beanstalk) or default to 8080 locally
server.listen(process.env.PORT || 8081);

//Setup rotuing for app
app.use(express.static(__dirname + '/public'));

// A2 code
app.get('/',function(req,res){
  res.sendFile('index.html');
  //It will find and locate index.html
});

// sqs.receiveMessage({}, function (err, data){
//   console.log(data);
// });
io.sockets.on('connection', function (socket) {
  //create table (only for the first time of connection) and inform client of connection
  mydb.query('DROP TABLE IF EXISTS tweets', function(err, row, field){
    if(err) console.log(err);
    else console.log('Cleared Duplicates');
  });
  mydb.query('CREATE TABLE tweets (name VARCHAR(100), text VARCHAR(255), topic VARCHAR(255), lat DOUBLE,lng DOUBLE, isPos BOOLEAN, PRIMARY KEY(name))', 
    function(err, row, field){
      if(err) console.log(err);
      else console.log('Table tweets created.');
    });
  socket.emit("connected");

  socket.on("give topics", function(){
    twit.get('trends/place', {id:1}, function (error, data, response){
        if(error){console.log(error);}
        var trends = data;
        //also add predefined keywords
        var mytopics = ['time', 'life', 'love', 'sport', 'health', 'study', 'work', 'nature', 'ISIS', 'holiday'];
        //console.log(trends[0]);
        socket.emit('twitter-topics',{trending: trends, topics: mytopics});
    });
  });//end of give topics

  socket.on("filter tweets", function (data) {
    //first query from database for previous stored topics
    //then start twitter filter stream for the keyword
    if(stream != null) {
      stream.stop();
    }
    topic = data.keyword;
    stream = twit.stream('statuses/filter', {track:topic});
    stream.on('tweet', streamHandler);
  });

  socket.on("stop filter", function (data){
    stream.stop();
  });

  function streamHandler(data) {
      // Does the JSON result have coordinates
      if (data.coordinates){
        if (data.coordinates !== null){
          //If so then build up some nice json and send out to web sockets
          //var outputPoint = {"name": data.user.name, "text": data.text, "topic": topic, "lat": data.coordinates.coordinates[0],"lng": data.coordinates.coordinates[1], "isPos": 0};
          mydb.query('INSERT INTO tweets SET ?', outputPoint, function(err, result){
            if(err) console.log(err);
            else console.log('Insert Success');
          });
          // send to queue for sentiment analysis before emit to client
          var msg = {MessageBody:JSON.stringify(outputPoint)};
          var sendMessageParams = {
              QueueUrl: configure.QueueUrl1,
              Message: msg
          };
          sqs1.sendMessage(sendMessageParams, function (err, data) {
            if (!err) console.log(data);
            else console.log(err);
          });
          getMessages();
          var outputPoint = {};

          //Send out to web sockets channel.
          socket.emit('twitter-stream', outputPoint);
        }
        else if(data.place){
          if(data.place.bounding_box === 'Polygon'){
            // Calculate the center of the bounding box for the tweet
            var coord, _i, _len;
            var centerLat = 0;
            var centerLng = 0;
            for (_i = 0, _len = coords.length; _i < _len; _i++) {
              coord = coords[_i];
              centerLat += coord[0];
              centerLng += coord[1];
            }
            centerLat = centerLat / coords.length;
            centerLng = centerLng / coords.length;

            // Build json object and broadcast it
            var outputPoint = {"name": data.user.name, "text":data.text, "topic": topic, "lat": centerLat, "lng": centerLng, "isPos": 1};
            mydb.query('INSERT INTO tweets SET ?', outputPoint, function(err, result){
              if(err) console.log(err);
              else console.log('Insert Success');
            });
            // send to queue for sentiment analysis before push to client

            socket.emit('twitter-stream', outputPoint);
          }
        }
      }//end of if status have location info check
    }//end of stream handler


  // sample 
  // sqs.receiveMessage({}, function (err, data){
  //   console.log(data);
  // })
  // sqs.sendMessage({MessageBody: 'THE MESSAGE TO SEND'}, function (err, data) {
  //   if (!err) console.log(data);
  // });


});






