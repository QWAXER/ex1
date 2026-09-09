const http = require('http');
const { EventEmitter } = require('events');
const logger = require('./logger');
const fs = require('fs');

let PI = 0;
let number = 1;
let NumInList = 23; /*Это мой номер в списке*/

for (let i = 0; i < NumInList; i++){
    PI += 1 / number;
    if (number > 0){
        number += 2;
    }
    else {
        number -= 2;
    }
    number *= -1;
}

PI *= 4;

class AppServer extends EventEmitter{
    start(port){
        this.server = http.createServer((req, res) => {
            this.emit('received',{url: req.url,method: req.method})
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`Филеня Кирилл\n478\n${PI}`);
    });
    this.server.listen(port, () => {
        this.emit('started', port);
    });
}
    stop(){
        this.server.close(() => {
            this.emit('closed');
    });
    }
}
const PORT = 1488; 

const appServer = new AppServer();

logger.setupLogger(appServer);

appServer.on('started', (port) => {
    console.log(`Server started on port ${port}`);
});

appServer.on('closed', () => {
    console.log(`Server stoped`);
});

appServer.on('received', (req) => {
    console.log(`Got received ${req.url} ${req.method}`);
});

appServer.start(PORT);

setTimeout(() => { 
appServer.stop(); 
}, 10000); 