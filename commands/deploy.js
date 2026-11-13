const inquirer = require('inquirer');
const ora = require('ora');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { deployProject } = require('../services/deployService');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = (program) => {
  program
    .command('deploy')
    .description('развернуть проект')
    .option('-e, --env <environment>', 'окружение развёртывания', 'staging')
    .option('--force', 'развернуть без подтверждения')
    .option('-u, --url <url>', 'адрес развёртывания')
    .action(async (options) => {
      const env = options.env || 'staging';

      if (env === 'production' && !options.force) {
        if (!process.stdin.isTTY) {
          throw new CliError('для развёртывания в production требуется флаг --force');
        }

        logger.warn('Вы собираетесь развернуть проект в production!');

        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Продолжить?',
            default: false
          }
        ]);

        if (!answers.proceed) {
          logger.warn('Развёртывание отменено');
          process.exitCode = 1;
          return;
        }
      }

      const showUi = Boolean(process.stderr.isTTY);
      let spinner = null;

      try {
        if (showUi) {
          spinner = ora({
            text: 'Развёртывание...',
            stream: process.stderr
          }).start();
        }

        await sleep(showUi ? 700 : 0);

        const result = deployProject({
          env,
          url: options.url
        });

        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        logger.success('Развёрнуто успешно');
        logger.log(`URL: ${result.url}`);
      } catch (error) {
        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        throw error;
      }
    });
};
