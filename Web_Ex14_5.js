const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const VARIANT = 20;
const SOURCE_DIR = path.join('.', `source_${VARIANT}`);
const BACKUP_DIR = path.join('.', `backup_${VARIANT}`);
const CHUNK_SIZE = 512 * 1024;
const STREAM_EXTENSIONS = ['.txt', '.js', '.json'];
const PLAIN_EXTENSIONS = ['.jpg', '.png', '.gif'];

function randomContent(size) {
    return crypto.randomBytes(size);
}

async function createTestStructure() {
    await fsp.mkdir(SOURCE_DIR, { recursive: true });

    const manifest = { generatedAt: new Date().toISOString(), variant: VARIANT, files: [] };

    const extensions = ['.txt', '.js', '.json', '.jpg', '.png', '.gif', '.md', '.css', '.html', '.log'];
    for (let i = 1; i <= 20; i++) {
        const ext = extensions[i % extensions.length];

        const size = i === 5 || i === 15 ? 1024 * 1024 + 100 * 1024 : 1024 * (10 + i * 5);
        const fileName = `file_${i}${ext}`;
        const filePath = path.join(SOURCE_DIR, fileName);
        await fsp.writeFile(filePath, randomContent(size));
        manifest.files.push({ name: fileName, path: filePath, size, extension: ext });
    }

    for (let i = 1; i <= 3; i++) {
        const subDir = path.join(SOURCE_DIR, `subfolder_${i}`);
        await fsp.mkdir(subDir, { recursive: true });
        const fileName = `nested_${i}.txt`;
        const filePath = path.join(subDir, fileName);
        const size = 1024 * (5 + i);
        await fsp.writeFile(filePath, randomContent(size));
        manifest.files.push({ name: fileName, path: filePath, size, extension: '.txt' });
    }

    await fsp.writeFile(path.join(SOURCE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    return manifest;
}

function copyViaStream(src, dest) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(src);
        const writeStream = fs.createWriteStream(dest);
        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        readStream.pipe(writeStream);
    });
}

async function copyPlain(src, dest) {
    await fsp.copyFile(src, dest);
}

async function copyInChunks(src, dest) {
    const readStream = fs.createReadStream(src, { highWaterMark: CHUNK_SIZE });
    const writeStream = fs.createWriteStream(dest);

    return new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
            writeStream.write(chunk);
        });
        readStream.on('error', reject);
        writeStream.on('error', reject);
        readStream.on('end', () => {
            writeStream.end();
        });
        writeStream.on('finish', resolve);
    });
}

async function listFilesRecursive(dir, base = dir) {
    const result = [];
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...(await listFilesRecursive(fullPath, base)));
        } else {
            result.push(path.relative(base, fullPath));
        }
    }
    return result;
}

async function copyWithFiltering() {
    await fsp.mkdir(BACKUP_DIR, { recursive: true });

    const relativeFiles = await listFilesRecursive(SOURCE_DIR);
    let streamCount = 0;
    let plainCount = 0;
    let totalSize = 0;
    const byExt = {};

    console.log(`Обнаружено файлов: ${relativeFiles.length}`);

    for (let i = 0; i < relativeFiles.length; i++) {
        const rel = relativeFiles[i];
        const srcPath = path.join(SOURCE_DIR, rel);
        const destPath = path.join(BACKUP_DIR, rel);
        await fsp.mkdir(path.dirname(destPath), { recursive: true });

        const stat = await fsp.stat(srcPath);
        const ext = path.extname(rel);
        totalSize += stat.size;
        byExt[ext] = byExt[ext] || { count: 0, size: 0 };
        byExt[ext].count++;
        byExt[ext].size += stat.size;

        if (stat.size > 1024 * 1024) {

            await copyInChunks(srcPath, destPath);
            streamCount++;
        } else if (STREAM_EXTENSIONS.includes(ext)) {
            await copyViaStream(srcPath, destPath);
            streamCount++;
        } else if (PLAIN_EXTENSIONS.includes(ext)) {
            await copyPlain(srcPath, destPath);
            plainCount++;
        } else {

            await copyPlain(srcPath, destPath);
            plainCount++;
        }

        console.log(`Прогресс копирования: ${i + 1}/${relativeFiles.length} файлов`);
    }

    console.log('Копирование завершено!');
    console.log('\nСтатистика:');
    console.log(`- Скопировано файлов: ${relativeFiles.length}`);
    console.log(`- Потоковое/чанковое копирование: ${streamCount} файлов`);
    console.log(`- Обычное копирование: ${plainCount} файлов`);
    console.log(`- Общий размер: ${(totalSize / (1024 * 1024)).toFixed(2)} МБ`);

    return { relativeFiles, byExt };
}

