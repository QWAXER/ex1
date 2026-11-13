const fs = require('fs');
const path = require('path');
const ora = require('ora');
const cliProgress = require('cli-progress');
const logger = require('../utils/logger');
const { displayPath } = require('../utils/paths');
const { processFile, expandFilePatterns } = require('../services/processService');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = (program) => {
  program
    .command('process')
    .description('обработать файлы и сформировать отчёт')
    .requiredOption('-F, --files <files...>', 'список файлов для обработки')
    .option('-o, --output <path>', 'файл результата', 'output.json')
    .action(async (options, command) => {
      const settings = command.optsWithGlobals();
      const cwd = process.cwd();
      const files = expandFilePatterns(settings.files || [], { cwd });
      const showUi = Boolean(process.stderr.isTTY && process.stdout.isTTY);
      const verbose = Boolean(settings.verbose);
      const results = [];
      let spinner = null;
      let bar = null;

      try {
        if (showUi) {
          spinner = ora({
            text: 'Обработка файлов...',
            stream: process.stderr
          }).start();
          await sleep(400);
          spinner.stop();
          spinner = null;

          bar = new cliProgress.SingleBar({
            format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta_formatted}',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            clearOnComplete: true,
            stream: process.stderr
          }, cliProgress.Presets.shades_classic);
          bar.start(files.length, 0);
        }

        for (const file of files) {
          const result = processFile(file, { cwd });
          results.push(result);

          if (bar) {
            bar.update(results.length);
          }

          if (result.status === 'ok') {
            if (showUi || verbose) {
              logger.success(`Файл ${file} обработан`);
            }
          } else {
            logger.error(`Файл ${file} ${result.reason}`);
          }

          if (showUi) {
            await sleep(120);
          }
        }

        if (bar) {
          bar.stop();
          bar = null;
        }

        if (showUi) {
          logger.success('Обработка завершена');
        }

        const processed = results.filter((item) => item.status === 'ok').length;
        const skipped = results.length - processed;
        const payload = {
          total: results.length,
          processed,
          skipped,
          files: results,
          generatedAt: new Date().toISOString()
        };
        const json = JSON.stringify(payload, null, 2);
        const target = path.resolve(cwd, settings.output || 'output.json');

        fs.writeFileSync(target, `${json}\n`, 'utf8');

        if (process.stdout.isTTY) {
          logger.log(`Результат сохранён: ${displayPath(target, cwd)}`);
        } else {
          process.stdout.write(`${json}\n`);
        }

        if (skipped > 0) {
          logger.warn(`Пропущено ${skipped} файл(ов)`);
          process.exitCode = 1;
        }
      } finally {
        if (bar) {
          bar.stop();
        }

        if (spinner && spinner.isSpinning) {
          spinner.stop();
        }
      }
    });
};
