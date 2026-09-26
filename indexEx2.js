const fs = require('fs');
const path = require('path');
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const zlib = require('zlib');

const app = new Koa();
const router = new Router();
const PORT = 3000;

let books = [
    { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
    { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
    { id: 3, title: 'Анна Каренина', author: 'Толстой', year: 1877 },
];
let nextId = 4;

function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function readHtml(fileName) {
    return fs.readFileSync(path.join(fileName), 'utf-8');
}

async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || err.statusCode || 500;
        ctx.body = { error: err.message || 'Внутренняя ошибка сервера', status: ctx.status };
    }
}

async function logger(ctx, next) {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[${formatDate(new Date())}] ${ctx.method} ${ctx.path} ${ctx.status} - ${ms}ms`);
}

const RATE_LIMIT = 100;
const WINDOW_MS = 60 * 1000;
const requestLog = new Map();

async function rateLimiter(ctx, next) {
    const ip = ctx.ip;
    const now = Date.now();
    let entry = requestLog.get(ip);

    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + WINDOW_MS };
        requestLog.set(ip, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, RATE_LIMIT - entry.count);
    ctx.set('X-RateLimit-Limit', String(RATE_LIMIT));
    ctx.set('X-RateLimit-Remaining', String(remaining));
    ctx.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > RATE_LIMIT) {
        ctx.throw(429, 'Слишком много запросов, попробуйте позже');
    }

    await next();
}

router.get('/', (ctx) => {
    ctx.type = 'html';
    ctx.body = readHtml('index.html').replace('{{DATE}}', formatDate(new Date()));
});

router.get('/about', (ctx) => {
    ctx.type = 'html';
    ctx.body = readHtml('about.html');
});

router.get('/contacts', (ctx) => {
    ctx.type = 'html';
    ctx.body = readHtml('contacts.html');
});

router.get('/api/books/search', (ctx) => {
    const { author } = ctx.query;

    if (!author) {
        ctx.status = 400;
        ctx.body = { error: 'Параметр author обязателен' };
        return;
    }

    const found = books.filter((b) => b.author.toLowerCase() === author.toLowerCase());
    ctx.body = found;
});

router.get('/api/books', (ctx) => {
    ctx.body = books;
});

router.get('/api/books/:id', (ctx) => {
    const book = books.find((b) => b.id === Number(ctx.params.id));

    if (!book) {
        ctx.status = 404;
        ctx.body = { error: 'Книга не найдена' };
        return;
    }

    ctx.body = book;
});

router.post('/api/books', (ctx) => {
    const { title, author, year } = ctx.request.body || {};

    if (!title || !author || !year) {
        ctx.status = 400;
        ctx.body = { error: 'title, author и year обязательны' };
        return;
    }

    const book = { id: nextId++, title, author, year: Number(year) };
    books.push(book);
    ctx.status = 201;
    ctx.body = book;
});

router.put('/api/books/:id', (ctx) => {
    const book = books.find((b) => b.id === Number(ctx.params.id));

    if (!book) {
        ctx.status = 404;
        ctx.body = { error: 'Книга не найдена' };
        return;
    }

    const { title, author, year } = ctx.request.body || {};

    if (title === undefined && author === undefined && year === undefined) {
        ctx.status = 400;
        ctx.body = { error: 'Нужно передать хотя бы одно поле для обновления' };
        return;
    }

    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (year !== undefined) book.year = Number(year);

    ctx.body = book;
});

router.delete('/api/books/:id', (ctx) => {
    const index = books.findIndex((b) => b.id === Number(ctx.params.id));

    if (index === -1) {
        ctx.status = 404;
        ctx.body = { error: 'Книга не найдена' };
        return;
    }

    books.splice(index, 1);
    ctx.body = { message: 'Книга удалена' };
});

router.get('/error', () => {
    throw new Error('Тестовая синхронная ошибка');
});

router.get('/async-error', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error('Тестовая асинхронная ошибка');
});

app.use(errorHandler);
app.use(logger);
app.use(rateLimiter);
app.use(compress({
    threshold: 0,
    gzip: { flush: zlib.constants.Z_SYNC_FLUSH },
    deflate: { flush: zlib.constants.Z_SYNC_FLUSH },
    br: false,
}));
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});