import winston from 'winston';
import Constants from '../constants/constants';

const path = require('path');

// For Winston, we need to tell it how far back we want to see logs from some anchor point
// (by default, the time we're looking at logs), as well as the number of logs to look at.
// These constants will take us back 100 years and give us a "really big number" of rows.
// Kind of a hacky way to say "give me all logs", but the current query API doesn't appear
// to have another way to specify that.
const LOG_TIME_LOOKBACK = 100 * 365 * 24 * 60 * 60 * 1000;
const LOG_ROW_LIMIT = 10000000000;

// Note that there are no tests for this class (at this time).  The vast majority of the functionality
// is using winston, and it's not clear what non-winston things we need to test.
export default class LogService {
  writeLog(projectPath, type, title, description, details, level, user) {
    const logger = winston.createLogger({
      level: 'verbose',
      defaultMeta: { user },
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({
          filename: path.join(
            projectPath,
            Constants.StatWrapFiles.BASE_FOLDER,
            Constants.StatWrapFiles.LOG
          )
        })
      ]
    });

    logger.log({
      level: level || 'info',
      type: type || Constants.UndefinedDefaults.ACTION_TYPE,
      title: title || Constants.UndefinedDefaults.ACTION_TYPE,
      description,
      details
    });
    logger.close();
  }

  loadLog(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    const logger = winston.createLogger({
      level: 'verbose',
      transports: [
        new winston.transports.File({
          filename: path.join(
            projectPath,
            Constants.StatWrapFiles.BASE_FOLDER,
            Constants.StatWrapFiles.LOG
          )
        })
      ]
    });

    const options = {
      from: new Date() - LOG_TIME_LOOKBACK,
      until: new Date(),
      limit: LOG_ROW_LIMIT,
      start: 0
    };

    logger.query(options, callback);
  }
}
