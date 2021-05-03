const winston = require('./config/winston');
const AWS = require("aws-sdk");
const CONFIG_DYNAMODB_ENDPOINT = process.env.CONFIG_DYNAMODB_ENDPOINT;
const IS_OFFLINE = process.env.IS_OFFLINE;
const AWS_REGION = process.env.REGION;

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
      "text": message
    };
  }

  if (!isFinite(parseInt(params[1]) || !parseInt(params[1]) <= 10)) {
    message = `Problem! recall can be done for last 10 events.`
    return {
      "text": `:error ${message} \n`
    };
  }
  let listLogs = [];
  try {
    const data = await client.scan({
      TableName: 'cloud_watch_logs',
      FilterExpression : 'logLevel = :level',
      ExpressionAttributeValues : { ':level' : params[0] },
      Limit: parseInt(params[1]) + 1,
      ScanIndexForward: true
    }).promise();
    for (const cloudWatchLog of data.Items) {
      const url = `https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/${cloudWatchLog.logGroupName}/log-events/${cloudWatchLog.logStreamName}`;
      listLogs.push(url);
    }
  } catch (err) {
    console.log("Error occurred.")
    console.log(err);
  }

  winston.info("recall End");

  return {
    "text": `Here are the last ${params[1]} CloudWatch ${params[0]} logs. \n`,
    "attachments": listLogs.map((log) => {
      return ({
          "fallback": `${log} Please see the details`,
          "actions": [
            {
              "type": "button",
              "text": "Log details  :clock5:",
              "url": `${log}`
            }
          ]
      });
    })
  };
}

module.exports.recall = recall;
