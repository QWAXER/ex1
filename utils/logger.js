const chalk = require('chalk');

if (!process.stdout.isTTY && process.env.FORCE_COLOR === undefined) {
  chalk.level = 0;
}

function write(stream, message = '') {
  stream.write(`${message}\n`);
}

function log(message = '') {
  write(process.stdout, message);
}

function success(message) {
  write(process.stderr, `${chalk.green('✔')} ${message}`);
}

function warn(message) {
  write(process.stderr, `${chalk.yellow('⚠')} ${message}`);
}

function error(message) {
  write(process.stderr, `${chalk.red('✖')} ${message}`);
}

function note(message) {
  write(process.stderr, `${chalk.blue('ℹ')} ${message}`);
}

function detail(message) {
  write(process.stderr, `  ${chalk.yellow(message)}`);
}

function verbose(enabled, message) {
  if (enabled) {
    write(process.stderr, chalk.cyan(`[VERBOSE] ${message}`));
  }
}

function dryRun(message) {
  write(process.stdout, chalk.magenta(`[DRY-RUN] ${message}`));
}

module.exports = {
  log,
  success,
  warn,
  error,
  note,
  detail,
  verbose,
  dryRun
};
