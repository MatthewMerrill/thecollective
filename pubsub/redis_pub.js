const redis = require('redis');

require('dotenv').config();
const REDIS_URL = process.env.REDIS_URL;

module.exports.pub = (function() {
  let client;
  if (REDIS_URL && REDIS_URL !== '') {
    console.log('Connecting to redis at', REDIS_URL);
    client = redis.createClient({
      url: REDIS_URL,
      retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with
            // a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands
            // with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
    });
  }
  else {
    throw new Error('I need a REDIS_URL');
  }
  
})();

