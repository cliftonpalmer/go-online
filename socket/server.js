var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var db = require('./db.js');

app.ws('/ws', async function(ws, req) {
    ws.on('message', async function(msg) {
        console.log(msg);

        let parsed = JSON.parse(msg);
        var res = {};
        switch (parsed.type) {
            case "addMove":
                res = db.addMove(
                    parsed.data.session,
                    parsed.data.x,
                    parsed.data.y,
                    parsed.data.state,
                    );
                break;
            default:
                console.log("Unknown message type");
        }

        ws.send(JSON.stringify(res));
    });
});

app.listen(3000);
