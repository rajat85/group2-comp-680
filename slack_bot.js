const { IncomingWebhook } = require('@slack/webhook');
const HttpsProxyAgent = require('https-proxy-agent');
const url = `${process.env.SLACK_WEBHOOK_URL}`;

let proxy;
if (process.env.http_proxy) {
  proxy = new HttpsProxyAgent(process.env.http_proxy);
}
const webhook = proxy ? new IncomingWebhook(url,{ agent: proxy }) : new IncomingWebhook(url);
const HEADERS = { 'content-type': 'application/json' };


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

async function postSlackMessage() {
  return await webhook.send(payload());
}

module.exports.postSlackMessage = postSlackMessage;