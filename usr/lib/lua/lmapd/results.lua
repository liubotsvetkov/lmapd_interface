local results = {

}

function results.get_destination_schedules()
  local uci = require "uci".cursor()
  dest_scheds = {}
  uci.foreach("lmapd", "action",
  function(s)
    local action_dests = s['destination']
    if action_dests ~= nil then
      for _, destination in pairs(action_dests) do
        table.insert(dest_scheds, destination)
      end
    end
  end
  )
  return dest_scheds
end

function results.get_data_for_action(dest_schedule, action_name)
  local nfs = require "nixio.fs"
  local workspace_path = "/tmp/lmapd/" .. dest_schedule
  local data_pattern = workspace_path .. "/*-" .. action_name .. ".data"
  local meta_pattern = workspace_path .. "/*-" .. action_name .. ".meta"
  local data_paths = nfs.glob(data_pattern)
  local meta_paths = nfs.glob(meta_pattern)
  return data_paths
end

function results.read_results_data(path)
  local nix = require "nixio"
  local data_file = nix.open(path, "r")
  local readData = data_file:read(data_file:stat("size"))
  return readData
end

return results
