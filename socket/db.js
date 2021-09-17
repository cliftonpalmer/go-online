const mariadb = require('mariadb');
const dsn = {
    host: 'db', 
    user: 'socket',
    password: 'socketpw',
    connectionLimit: 10
};
const pool = mariadb.createPool(dsn);

async function deleteSession(session_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(
            "DELETE FROM go.state WHERE session_id = ?",
            [session_id]
        );
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.end();
    }
}

async function initBoard() {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(`
CREATE TABLE IF NOT EXISTS
go.state (
    session_id INT UNSIGNED,
    x TINYINT UNSIGNED,
    y TINYINT UNSIGNED,
    state TINYINT UNSIGNED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(session_id, x, y)
);
        `);
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.end();
    }
}

async function addMove(session_id, pos_x, pos_y, state) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(`
INSERT INTO go.state (session_id, x, y, state)
values (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
state = VALUES(state);
        `, [session_id, pos_x, pos_y, state]);
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.end();
    }
}

async function getBoardState(session_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(`
SELECT x, y, state from go.state where session_id = ?
        `, [session_id]);
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.end();
    }
}

exports.pool = pool;
exports.deleteSession = deleteSession;
exports.initBoard = initBoard;
exports.addMove = addMove;
exports.getBoardState = getBoardState;
