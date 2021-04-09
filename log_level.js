const winston = require('./config/winston');
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");
const client = new AWS.DynamoDB.DocumentClient();

async function setLogLevel(event, context, callback) {
  winston.info("setLogLevel Begin");
  winston.info({ event, context, callback });
  let data;
  let awsRequestId;
  let functionName;
  let functionVersion;
  let logGroupName;
  let logStreamName;

  await client.put({
    TableName: 'current_log_level',
    Item: {
      id: uuidv4(),
      data: "error",
      createdAt: moment(),
    }
  }).promise();

  winston.info("setLogLevel End");
}

module.exports.setLogLevel = setLogLevel;
