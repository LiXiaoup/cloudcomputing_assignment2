//create sns and sqs
var aws = require('aws-sdk'),
    fs = require('fs'),
    util = require('util'),
    async = require('async');

// configure aws credentials
var config = new aws.Config({
  "accessKeyId": "AKIAJGP3K7W2PFEZ645A", 
  "secretAccessKey": "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", 
  "region": "us-east-1"
  //"region": "us-east-1"  need to modify the configure???
});

//add

var sns = new aws.SNS({
  region: "us-east-1",
  apiVersion: "2015-04-19",
  "accessKeyId": "AKIAJGP3K7W2PFEZ645A", 
  "secretAccessKey": "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"
});
var sqs1 = new aws.SQS({
  region: "us-east-1",
  apiVersion: "2015-04-19",
  "accessKeyId": "AKIAJGP3K7W2PFEZ645A", 
  "secretAccessKey": "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"
});
var sqs2 = new aws.SQS({
  region: "us-east-1",
  apiVersion: "2015-04-19",
  "accessKeyId": "AKIAJGP3K7W2PFEZ645A", 
  "secretAccessKey": "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"
});
var configure = {};

function createTopic(cb) {
  sns.createTopic({
    'Name': 'sentiment'
  }, function (err, result) {
    if (err !== null) {
      console.log("Error creating topic: " + util.inspect(err));
      return cb(err);
    }
    //console.log(util.inspect(result));
    configure.TopicArn = result.TopicArn;
    cb();
  });
}

function createQueue1(cb) {
  sqs1.createQueue({
    'QueueName': 'tweet'
  }, function (err, result) {
    if (err !== null) {
      console.log("Error creating queue1: " + util.inspect(err));
      return cb(err);
    }

    configure.QueueUrl1 = result.QueueUrl;
    cb();
  });
}

function createQueue2(cb) {
  sqs2.createQueue({
    'QueueName': 'sentiment'
  }, function (err, result) {
    if (err !== null) {
      console.log("Error creating queue2: " + util.inspect(err));
      return cb(err);
    }

    configure.QueueUrl2 = result.QueueUrl;
    cb();
  });
}

function getQueueAttr1(cb) {
  sqs1.getQueueAttributes({
    QueueUrl: configure.QueueUrl1,
    AttributeNames: ["QueueArn"]
  }, function (err, result) {
    if (err !== null) {
      console.log("Error getting queue1 attributes: " + util.inspect(err));
      return cb(err);
    }

    configure.QueueArn1 = result.Attributes.QueueArn;
    cb();
  });
}

function getQueueAttr2(cb) {
  sqs2.getQueueAttributes({
    QueueUrl: configure.QueueUrl2,
    AttributeNames: ["QueueArn"]
  }, function (err, result) {
    if (err !== null) {
      console.log("Error getting queue2 attributes: " + util.inspect(err));
      return cb(err);
    }

    configure.QueueArn2 = result.Attributes.QueueArn;
    cb();
  });
}

function snsSubscribe(cb) {
  sns.subscribe({
    'TopicArn': configure.TopicArn,
    'Protocol': 'sqs',
    'Endpoint': configure.QueueArn2
  }, function (err, result) {
    if (err !== null) {
      console.log("Error subscribing: " + util.inspect(err));
      return cb(err);
    }

    cb();
  });
}

function setQueueAttr1(cb) {
  var queueUrl = configure.QueueUrl1;
  var topicArn = configure.TopicArn;
  var sqsArn = configure.QueueArn1;

  var attributes = {
    "Version": "2008-10-17",
    "Id": sqsArn + "/SQSDefaultPolicy",
    "Statement": [{
      "Sid": "Sid" + new Date().getTime(),
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "SQS:SendMessage",
      "Resource": sqsArn,
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": topicArn
        }
      }
    }]
  };

  sqs1.setQueueAttributes({
    QueueUrl: queueUrl,
    Attributes: {
      'Policy': JSON.stringify(attributes)
    }
  }, function (err, result) {
    if (err !== null) {
      console.log("Error setting queue1 attributes: " + util.inspect(err));
      return cb(err);
    }

    cb();
  });
}

function setQueueAttr2(cb) {
  var queueUrl = configure.QueueUrl2;
  var topicArn = configure.TopicArn;
  var sqsArn = configure.QueueArn2;

  var attributes = {
    "Version": "2008-10-17",
    "Id": sqsArn + "/SQSDefaultPolicy",
    "Statement": [{
      "Sid": "Sid" + new Date().getTime(),
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "SQS:SendMessage",
      "Resource": sqsArn,
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": topicArn
        }
      }
    }]
  };

  sqs2.setQueueAttributes({
    QueueUrl: queueUrl,
    Attributes: {
      'Policy': JSON.stringify(attributes)
    }
  }, function (err, result) {
    if (err !== null) {
      console.log("Error setting queue2 attributes: " + util.inspect(err));
      return cb(err);
    }

    cb();
  });
}

function writeConfigureFile(cb) {
  fs.writeFile('configure.json', JSON.stringify(configure, null, 4), function(err) {
    if(err) {
      console.log("Error writing configure file: " + util.inspect(err));
      return cb(err);
    }

    console.log("conigure saved to configure.json");
    cb();
  });
}

async.series([createTopic, createQueue1, createQueue2, getQueueAttr1, getQueueAttr2, snsSubscribe, setQueueAttr1, setQueueAttr2, writeConfigureFile]);
