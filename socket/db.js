const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'db', 
    user: 'socket',
    password: 'socketpw',
    connectionLimit: 5
});

async function testdb() {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT 1 as val");
        console.log(rows); //[ {val: 1}, meta: ... ]

        var res = await conn.query(
            "CREATE TABLE IF NOT EXISTS go.myTable ( id INT, tag VARCHAR(255) )"
        );
        console.log(res);

        res = await conn.query("INSERT INTO go.myTable value (?, ?)", [1, "mariadb"]);
        console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) return conn.end();
    }
}

async function addMove(session_id, pos_x, pos_y, state) {
    let conn;
    try {
        conn = await pool.getConnection();

        var res = await conn.query(`
CREATE TABLE IF NOT EXISTS
go.state (
    session_id INT UNSIGNED,
    x TINYINT UNSIGNED,
    y TINYINT UNSIGNED,
    state ENUM('empty', 'white', 'black'),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(session_id, x, y)
);
        `);
        console.log(res);

        res = await conn.query(`
INSERT INTO go.state (session_id, x, y, state)
values (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
state = VALUES(state);
        `, [session_id, pos_x, pos_y, state]);
        console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }
        return res;
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) return conn.end();
    }
}

exports.testdb = testdb;
exports.addMove = addMove;
