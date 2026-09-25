const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline');

const VARIANT = 20;
const LINE_COUNT = 100000;
const DATA_FILE = path.join('.', `data_${VARIANT}.txt`);
const PROCESSED_FILE = path.join('.', `processed_${VARIANT}.txt`);

async function fileExists(filePath) {
    try {
        await fsp.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function generateDataFile() {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(DATA_FILE, { encoding: 'utf-8' });
        stream.on('error', reject);
        stream.on('finish', resolve);

        for (let i = 1; i <= LINE_COUNT; i++) {
            const randomNum = Math.floor(Math.random() * 1000) + 1;
            stream.write(`${i}, ${randomNum}, Вариант ${VARIANT}\n`);
        }
        stream.end();
    });
}

async function processDataFile() {
    const stats = await fsp.stat(DATA_FILE);
    console.log(`Обработка файла: ${DATA_FILE}`);
    console.log(`Размер файла: ${(stats.size / (1024 * 1024)).toFixed(2)} МБ`);

    const readStream = fs.createReadStream(DATA_FILE, { highWaterMark: 64 * 1024, encoding: 'utf-8' });
    const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

    let sum = 0;
    let count = 0;
    let max = -Infinity;
    let min = Infinity;
    const numbers = [];

    let lastPercentReported = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        const parts = line.split(',').map((p) => p.trim());
        const num = parseInt(parts[1], 10);
        if (Number.isNaN(num)) continue;

        sum += num;
        count++;
        if (num > max) max = num;
        if (num < min) min = num;
        numbers.push(num);

        const percent = Math.floor((count / LINE_COUNT) * 100);
        if (percent >= lastPercentReported + 10) {
            lastPercentReported = percent - (percent % 10);
            console.log(`Прогресс: ${lastPercentReported}% (${count.toLocaleString('ru-RU')} строк обработано)`);
        }
    }

    console.log('Обработка завершена!');

    const average = sum / count;

    numbers.sort((a, b) => a - b);
    const mid = Math.floor(numbers.length / 2);
    const median = numbers.length % 2 === 0
        ? (numbers[mid - 1] + numbers[mid]) / 2
        : numbers[mid];

    return { sum, count, average, max, min, median };
}

async function saveResults(results) {
    const content = [
        `Результаты обработки файла ${DATA_FILE}`,
        `Всего строк: ${results.count}`,
        `Сумма чисел: ${results.sum}`,
        `Среднее значение: ${results.average.toFixed(2)}`,
        `Максимальное число: ${results.max}`,
        `Минимальное число: ${results.min}`,
        `Медиана: ${results.median}`,
    ].join('\n');

    await fsp.writeFile(PROCESSED_FILE, content, 'utf-8');
}

async function main() {
    try {
        const exists = await fileExists(DATA_FILE);
        if (!exists) {
            console.log(`Файл ${DATA_FILE} не найден, генерируем...`);
            await generateDataFile();
            console.log('Файл сгенерирован');
        }

        const startTime = Date.now();
        const results = await processDataFile();
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\nРезультаты:');
        console.log(`- Всего строк: ${results.count.toLocaleString('ru-RU')}`);
        console.log(`- Сумма чисел: ${results.sum.toLocaleString('ru-RU')}`);
        console.log(`- Среднее значение: ${results.average.toFixed(2)}`);
        console.log(`- Максимальное число: ${results.max}`);
        console.log(`- Минимальное число: ${results.min}`);
        console.log(`- Медиана: ${results.median}`);

        await saveResults(results);
        console.log(`Результаты сохранены в: ${PROCESSED_FILE}`);
        console.log(`Время выполнения: ${elapsedSec} сек`);
    } catch (err) {
        console.error('Ошибка выполнения программы:', err.message);
    }
}

main();