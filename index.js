const http = require('http'); /*Пишет nothing to commit, поэтому я этот коммент написал*/
const server = http.createServer((req, res) => { 
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); 
res.end('<h1>Привет, мир!</h1>'); 
}); 
const PORT = 3000; 
server.listen(PORT, () => { 
console.log(`Сервер запущен на http://localhost:${PORT}`); 
}); 