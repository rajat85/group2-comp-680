const { IncomingWebhook } = require('@slack/webhook');
const HttpsProxyAgent = require('https-proxy-agent');
const url = `${process.env.SLACK_WEBHOOK_URL}`;
const winston = require('./config/winston');
const CONFIG_CURRENT_LOG_LEVEL_TABLE = process.env.CONFIG_CURRENT_LOG_LEVEL_TABLE;
const AWS_REGION = process.env.REGION;

let proxy;
if (process.env.http_proxy) {
  proxy = new HttpsProxyAgent(process.env.http_proxy);
}
const webhook = proxy ? new IncomingWebhook(url, { agent: proxy }) : new IncomingWebhook(url);
const HEADERS = { 'content-type': 'application/json' };

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");
const client = new AWS.DynamoDB.DocumentClient();
const zlib = require('zlib');


function slackMessagePayload(channel = '') {
  return {
    "text": ":warning: Here is the log from CloudWatch that needs your attention. \n",
    "channel": channel,
    "attachments": [
      {
        "fallback": "Please see the details at #{ENV['TIME_TRACKING_URL']}",
        "actions": [
          {
            "type": "button",
            "text": "Log details  :clock5:",
            "url": `${process.env.TIME_TRACKING_URL}`
          }
        ]
      }
    ]
  };
}

async function postSlackMessage(event, context, callback) {
  winston.info("CloudWatch Begin");
  winston.info({ event, context, callback });
  let data;
  let awsRequestId;
  let functionName;
  let functionVersion;
  let logGroupName;
  let logStreamName;

  if (context) {
    awsRequestId = context.awsRequestId;
    functionName = context.functionName;
    functionVersion = context.functionVersion;
    logGroupName = context.logGroupName;
    logStreamName = context.logStreamName;
  }
  console.log("....Begin console.log....");
  console.log(awsRequestId);
  console.log(functionName);
  console.log(functionVersion);
  console.log(logGroupName);
  console.log(logStreamName);
  console.log(uuidv4());
  console.log("....End of console.log....");

  if (event.awslogs && event.awslogs.data) {
    data = event.awslogs.data;
    const payload = Buffer.from(data, 'base64');
    const logEvents = JSON.parse(zlib.unzipSync(payload).toString()).logEvents;
    const params = {
      TableName: CONFIG_CURRENT_LOG_LEVEL_TABLE,
      Key: {
        "id": '000000'
      }
    };
    const currentLogLevel = await client.get(params).promise();
    console.log("....current log level record....");
    console.log(currentLogLevel.Item);
    console.log("....End of current log level record....");

    for (const logEvent of logEvents) {
      const log = JSON.parse(logEvent.message);
      const createdAt = moment().format();
      await client.put({
        TableName: 'cloud_watch_logs',
        Item: {
          id: uuidv4(),
          data,
          awsRequestId,
          functionName,
          functionVersion,
          logGroupName,
          logStreamName,
          createdAt,
          logLevel: log.level,
        }
      }).promise();

      if (!currentLogLevel || currentLogLevel.Item && currentLogLevel.Item.data.includes(log.level)) {
        const logBaseUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group`;
        const encode = text => encodeURIComponent(text).replace(/%/g, '$');
        const awsEncode = text => encodeURIComponent(encodeURIComponent(text)).replace(/%/g, '$');
        const encodeTimestamp = timestamp => encode('?start=') + awsEncode(new Date(timestamp).toJSON());
        const awsLambdaLogBaseUrl = `${logBaseUrl}/${awsEncode('/aws/lambda/group2-comp-680-prod-info')}`;
        const logStreamUrl = (logGroup, logStream, timestamp) => `${awsLambdaLogBaseUrl}${logGroup}/log-events/${awsEncode(logStream)}${timestamp ? encodeTimestamp(timestamp) : ''}`;
        return await webhook.send({
          "text": ":warning: Here is the log from CloudWatch that needs your attention. \n",
          "attachments": [
            {
              "actions": [
                {
                  "type": "button",
                  "text": `${currentLogLevel.Item.data}: log details  :clock5:`,
                  "url": `${logStreamUrl(logGroupName, logStreamName, createdAt)}`
                }
              ]
            }
          ]
        });
      }
    }
  }

  winston.info({ event, context, callback });
  winston.info("CloudWatch End");
}

module.exports.postSlackMessage = postSlackMessage;
