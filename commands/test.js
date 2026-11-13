const ora = require('ora');
const logger = require('../utils/logger');
const { runTests } = require('../services/testService');

module.exports = (program) => {
  program
    .command('test')
    .description('запустить тесты')
    .option('--no-coverage', 'не собирать покрытие')
    .action(async (options) => {
      const showUi = Boolean(process.stderr.isTTY);
      let spinner = null;

      try {
        if (showUi) {
          spinner = ora({
            text: 'Запуск тестов...',
            stream: process.stderr
          }).start();
        }

        const result = await runTests({
          coverage: options.coverage
        });

        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        logger.success(`Пройдено: ${result.passed}/${result.total} тестов`);

        if (result.coverage !== null) {
          logger.success(`Покрытие: ${result.coverage}%`);
        }

        if (!result.success) {
          logger.error(`Провалено тестов: ${result.failed}`);
          process.exitCode = 1;
        }
      } catch (error) {
        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        throw error;
      }
    });
};
