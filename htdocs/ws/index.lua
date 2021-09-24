require "apache2"
require "string"

driver = require "luasql.postgres"
json = require "json"

function init_board()
    print("You called init_board")
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    -- retrieve a cursor
    local res = assert(con:execute[[
CREATE TABLE IF NOT EXISTS board (
    session_id INTEGER,
    x INTEGER,
    y INTEGER,
    state SMALLINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(session_id, x, y)
)]])
    print(string.format("Init board: %s", res))

    con:close()
    env:close()
end

function type_move(data)
    print("You called type_move")
    local env = driver.postgres()
    local con = assert(env:connect("", "go", "socketpw", "db"))

    -- retrieve a cursor
    local res = assert(con:execute(string.format([[
INSERT INTO board (session_id, x, y, state)
VALUES (%i, %i, %i, %i)
ON CONFLICT (session_id, x, y) DO UPDATE
SET state = excluded.state,
    updated_at = NOW()
]], data.session, data.x, data.y, data.state)))

    con:close()
    env:close()

    return res
end

function type_new(session)
    print("You called type_new")
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
        r:wswrite("Welcome to websockets!")
        init_board()

        -- Sleep while nothing is being sent to us...
        while r:wspeek() == false do
            r.usleep(50000)
        end

        -- We have data ready!
        local line = r:wsread()
        print(line)

        local ds = json.decode(line)
        local f = ws_types[ds.type]
        if f then
            local res = f(ds.data)
            r:wswrite(json.encode(res))
        end

        r:wsclose()  -- goodbye!
    end
    return apache2.OK
end
