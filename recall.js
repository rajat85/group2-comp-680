const winston = require('./config/winston');
const AWS = require("aws-sdk");
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

async function recall(event, context, callback) {
  const requestBody = event && event.body || {};
  winston.info("recall Begin");
  console.log({event, context, callback});
  const { text = "" } = requestBody;
  const params = text.split(/[\s,]+/);
  let message;
  const validFomats = ["warning", "error", "err", "info"]
  if (!validFomats.includes(params[0])) {
    message = `Problem! recall can only be done for one of (${validFomats.join(', ')}).`
    return {
      'body': message
    };
  }

  if (!isFinite(parseInt(params[1]) || !parseInt(params[1]) <= 10)) {
    message = `Problem! recall can be done for last 10 events.`
    return {
      'body': message
    };
  }
  let listLogs = [];
  try {
    const data = await client.scan({
      TableName: 'cloud_watch_logs',
      FilterExpression : 'logLevel = :level',
      ExpressionAttributeValues : {':level' : params[0]}
    }).promise();
    // message = `Success! Level set: ${text}`;
    data.Items.forEach(function(cloudWatchLog) {
      listLogs.push(cloudWatchLog.logLevel);
    });
  } catch (err) {
    console.log("Error occurred.")
    console.log(err);
  }

  winston.info("recall End");

  return {
    'body': listLogs.join("\n")
  };
}

module.exports.recall = recall;
