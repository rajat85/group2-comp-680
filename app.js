const sls = require('serverless-http');
const morgan = require('morgan');
const express = require('express');
const app = express();
const winston = require('./config/winston');
const { postSlackMessage } = require('./slack_bot');
const { getInfo } = require('./info');
const { setLogLevel } = require('./log_level');

app.use(morgan('combined', { stream: winston.stream }));

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.locals.error = err;

  // add this line to include winston logging
  winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/api/info', async (req, res) => {
  res.send(await getInfo());
});

app.post('/api/v1/log_level', async (req, res) => {
  res.send(await setLogLevel(req, res));
});
//app.listen(3000, () => console.log(`Listening on: 3000`));
module.exports.handler = sls(app, { callbackWaitsForEmptyEventLoop: false });
