const logger = require('../utils/logger');
const { displayPath, displayOutputPath } = require('../utils/paths');
const {
  VALID_TYPES,
  validateType,
  resolveReportPath,
  generateReport
} = require('../services/reportService');

module.exports = (program) => {
  program
    .command('generate')
    .description('сгенерировать отчёт')
    .option('-t, --type <type>', 'тип отчёта', 'html')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать что будет сделано без выполнения')
    .action((options, command) => {
      const settings = command.optsWithGlobals();

      validateType(settings.type);

      const target = resolveReportPath(settings.type, settings.output);

      logger.verbose(settings.verbose, 'Запуск генерации отчёта...');
      logger.verbose(settings.verbose, `Тип отчёта: ${settings.type}`);
      logger.verbose(settings.verbose, `Путь сохранения: ${displayPath(target)}`);

      if (settings.dryRun) {
        const result = generateReport({
          type: settings.type,
          output: settings.output,
          dryRun: true
        });

        logger.dryRun(`Будет сгенерирован отчёт типа: ${result.type}`);
        logger.dryRun(`Файл будет сохранён в: ${displayOutputPath(result.output)}`);
        logger.dryRun('Действия не выполнены (режим проверки)');
        return;
      }

      const result = generateReport({
        type: settings.type,
        output: settings.output,
        force: Boolean(settings.force)
      });

      logger.log(`Отчёт успешно сгенерирован: ${displayPath(result.output)}`);
    });
};

module.exports.VALID_TYPES = VALID_TYPES;
