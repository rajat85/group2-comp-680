const { IncomingWebhook } = require('@slack/webhook');
const HttpsProxyAgent = require('https-proxy-agent');
const url = `${process.env.SLACK_WEBHOOK_URL}`;
const winston = require('./config/winston');

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


function payload(channel = '') {
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

    for (const logEvent of logEvents) {
      const log = JSON.parse(logEvent.message);

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
          createdAt: moment().format(),
          logLevel: log.level,
        }
      }).promise();
    }
  }
  winston.info({ event, context, callback });
  winston.info("CloudWatch End");
  return await webhook.send(payload());
}

module.exports.postSlackMessage = postSlackMessage;
