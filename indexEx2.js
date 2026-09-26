const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();
const PORT = 3000;

let users = [
    { id: 1, name: 'Иванов Иван', group: 'ББМО-01-23' },
    { id: 2, name: 'Петров Петр', group: 'ББМО-01-23' },
];
let nextId = 3;

function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message || 'Внутренняя ошибка сервера', status: ctx.status };
    }
}

async function logger(ctx, next) {
    const start = Date.now();
    try {
        await next();
    } finally {
        const ms = Date.now() - start;
        console.log(`[${formatDate(new Date())}] ${ctx.method} ${ctx.path} - ${ms}ms`);
    }
}

async function auth(ctx, next) {
    if (!ctx.get('Authorization')) {
        ctx.throw(401, 'Требуется авторизация');
    }
    await next();
}

router.get('/api/users', (ctx) => {
    ctx.body = users;
});

router.post('/api/users', (ctx) => {
    const { name, group } = ctx.request.body || {};

    if (!name || !group) {
        ctx.status = 400;
        ctx.body = { error: 'name и group обязательны' };
        return;
    }

    const user = { id: nextId++, name, group };
    users.push(user);
    ctx.status = 201;
    ctx.body = user;
});

router.put('/api/users/:id', (ctx) => {
    const user = users.find((u) => u.id === Number(ctx.params.id));

    if (!user) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }

    const { name, group } = ctx.request.body || {};
    if (!name || !group) {
        ctx.status = 400;
        ctx.body = { error: 'name и group обязательны' };
        return;
    }

    user.name = name;
    user.group = group;
    ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
    const index = users.findIndex((u) => u.id === Number(ctx.params.id));

    if (index === -1) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }

    users.splice(index, 1);
    ctx.body = { message: 'Пользователь удалён' };
});

router.get('/protected', auth, (ctx) => {
    ctx.body = { message: 'Доступ разрешён' };
});

router.get('/error', () => {
    throw new Error('Тестовая ошибка');
});

app.use(errorHandler);
app.use(logger);
app.use(bodyParser());
app.use(router.routes());

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});