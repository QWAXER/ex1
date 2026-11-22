const os = require('os');

const GROUP = '478';
const STUDENT = 'Филеня Кирилл';
const simulateLowMemory = process.argv.includes('--simulate-low-memory');

function printField(label, value) {
  console.log(`${label.padEnd(28)}${value}`);
}

function toGigabytes(bytes) {
  return bytes / 1024 ** 3;
}

function formatGigabytes(bytes) {
  return `${toGigabytes(bytes).toFixed(2)} ГБ`;
}

function averageFrequency(cpus) {
  if (cpus.length === 0) {
    return 0;
  }

  const total = cpus.reduce((sum, cpu) => sum + cpu.speed, 0);
  return Math.round(total / cpus.length);
}

function loadAverageLines(platform, loadavg) {
  const values = loadavg.map((value) => value.toFixed(2)).join('  ');
  const lines = [`Загрузка (1/5/15 мин):     ${values}`];

  if (platform === 'win32') {
    lines.push('Примечание:                os.loadavg() в Windows всегда возвращает 0.00');
    lines.push('                           Средняя загрузка доступна только в Linux и macOS');
  }

  return lines;
}

const cpus = os.cpus();
const platform = os.platform();
const totalMemory = os.totalmem();
const realFreeMemory = os.freemem();
const freeMemory = simulateLowMemory ? totalMemory * 0.1 : realFreeMemory;
const usedMemory = totalMemory - freeMemory;
const usedPercent = (usedMemory / totalMemory) * 100;
const freePercent = (freeMemory / totalMemory) * 100;

console.log(`=== Информация о процессоре (группа ${GROUP}) ===`);
printField('Студент:', STUDENT);
printField('Количество логических ядер:', cpus.length);
printField('Модель процессора:', cpus.length > 0 ? cpus[0].model.trim() : 'Не определена');
console.log('Частота каждого ядра:');
cpus.forEach((cpu, index) => {
  const label = `Ядро ${String(index + 1).padStart(2)}:`;
  console.log(`  ${label.padEnd(26)}${cpu.speed} МГц`);
});
printField('Средняя частота:', `${averageFrequency(cpus)} МГц`);

console.log('');
console.log('=== Информация о памяти ===');
printField('Общий объём:', formatGigabytes(totalMemory));
printField('Свободно:', formatGigabytes(freeMemory));
printField('Использовано:', `${formatGigabytes(usedMemory)} (${usedPercent.toFixed(1)}%)`);
printField('Свободно в процентах:', `${freePercent.toFixed(1)}%`);

console.log('');
console.log('=== Средняя загрузка системы ===');
loadAverageLines(platform, os.loadavg()).forEach((line) => console.log(line));

console.log('');
console.log(`Группа: ${GROUP}`);

if (freePercent < 20) {
  console.log(`ВНИМАНИЕ: свободной памяти меньше 20% (${freePercent.toFixed(1)}%)`);
  console.log('Рекомендуется закрыть неиспользуемые программы');
} else {
  console.log('Память в норме');
}

if (simulateLowMemory) {
  console.log('(демонстрационный режим --simulate-low-memory: показано 10% свободной памяти)');
}
