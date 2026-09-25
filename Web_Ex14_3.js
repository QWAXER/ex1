const fs = require('fs/promises');
const path = require('path');

const VARIANT = 20;

const targetDir = process.argv[2] || '.';

function formatSize(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} МБ`;
    if (kb >= 1) return `${kb.toFixed(2)} КБ`;
    return `${bytes} байт`;
}

async function scanDirectory(dir) {
    const stats = {
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        byExtension: {},
        allFiles: [],
        variantMatches: [],
    };

    async function walk(currentDir) {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (err) {
            console.error(`Не удалось прочитать директорию ${currentDir}: ${err.message}`);
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                stats.totalFolders++;
                await walk(fullPath);
            } else if (entry.isFile()) {
                let fileStat;
                try {
                    fileStat = await fs.stat(fullPath);
                } catch (err) {
                    console.error(`Не удалось получить данные файла ${fullPath}: ${err.message}`);
                    continue;
                }

                stats.totalFiles++;
                stats.totalSize += fileStat.size;

                const ext = path.extname(entry.name) || '(без расширения)';
                if (!stats.byExtension[ext]) {
                    stats.byExtension[ext] = { count: 0, size: 0 };
                }
                stats.byExtension[ext].count++;
                stats.byExtension[ext].size += fileStat.size;

                stats.allFiles.push({ path: fullPath, name: entry.name, size: fileStat.size });

                if (entry.name.includes(String(VARIANT))) {
                    stats.variantMatches.push(fullPath);
                }
            }
        }
    }

    await walk(dir);
    return stats;
}

async function main() {
    try {
        console.log(`Анализ директории: ${targetDir}`);

        const stats = await scanDirectory(targetDir);

        const topLargest = [...stats.allFiles].sort((a, b) => b.size - a.size).slice(0, 5);
        const topSmallest = [...stats.allFiles].sort((a, b) => a.size - b.size).slice(0, 5);

        console.log(`Общее количество папок: ${stats.totalFolders}`);
        console.log(`Общее количество файлов: ${stats.totalFiles}`);
        console.log(`Общий размер: ${formatSize(stats.totalSize)} (${stats.totalSize.toLocaleString('ru-RU')} байт)`);

        console.log('\nРасширения файлов:');
        for (const [ext, info] of Object.entries(stats.byExtension)) {
            console.log(`  ${ext}: ${info.count} файл(ов) (${formatSize(info.size)})`);
        }

        console.log('\nТоп-5 самых больших файлов:');
        topLargest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`));

        console.log('\nТоп-5 самых маленьких файлов:');
        topSmallest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`));

        console.log(`\nФайлы, содержащие в названии номер варианта (${VARIANT}): ${stats.variantMatches.length}`);
        stats.variantMatches.forEach((p) => console.log(`  - ${p}`));

        const report = {
            directory: targetDir,
            variant: VARIANT,
            totalFolders: stats.totalFolders,
            totalFiles: stats.totalFiles,
            totalSizeBytes: stats.totalSize,
            byExtension: stats.byExtension,
            top5Largest: topLargest,
            top5Smallest: topSmallest,
            variantMatches: stats.variantMatches,
            generatedAt: new Date().toISOString(),
        };

        const reportName = `report_${VARIANT}.json`;
        await fs.writeFile(reportName, JSON.stringify(report, null, 2), 'utf-8');
        console.log(`\nОтчёт сохранён: ${reportName}`);
    } catch (err) {
        console.error('Ошибка выполнения программы:', err.message);
    }
}

main();