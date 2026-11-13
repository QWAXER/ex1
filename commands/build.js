const ora = require('ora');
const logger = require('../utils/logger');
const { displayPath } = require('../utils/paths');
const { buildProject } = require('../services/buildService');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = (program) => {
  program
    .command('build')
    .description('собрать проект')
    .option('-c, --config <path>', 'путь к конфигурации', 'config.json')
    .option('-o, --out <dir>', 'каталог сборки')
    .option('--dry-run', 'показать что будет сделано без выполнения')
    .action(async (options, command) => {
      const settings = command.optsWithGlobals();
      const showUi = Boolean(process.stderr.isTTY);
      const verbose = Boolean(settings.verbose);
      let spinner = null;

      try {
        if (showUi) {
          spinner = ora({
            text: 'Сборка проекта...',
            stream: process.stderr
          }).start();
        }

        await sleep(showUi ? 600 : 0);

        logger.verbose(verbose, `Конфигурация: ${settings.config}`);
        logger.verbose(verbose, `Каталог сборки: ${settings.out || 'dist'}`);

        const startedAt = Date.now();
        const result = buildProject({
          config: settings.config,
          outDir: settings.out,
          dryRun: Boolean(settings.dryRun)
        });

        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        if (result.dryRun) {
          logger.dryRun(`Будет собран файл: ${displayPath(result.outputFile)}`);
          logger.dryRun('Файлы не изменены');
          return;
        }

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.success(`Сборка завершена за ${seconds}s`);
        logger.log(`Результат: ${displayPath(result.outputFile)}`);
      } catch (error) {
        if (spinner) {
          spinner.stop();
          spinner = null;
        }

        throw error;
      }
    });
};
