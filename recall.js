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
  const validFomats = ["warn", "error"];
  if (!validFomats.includes(params[0])) {
    message = `Problem! recall can only be done for one of (${validFomats.join(', ')}).`
    return {
      "text": "",
      "blocks": [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `:bangbang: ${message} \n`
        }
      }]
    };
  }

  if (!isFinite(parseInt(params[1])) || parseInt(params[1]) > 10) {
    message = `Problem! recall can be done for last 10 events.`
    return {
      "text": "",
      "blocks": [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `:bangbang: ${message} \n`
        }
      }]
    };
  }

  let data = {
    Items: []
  };
  try {
    data = await client.scan({
      TableName: 'cloud_watch_logs',
      FilterExpression : 'logLevel = :level',
      ExpressionAttributeValues : { ':level' : params[0] },
      Limit: 1000,
      ScanIndexForward: true
    }).promise();
  } catch (err) {
    console.log("Error occurred.")
    console.log(err);
  }

  winston.info("recall End");

  return {
    "text": `Here are the last ${params[1]} CloudWatch ${params[0]} logs. \n`,
    "blocks": data.Items.slice(0, parseInt(params[1])).sort((prev, next) => {
      if (prev.createdAt < next.createdAt) {
        return 1;
      }
      if (prev.createdAt > next.createdAt) {
        return -1;
      }
      return 0;
    }).map((log) => {
      const logBaseUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group`;
      const encode = text => encodeURIComponent(text).replace(/%/g, '$');
      const awsEncode = text => encodeURIComponent(encodeURIComponent(text)).replace(/%/g, '$');
      const encodeTimestamp = timestamp => encode('?start=') + awsEncode(new Date(timestamp).toJSON());
      const awsLambdaLogBaseUrl = `${logBaseUrl}/${awsEncode('/aws/lambda/group2-comp-680-prod-info')}`;
      const logStreamUrl = (logGroup, logStream, timestamp) =>
        `${awsLambdaLogBaseUrl}${logGroup}/log-events/${awsEncode(logStream)}${timestamp ? encodeTimestamp(timestamp) : ''}`;
      return ({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `<${logStreamUrl(log.logGroupName, log.logStreamName, log.createdAt)}|Log details  :clock5:> \n :star: ${log.logStreamName} CreatedAt: ${log.createdAt}.`
        }
      });
    })
  };
}

module.exports.recall = recall;
