
const http = require('http'); 
const server = http.createServer((req, res) => { 
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); 

}); 
const PORT = 3000;

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

server.listen(PORT, () => { 
console.log(`Филеня Кирилл\n478`);
console.log(PI);
}); 