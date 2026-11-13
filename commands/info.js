module.exports = (program) => {
  program
    .command('info')
    .description('вывести информацию о группе')
    .action(() => {
      const date = new Date().toISOString().slice(0, 10);
      process.stdout.write([
        'Группа: 478',
        'Студент: Филеня Кирилл',
        'Лабораторная работа: №17',
        `Дата: ${date}`
      ].join('\n') + '\n');
    });
};