function md5File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

async function compareDirectories() {
    const sourceFiles = await listFilesRecursive(SOURCE_DIR);
    const backupFiles = await listFilesRecursive(BACKUP_DIR);

    const sourceSet = new Set(sourceFiles);
    const backupSet = new Set(backupFiles);

    const added = sourceFiles.filter((f) => !backupSet.has(f));
    const removed = backupFiles.filter((f) => !sourceSet.has(f));
    const common = sourceFiles.filter((f) => backupSet.has(f));

    const matched = [];
    const modified = [];

    for (const rel of common) {
        const srcPath = path.join(SOURCE_DIR, rel);
        const backupPath = path.join(BACKUP_DIR, rel);
        const [srcHash, backupHash] = await Promise.all([md5File(srcPath), md5File(backupPath)]);

        if (srcHash === backupHash) {
            matched.push(rel);
        } else {
            modified.push(rel);
        }
    }

    return { matched, modified, added, removed };
}

async function saveSyncReport(result) {
    const lines = [
        `Отчёт синхронизации: ${SOURCE_DIR} <-> ${BACKUP_DIR}`,
        `Дата: ${new Date().toLocaleString('ru-RU')}`,
        '',
        `Совпадают: ${result.matched.length} файл(ов)`,
        `Изменены: ${result.modified.length} файл(ов)`,
        ...result.modified.map((f) => `  - ${f}`),
        `Добавлены: ${result.added.length} файл(ов)`,
        ...result.added.map((f) => `  - ${f}`),
        `Удалены: ${result.removed.length} файл(ов)`,
        ...result.removed.map((f) => `  - ${f}`),
    ];

    const reportPath = `sync_report_${VARIANT}.txt`;
    await fsp.writeFile(reportPath, lines.join('\n'), 'utf-8');
    return reportPath;
}

function createZipArchive() {
    return new Promise((resolve, reject) => {
        const zipPath = `backup_${VARIANT}.zip`;
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve({ zipPath, bytes: archive.pointer() }));
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(BACKUP_DIR, false);
        archive.finalize();
    });
}

async function main() {
    try {
        console.log(`Создание тестовой структуры: ${SOURCE_DIR}`);
        await createTestStructure();

        console.log(`\nИсходная директория: ${SOURCE_DIR}`);
        console.log(`Директория назначения: ${BACKUP_DIR}`);

        const startTime = Date.now();
        await copyWithFiltering();
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`- Время выполнения: ${elapsedSec} сек`);

        console.log('\nСравнение директорий:');
        const syncResult = await compareDirectories();
        console.log(`- Совпадают: ${syncResult.matched.length} файла`);
        console.log(`- Изменены: ${syncResult.modified.length} файла`);
        console.log(`- Добавлены: ${syncResult.added.length} файл`);
        console.log(`- Удалены: ${syncResult.removed.length} файлов`);

        const reportPath = await saveSyncReport(syncResult);
        console.log(`Отчёт сохранён: ${reportPath}`);

        const { zipPath, bytes } = await createZipArchive();
        console.log(`\nСоздан ZIP-архив: ${zipPath} (${(bytes / 1024).toFixed(2)} КБ)`);
    } catch (err) {
        console.error('Ошибка выполнения программы:', err.message);
    }
}

main();