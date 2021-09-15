var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var db = require('./db');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollStatefulChange(ws, session_id) {
    let conn;
    try {
        conn = await db.pool.getConnection();
        var lastUpdated = 0;
        while(true) {
            var res = await conn.query(`
select UNIX_TIMESTAMP(MAX(updated_at)) as last_updated
from go.state
where session_id = ?;
            `, [session_id]);
            console.log(res);
            let updatedAt = res[0].last_updated;
            if ( updatedAt > lastUpdated) {
                console.log("websocket poll: board updated!");
                lastUpdated = updatedAt;
                res = await db.getBoardState(session_id);
                ws.send(JSON.stringify({
                    "type": "getBoardState",
                    "data": res
                }));
            }
            await sleep(1000);
        }
    } catch(err) {
        console.log(`websocket poll error: ${err}`);
    } finally {
        if (conn) conn.end();
    } 
}

app.ws('/ws', async function(ws, req) {
    // TODO: poll for stateful change and notify clients to update their boards
    var session_id = 0;
    pollStatefulChange(ws, 0);

    ws.on('message', async function(msg) {
        console.log(`ws message: ${msg}`);

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
                console.log("ws message: Unknown message type: " + type);
        }

        ws.send(JSON.stringify({
            "type": type,
            "data": res
        }));
    });
});

app.listen(3000);
