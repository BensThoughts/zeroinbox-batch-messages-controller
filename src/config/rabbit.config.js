const fs = require('fs');
const path = require('path');
const workdir = path.resolve(__dirname) + '/';
const rabbitTop = fs.readFileSync(workdir + 'rabbit.topology.json');
const rabbitTopology = JSON.parse(rabbitTop.toString());
const logger = require('../loggers/log4js');
logger.info('Rabbit Topology: ' + rabbitTop.toString());

const RABBIT_HOSTNAME = process.env.RABBIT_HOSTNAME;
const RABBIT_PORT = process.env.RABBIT_PORT;
const RABBIT_FRAME_MAX = process.env.RABBIT_FRAME_MAX;
const RABBIT_HEARTBEAT = process.env.RABBIT_HEARTBEAT;
const RABBIT_VHOST = process.env.RABBIT_VHOST;
const RABBIT_USERNAME = process.env.RABBIT_USERNAME;
const RABBIT_PASSWORD = process.env.RABBIT_PASSWORD;
const RABBIT_PROTOCOL = process.env.RABBIT_PROTOCOL;

const RABBIT_URL = process.env.RABBIT_URL;

let rabbitConfig;

if (RABBIT_URL) {
  logger.info('RABBIT_URL: ' + RABBIT_URL);
  rabbitConfig = {
    url: RABBIT_URL,
    ...rabbitTopology,
  };
} else if (RABBIT_HOSTNAME) {
  rabbitConfig = {
    connection: {
      hostname: RABBIT_HOSTNAME,
      port: RABBIT_PORT,
      username: RABBIT_USERNAME,
      password: RABBIT_PASSWORD,
      protocol: RABBIT_PROTOCOL,
      frameMax: RABBIT_FRAME_MAX,
      vhost: RABBIT_VHOST,
      heartbeat: RABBIT_HEARTBEAT,
    },
    ...rabbitTopology,
  };
}

const userTopology = {
  channels: {
    listen: 'batch-messages.listen.channel.1',
    user_prefix: 'batch-messages.listen.user.channel.',
  },
  exchanges: {
    topic: {
      messageIds: 'message-ids.get-messages.message-ids.topic.ex.1',
    },
  },
  queues: {
    user_id: 'batch-messages.get-messages.user-ids.q.1',
    user_prefix: 'batch-messages.get-messages.q.',
  },
};

module.exports = {
  rabbitConfig,
  userTopology,
};
