var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var db = require('./db');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollStatefulChange(ws, session_id) {
    var lastUpdated  = 0;
    var rowCount = 0;
    while (true) {
        try {
            var res = await db.getMaxUpdatedState(session_id);
            var newRowCount = res[0].num_rows;
            var updatedAt = res[0].last_updated;

            // update board state of client if more moves
            // have been added since max last timestamp
            // If more moves have been added in <1 sec,
            // use the row count for the max last updated timestamp
            if (updatedAt > lastUpdated || rowCount < newRowCount) {
                lastUpdated = updatedAt;
                rowCount = newRowCount;
                ws.send(JSON.stringify({
                    "type": "board",
                    "data": await db.getBoardState(session_id)
                }));
            }
        } catch(err) {
            console.log(`websocket poll error: ${err}`);
        }
        await sleep(1000);
    }
}

app.ws('/ws', async function(ws, req) {
    // poll for stateful change and notify clients to update their boards
    var session_id = 0;
    db.initBoard();

    // send initial message to draw client board
    ws.send(JSON.stringify({
        "type": "board",
        "data": await db.getBoardState(session_id)
    }));

    ws.on('message', async function(msg) {
        let parsed;
        try {
            parsed = JSON.parse(msg);
            switch (parsed.type) {
                case "new":
                    ws.send(JSON.stringify({
                        "type": "new",
                        "data": await db.deleteSession(parsed.data.session)
                    }));
                    break;
                case "move":
                    await db.addMove(
                        parsed.data.session,
                        parsed.data.x,
                        parsed.data.y,
                        parsed.data.state,
                        );
                    // fall through and return new board state
                case "board":
                    ws.send(JSON.stringify({
                        "type": "board",
                        "data": await db.getBoardState(parsed.data.session)
                    }));
                    break;
                default:
                    console.log("ws message: Unknown message type: " + type);
            }
        } catch(err) {
            console.log(`ws message error: ${err}`);
        }
    });

    pollStatefulChange(ws, session_id);
});

app.listen(3000);
