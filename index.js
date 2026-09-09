
const http = require('http'); 
const server = http.createServer((req, res) => { 
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); 

}); 
const PORT = 3000;

server.listen(PORT, () => { 
console.log(`Филеня Кирилл\n478`);
console.log(PI);
}); 
