var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var db = require('./db.js');

app.ws('/ws', async function(ws, req) {
    ws.on('message', async function(msg) {
        console.log(msg);

        var parsed = JSON.parse(msg);
        var type = parsed.type;
        var res = [];
        switch (parsed.type) {
            case "addMove":
                res = await db.addMove(
                    parsed.data.session,
                    parsed.data.x,
                    parsed.data.y,
                    parsed.data.state,
                    );
                break;
            case "getBoardState":
                res = await db.getBoardState(
                    parsed.data.session
                    );
                break;
            default:
                console.log("Unknown message type: " + type);
        }

        console.log("Sending response:");
        console.log(res);
        ws.send(JSON.stringify({
            "type": type,
            "data": res
        }));
    });
});

app.listen(3000);
