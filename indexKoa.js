const Koa = require('koa');
const app = new Koa();

const date = new Date();

const day = String(date.getDate()).padStart(2, '0');
const month = String(date.getMonth() + 1).padStart(2, '0'); // +1, так как месяцы идут с 0
const year = date.getFullYear();

app.use(async ctx => {
  ctx.body = `Лабораторная работа №15\nГруппа: 478\nДата: ${day}.${month}.${year}`;
});

app.listen(3000);

if (app){
  console.log("Server was launched seccsesfully");
}