const http = require('http');
const fs = require('fs');

const PORT = 8000;

const server = http.createServer((req, res) => {
    fs.readFile('index.html', (err, data) => {
        if(err){
            res.writeHead(500);
            return res.end("Error loading index.html");
        }

        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log("Web server running on port " + PORT);
});
