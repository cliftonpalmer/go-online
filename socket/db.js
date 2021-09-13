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

exports.testdb = testdb;
