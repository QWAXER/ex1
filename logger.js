const fs = require('fs');
const path = require('path');

const PathToFile = path.join(__dirname, 'logs.txt');

const stream = fs.createWriteStream(PathToFile, {flags:'a', encoding:'utf8'});

function setupLogger(appServer){
    appServer.on('started', (port) => {
        const currentTime = new Date().toLocaleDateString();
        stream.write(`[${currentTime}]Server started on port ${port}\n`);
    });

    appServer.on('closed', () => {
        const currentTime = new Date().toLocaleDateString();
        stream.write(`[${currentTime}] Server stoped\n`);
    });

    appServer.on('received', (req) => {
        const currentTime = new Date().toLocaleDateString();
        stream.write(`[${currentTime}] Got received ${req.url} ${req.method}\n`);
    });
}

module.exports = {setupLogger};