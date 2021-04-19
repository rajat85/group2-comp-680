const winston = require('./config/winston');
const AWS = require("aws-sdk");
const moment = require("moment");
const CONFIG_CURRENT_LOG_LEVEL_TABLE = process.env.CONFIG_CURRENT_LOG_LEVEL_TABLE;
const CONFIG_DYNAMODB_ENDPOINT = process.env.CONFIG_DYNAMODB_ENDPOINT;
const IS_OFFLINE = process.env.IS_OFFLINE;

let client;
if (IS_OFFLINE === 'true') {
  client = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: CONFIG_DYNAMODB_ENDPOINT,
  });
} else {
  client = new AWS.DynamoDB.DocumentClient();
}

async function setLogLevel(event, context, callback) {
  const requestBody = event && event.body || {};
  winston.info("setLogLevel Begin");
  console.log({event, context, callback});
  try {
    await client.put({
      TableName: CONFIG_CURRENT_LOG_LEVEL_TABLE,
      Item: {
        id: '000000',
        data: requestBody.level || "error",
        createdAt: moment().format(),
      }
    }).promise();
  } catch (err) {
    console.log("Error occurred.")
    console.log(err);
  }

  winston.info("setLogLevel End");
}

module.exports.setLogLevel = setLogLevel;
