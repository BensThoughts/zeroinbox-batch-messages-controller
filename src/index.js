const mongoose = require('mongoose');
const logger = require('./loggers/log4js');

const rabbit = require('zero-rabbit');
const { 
  rabbit_config, 
  rabbit_topology,
} = require('./config/rabbit.config');

const batchGetMessages = require('./core/batch-messages.controller');

const { 
  MONGO_URI,
  BATCH_MESSAGES_HEALTH_HOST,
  BATCH_MESSAGES_HEALTH_PORT
} = require('./config/init.config');

// Print out the value of all env vars
let envVars = require('./config/init.config');
Object.keys(envVars).forEach((envVar) => {
  logger.info(envVar + ': ' + envVars[envVar]);
});

const express = require('express');
const KubeHealthCheck = express();
KubeHealthCheck.get('/healthz', (req, res, next) => {
  res.status(200).send();
});

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (err, db) => {
  if (err) {
    throw new Error('Error in mongoose.connect(): ' + err);
  } else {
    logger.info('Connected to MongoDB!');
      
    rabbit.connect(rabbit_config, (err, conn) => {
      if (err) {
        throw new Error('Error in rabbit.connect(): ' + err);
      }
      logger.info('Connected to RabbitMQ!');

      let server = KubeHealthCheck.listen(BATCH_MESSAGES_HEALTH_PORT, BATCH_MESSAGES_HEALTH_HOST);
      processHandler(server);
      logger.info(`Running health check on http://${BATCH_MESSAGES_HEALTH_HOST}:${BATCH_MESSAGES_HEALTH_PORT}`);
      
      rabbit.setChannelPrefetch(rabbit_topology.channels.listen, 1);
      rabbit.consume(rabbit_topology.channels.listen, rabbit_topology.queues.user_id, (userMsg) => {
        let message = JSON.stringify(userMsg.content);
        let userId = userMsg.content.userId;
        logger.trace(userId + ' - userMsg.content received messageIds.length: ' + message);
        // QUESTION: new? or created new class for this? or something else?
        setupConsumer(userMsg);
      }, { noAck: false });

    });
  }
});

function setupConsumer(userMsg) {
  let userId = userMsg.content.userId;
  let userChannel = rabbit_topology.channels.user_prefix + userId;
  let messageIdsQueue = rabbit_topology.queues.user_prefix + userId;
  let messageIdsExchange = rabbit_topology.exchanges.topic.messageIds;
  let key = 'user.' + userId;
  
  rabbit.assertQueue(userChannel, messageIdsQueue, { autoDelete: false, durable: true }, (assertQueueErr, q) => {
    if (assertQueueErr) return logger.error(assertQueueErr);
    rabbit.setChannelPrefetch(userChannel, 1);
    
    rabbit.bindQueue(userChannel, messageIdsQueue, messageIdsExchange, key, {}, (bindQueueErr, ok) => {
      if (bindQueueErr) return logger.error(bindQueueErr);
      rabbit.consume(userChannel, messageIdsQueue, (messageIdsMsg) => {
        let messageIdsLength = messageIdsMsg.content.messageIds.length;
        logger.trace(userId + ' - messageIdsMsg received messageIds.length: ' + messageIdsLength);
        batchGetMessages(messageIdsMsg, userMsg);
      }, { noAck: false });
    
    });
  
  });

}

// Graceful shutdown SIG handling
function processHandler(server) {
  const signals = {
    'SIGHUP': 1,
    'SIGINT': 2,
    'SIGQUIT': 3,
    'SIGABRT': 6,
    // 'SIGKILL': 9, // doesn't work
    'SIGTERM': 15,
  };

  Object.keys(signals).forEach((signal) => {
    process.on(signal, () => {
      logger.info(`Process received a ${signal} signal`);
      shutdown(server, signal, signals[signal]);
    });
  });
}

const shutdown = (server, signal, value) => {
  logger.info('shutdown!');
    logger.info(`Server stopped by ${signal} with value ${value}`);
    rabbit.disconnect(() => {
      logger.info('Rabbit disconnected!');
      mongoose.disconnect((error) => {

      });
      server.close(() => {

      })
      logger.info('Mongo disconnected!')
    });
};
