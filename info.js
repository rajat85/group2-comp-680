const winston = require('./config/winston');

async function getInfo(event, context, callback) {
  const { warn, error } = event.query || {};
  console.log({ event, warn, error });
  if (warn) {
    winston.warn('lambda function rocks!');
  }
  if (error) {
    winston.error('lambda function is not working!');
  }
  return { application: 'group2-comp-680', version: '1' };
}

module.exports.getInfo = getInfo;
