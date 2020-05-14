local nfs = require "nixio.fs"
local user_task_name = arg[1]
local schedule_name = arg[2]
local action_name = arg[3]

local schedule_path = "/tmp/lmapd/" .. schedule_name
local action_path = "/tmp/lmapd/" .. schedule_name .. "/" .. action_name

local workspace_path = "/tmp/lmapd/report_primary"
local data_pattern = workspace_path .. "/*-" .. action_name .. ".data"
local meta_pattern = workspace_path .. "/*-" .. action_name .. ".meta"
local data_paths = nfs.glob(data_pattern)
local meta_paths = nfs.glob(meta_pattern)

for data_path in data_paths do 
    nfs.remove(data_path)
end
for meta_path in meta_paths do
    nfs.remove(meta_path)
end

nfs.remove(action_path)
nfs.remove(schedule_path)
