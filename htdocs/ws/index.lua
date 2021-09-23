require "apache2"
require "string"

--[[
     This is the default method name for Lua handlers, see the optional
     function-name in the LuaMapHandler directive to choose a different
     entry point.
--]]
function handle(r)
    if r:wsupgrade() then -- if we can upgrade:
        r:wswrite("Welcome to websockets!") -- write something to the client
        r:wsclose()  -- goodbye!
    end
end
