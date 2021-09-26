require "apache2"
require "string"

driver = require "luasql.postgres"
json = require "json"

function getMaxUpdatedState(session)
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))
    local cur = assert(con:execute(string.format([[
SELECT
    count(*) AS num_rows,
    EXTRACT (EPOCH FROM x.max_updated_at) AS last_updated
FROM board b JOIN (
    SELECT MAX(updated_at) AS max_updated_at
    FROM board
    WHERE session_id = %s
) x
ON (x.max_updated_at = b.updated_at)
GROUP BY x.max_updated_at
]], session)))
    local row = cur:fetch({}, "a")

    cur:close()
    con:close()
    env:close()

    return row
end

function getBoardState(session)
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))
    local cur = assert(con:execute(string.format([[
SELECT x, y, state FROM board WHERE session_id = %s
]], session)))

    local rows = {}
    local row
    repeat
        row = cur:fetch({}, "a")
        if row then table.insert(rows, row) end
    until row == nil

    cur:close()
    con:close()
    env:close()

    return rows
end

function initBoard()
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    assert(con:execute[[
CREATE TABLE IF NOT EXISTS board (
    session_id INTEGER,
    x INTEGER,
    y INTEGER,
    state SMALLINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(session_id, x, y)
)]])

    con:close()
    env:close()
end

function type_move(data)
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    assert(con:execute(string.format([[
INSERT INTO board (session_id, x, y, state)
VALUES (%i, %i, %i, %i)
ON CONFLICT (session_id, x, y) DO UPDATE
SET state = excluded.state,
    updated_at = NOW()
]], data.session, data.x, data.y, data.state)))

    con:close()
    env:close()
end

function type_new(data)
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    assert(con:execute(string.format([[
DELETE FROM board WHERE session_id = %s
]], data.session)))

    con:close()
    env:close()
end

ws_types = {
    move = type_move,
    new = type_new
}

function pollStatefulChange(r, session)
    local lastUpdated = 0
    local rowCount = 0
    while true do
        print("Polling for board change")
        local res = getMaxUpdatedState(session)
        local newRowCount = tonumber(res.num_rows)
        local updatedAt = tonumber(res.last_updated)
        print(string.format("updated: %s .. %s", lastUpdated, res.last_updated))
        print(string.format("rows: %s .. %s", rowCount, res.num_rows))

        --[[
            update board state of client if more moves
            have been added since max last timestamp
            If more moves have been added in <1 sec,
            use the row count for the max last updated timestamp
        ]]--
        if (updatedAt > lastUpdated or rowCount < newRowCount) then
            print("Board changed!")
            lastUpdated = updatedAt
            rowCount = newRowCount
            r:wswrite(json.encode({
                type="board", 
                data=getBoardState(session)
            }))
        end

        coroutine.yield()
    end
end

--[[
     This is the default method name for Lua handlers, see the optional
     function-name in the LuaMapHandler directive to choose a different
     entry point.
--]]
function handle(r)
    if r:wsupgrade() then
        -- init coroutine for polling
        print("Websocket connected!")
        initBoard()
        local session = 0
        local poll = coroutine.create(pollStatefulChange)
        coroutine.resume(poll, r, session)

        -- Sleep while nothing is being sent to us...
        repeat
            print("Peeking")
            -- TODO: wspeek isn't returning false when I expect
            while r:wspeek() == false do
                print("looping")
                coroutine.resume(poll, r, session)
                r.usleep(50000)
            end

            -- We have data ready!
            print("Reading data")
            local line = r:wsread()
            print(line)

            local ds = json.decode(line)
            local f = ws_types[ds.type]
            if f then
                local data = f(ds.data)
                if data then r:wswrite(json.encode(data)) end

                r:wswrite(json.encode({
                    type="board", 
                    data=getBoardState(session)
                }))
            end
        until false

        r:wsclose()  -- goodbye!
    end
    return apache2.OK
end
