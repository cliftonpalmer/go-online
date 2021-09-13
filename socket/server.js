const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'db', 
    user: 'root', 
    password: 'admin',
    connectionLimit: 5
});

var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

async function testdb() {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT 1 as val");
        console.log(rows); //[ {val: 1}, meta: ... ]
        return rows;
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.end();
    }
}

app.ws('/ws', async function(ws, req) {
    ws.on('message', async function(msg) {
        console.log(msg);
        res = testdb();
        ws.send(JSON.stringify({
            "append" : true,
            "returnText" : res
        }));
    });
});

app.listen(3000);
