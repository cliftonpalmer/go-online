require "apache2"
require "string"

driver = require "luasql.postgres"
json = require "json"

function getBoardState(session)
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    -- retrieve a cursor
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

--[[
     This is the default method name for Lua handlers, see the optional
     function-name in the LuaMapHandler directive to choose a different
     entry point.
--]]
function handle(r)
    if r:wsupgrade() then
        -- write something to the client
        initBoard()
        local session = 0
        r:wswrite(json.encode({
            type="board", 
            data=getBoardState(session)
        }))

        -- Sleep while nothing is being sent to us...
        repeat
            while r:wspeek() == false do
                r.usleep(50000)
            end

            -- We have data ready!
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
