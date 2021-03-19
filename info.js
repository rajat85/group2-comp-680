const winston = require('./config/winston');

async function getInfo() {
  winston.warn('lambda function rocks!');
  return { application: 'group2-comp-680', version: '1' };
}

module.exports.getInfo = getInfo;
