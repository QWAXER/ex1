const logger = require('./logger');

class CliError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CliError';
    this.exitCode = options.exitCode || 1;
    this.details = options.details || '';
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

function printFatal(error, env = process.env.NODE_ENV || 'development') {
  const message = error && error.message ? error.message : String(error);

  logger.error(`Ошибка: ${message}`);

  if (error && error.details) {
    logger.detail(error.details);
  }

  if (env !== 'production') {
    let trace = null;

    if (error && error.cause && error.cause.stack) {
      trace = error.cause.stack;
    } else if (!(error instanceof CliError) && error && error.stack) {
      trace = error.stack;
    }

    if (trace) {
      process.stderr.write(`${trace}\n`);
    }
  }

  process.exitCode = error && error.exitCode ? error.exitCode : 1;
}

module.exports = {
  CliError,
  printFatal
};
