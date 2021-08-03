const mongoose = require('mongoose');
const logger = require('./loggers/log4js');

const rabbit = require('zero-rabbit');
const {
  rabbitConfig,
  userTopology,
} = require('./config/rabbit.config');

const batchGetMessages = require('./core/batch-messages.controller');

const {
  MONGO_URI,
  BATCH_MESSAGES_HEALTH_HOST,
  BATCH_MESSAGES_HEALTH_PORT,
} = require('./config/init.config');

// Print out the value of all env vars
const envVars = require('./config/init.config');
Object.keys(envVars).forEach((envVar) => {
  logger.info(envVar + ': ' + envVars[envVar]);
});

const express = require('express');
const KubeHealthCheck = express();
KubeHealthCheck.get('/healthz', (req, res, next) => {
  res.status(200).send();
});

mongoose.connect(
    MONGO_URI,
    {useNewUrlParser: true, useUnifiedTopology: true},
    (err, db) => {
      if (err) {
        throw new Error('Error in mongoose.connect(): ' + err);
      } else {
        logger.info('Connected to MongoDB!');

        rabbit.connect(rabbitConfig, (err, conn) => {
          if (err) {
            throw new Error('Error in rabbit.connect(): ' + err);
          }
          logger.info('Connected to RabbitMQ!');

          const server = KubeHealthCheck
              .listen(BATCH_MESSAGES_HEALTH_PORT, BATCH_MESSAGES_HEALTH_HOST);
          processHandler(server);
          logger.info(
              `Running health check on http://${BATCH_MESSAGES_HEALTH_HOST}:${BATCH_MESSAGES_HEALTH_PORT}`,
          );

          rabbit.setChannelPrefetch(userTopology.channels.listen, 1);
          rabbit.consume(
              userTopology.channels.listen,
              userTopology.queues.user_id,
              (userMsg) => {
                const message = JSON.stringify(userMsg.content);
                const userId = userMsg.content.userId;
                logger.trace(userId + ' - userMsg.content: ' + message);

                // QUESTION: new? or created new class for this?
                setupConsumer(userMsg);
              }, {noAck: false});
        });
      }
    },
);


/**
 * Setup consume channel for the user
 * @param {RabbitMsg} userMsg
 */
function setupConsumer(userMsg) {
  const userId = userMsg.content.userId;
  const userChannel = userTopology.channels.user_prefix + userId;
  const messageIdsQueue = userTopology.queues.user_prefix + userId;
  const messageIdsExchange = userTopology.exchanges.topic.messageIds;
  const key = 'user.' + userId;

  rabbit.assertQueue(
      userChannel,
      messageIdsQueue,
      {autoDelete: false, durable: true},
      (assertQueueErr, q) => {
        if (assertQueueErr) return logger.error(assertQueueErr);
        rabbit.setChannelPrefetch(userChannel, 1);

        rabbit.bindQueue(
            userChannel,
            messageIdsQueue,
            messageIdsExchange,
            key,
            {},
            (bindQueueErr, ok) => {
              if (bindQueueErr) return logger.error(bindQueueErr);
              rabbit.consume(userChannel, messageIdsQueue, (messageIdsMsg) => {
                logger.trace(userId + ' - messageIdsMsg received');
                const msgIdsLength = messageIdsMsg.content.messageIds.length;
                logger.trace(userId + ' - messageIds.length: ' + msgIdsLength);
                batchGetMessages(messageIdsMsg, userMsg);
              }, {noAck: false});
            },
        );
      },
  );
}


/**
 * Graceful shutdown SIG handling. Express server is fed through because it
 * isn't global.
 * @param  {ExpressServer} server
 */
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
      if (err) logger.error('Error in mongoose.disconnect(): ' + error);
      logger.info('Mongo disconnected!');
    });
    server.close(() => {
      logger.info('Express health check server closed!');
    });
  });
};
