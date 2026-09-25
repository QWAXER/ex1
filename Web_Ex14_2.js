const fs = require('fs/promises');
const path = require('path');

const VARIANT = 20;
const ROOT = path.join('.', `project_${VARIANT}`);

const DIRS = [
    'src/modules',
    'src/components',
    'src/utils',
    'data/input',
    'data/output',
    'temp',
];

const DESCRIPTIONS = {
    'src': 'Корневая папка исходного кода проекта',
    'src/modules': 'Папка для хранения модулей приложения',
    'src/components': 'Папка для хранения компонентов интерфейса',
    'src/utils': 'Папка для вспомогательных утилит и функций',
    'data': 'Корневая папка данных проекта',
    'data/input': 'Папка для входных данных',
    'data/output': 'Папка для выходных (обработанных) данных',
    'temp': 'Папка для временных файлов',
};

async function createStructure() {
    for (const dir of DIRS) {
        const fullPath = path.join(ROOT, dir);
        await fs.mkdir(fullPath, { recursive: true });
    }
}

async function createInfoFiles() {
    const allFolders = ['src', 'src/modules', 'src/components', 'src/utils', 'data', 'data/input', 'data/output', 'temp'];

    for (const folder of allFolders) {
        const fullPath = path.join(ROOT, folder);
        const infoContent = `Назначение папки: ${DESCRIPTIONS[folder] || 'Без описания'}\nПуть: ${folder}\n`;
        await fs.writeFile(path.join(fullPath, 'info.txt'), infoContent, 'utf-8');

        const now = new Date().toLocaleString('ru-RU');
        const readmeContent = `# ${folder}\n\nДата создания: ${now}\n`;
        await fs.writeFile(path.join(fullPath, 'README.md'), readmeContent, 'utf-8');
    }
}

async function printTree(dir = ROOT, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        console.log(prefix + connector + entry.name + (entry.isDirectory() ? '/' : ''));

        if (entry.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            await printTree(path.join(dir, entry.name), newPrefix);
        }
    }
}

async function moveTempIntoData() {
    const from = path.join(ROOT, 'temp');
    const to = path.join(ROOT, 'data', 'temp');
    await fs.rename(from, to);
}

async function renameOutputToResults() {
    const from = path.join(ROOT, 'data', 'output');
    const to = path.join(ROOT, 'data', 'results');
    await fs.rename(from, to);
}

async function removeTemp() {
    const target = path.join(ROOT, 'data', 'temp');
    await fs.rm(target, { recursive: true, force: true });
}

async function main() {
    try {
        console.log(`Создание структуры проекта: ${ROOT}`);
        await createStructure();
        await createInfoFiles();

        console.log('\nИсходное дерево структуры:');
        console.log(ROOT + '/');
        await printTree();

        await moveTempIntoData();
        console.log('\nПапка temp перемещена в data/temp');

        await renameOutputToResults();
        console.log('Папка data/output переименована в data/results');

        await removeTemp();
        console.log('Папка data/temp удалена');

        console.log('\nОбновлённое дерево структуры:');
        console.log(ROOT + '/');
        await printTree();
    } catch (err) {
        console.error('Ошибка выполнения программы:', err.message);
    }
}

main();