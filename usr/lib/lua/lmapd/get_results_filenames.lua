local results = require "lmapd.results"

local action_results = results.get_data_for_action(arg[1], arg[2])
result_paths = ""
for path in action_results do
    result_paths = result_paths .. path .. ","
end
io.write(result_paths)