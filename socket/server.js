var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var db = require('./db.js');

app.ws('/ws', async function(ws, req) {
    ws.on('message', async function(msg) {
        db.testdb();
        ws.send(JSON.stringify({
            "returnText" : "You've found the root route!"
        }));
    });
});

app.listen(3000);
