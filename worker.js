//Setup web server and socket
var express = require('express'),
    aws = require('aws-sdk'),
    http = require('http'),
    fs = require('fs'),
    util = require('util'),
    AlchemyAPI = require('./alchemyapi'),
    configure = require('./configure.json');

// configure aws credentials
var config = new aws.Config({
  "accessKeyId": "", 
  "secretAccessKey": "", 
  "region": ""
  //"region": "us-east-1"  need to modify the configure???
});

//add

var sns = new aws.SNS({
  region: "us-east-1",
  apiVersion: "2015-04-19",
  "accessKeyId": "", 
  "secretAccessKey": ""
});
var sqs = new aws.SQS({
  region: "us-east-1",
  apiVersion: "2015-04-19",
  "accessKeyId": "", 
  "secretAccessKey": ""
});

var alchemyapi = new AlchemyAPI();

var receiveMessageParams = {
  QueueUrl: configure.QueueUrl1,
  MaxNumberOfMessages: 10,
  VisibilityTimeout: 30,
  WaitTimeSeconds: 20,
  AttributeNames: ["RawTweet"]
};

function sentiment(tweetText) {

    alchemyapi.sentiment('text', tweetText, {}, function(response) {
    console.log("Sentiment: " + response["docSentiment"]["score"]);
    output = response["docSentiment"]["score"]
  });
}

function getMessages() {
  sqs.receiveMessage(receiveMessageParams, receiveMessageCallback);


function receiveMessageCallback(err, data) {
  if(err) console.log("Error receiving sqs message: " + err);
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
  var tweetText = msgObj.text;
  var output = {};
  sentiment(tweetMap);
  var ispos = 0;
  if (output >= 0) ispos = 1;
  var outputPoint = {"name": msgObj.name, "text": msgObj.text, "topic": msgObj.topic, "lat": msgObj.lat,"lng": msgObj.lng, "isPos": ispos};
  var msg = {MessageBody:JSON.stringify(outputPoint)};
  publish(msg);
  sqs.deleteMessage({
    "QueueUrl": configure.QueueUrl1,
    "ReceiptHandle": sqsMessage.ReceiptHandle
  }, function(err, data){ if(err) logger.error(err);});
}
}

function publish(msg) {
  var publishParams = {
    TopicArn: configure.TopicArn,
    Message: msg
  };

  sns.publish(publishParams, function(err, data) {
    if(err) {
      console.log("Error publishing message: " + util.inspect(err));
  
    }
  });
}

setTimeout(getMessages(), 50);
