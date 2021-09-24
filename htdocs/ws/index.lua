require "apache2"
require "string"

json = require "json"

--[[
     This is the default method name for Lua handlers, see the optional
     function-name in the LuaMapHandler directive to choose a different
     entry point.
--]]

function type_move(session, x, y, state)
    print("You called type_move")
end

function type_new(session)
    print("You called type_new")
end

ws_types = {
    move = type_move,
    new = type_new
}

function handle(r)
    if r:wsupgrade() then
        -- write something to the client
        r:wswrite("Welcome to websockets!")

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
            f(table.unpack(ds.data))
        end

        r:wsclose()  -- goodbye!
    end
    return apache2.OK
end
