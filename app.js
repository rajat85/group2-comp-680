const sls = require('serverless-http');
const express = require('express');
const app = express();
const { postSlackMessage } = require('./slack_bot');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/api/info', (req, res) => {
  res.send({ application: 'group2-comp-680', version: '1' });
});
app.post('/api/v1/slack', async (req, res) => {
  await postSlackMessage();
  res.send({ ...req.body });
});
//app.listen(3000, () => console.log(`Listening on: 3000`));
module.exports.handler = sls(app, { callbackWaitsForEmptyEventLoop: false });
