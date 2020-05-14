local json_to_uci = {

}

function json_to_uci.add_quick_task_to_list(quick_name)
  local uci = require "uci".cursor()
  local quick_list = uci:get("lmapd", "quick_tasks", "task_names")
  if quick_list == nil then quick_list = {} end
  table.insert(quick_list, quick_name)
  uci:set("lmapd", "quick_tasks", "task_names", quick_list)
  uci:save("lmapd")
  uci:commit("lmapd")
end

function json_to_uci.validate_and_add_section(section_name, section_type)
  local uci = require "uci":cursor()
  if uci:get("lmapd", section_name) == nil then
    uci:set("lmapd", section_name, section_type)
    uci:save('lmapd')
    uci:commit('lmapd')
    return true
  end
  return false
end

function json_to_uci.replace_hyphens_for_uci(str)
  if str ~= nil then
    return string.gsub(str, "-", "_")
  end
end

function json_to_uci.add_action_to_actions_list(action_name)
  local uci = require "uci".cursor()
  local actions_list = uci:get("lmapd", "actions", "action_names")
  if actions_list == nil then actions_list = {} end
  table.insert(actions_list, action_name)
  uci:set("lmapd", "actions", "action_names", actions_list)
  uci:save("lmapd")
  uci:commit("lmapd")
end

function json_to_uci.add_action_uci(action_table)
  local uci = require "uci"
  local uci_to_json = require "lmapd.uci_to_json"
  local cur = uci:cursor()
  local action_name = action_table["name"]
  local action_task = action_table["task"]
  local action_destinations = action_table["destination"]
  local action_options = action_table["option"]
  local action_hostname = action_table['hostname']
  cur:set("lmapd", action_name, "action")
  if action_name ~= nil then cur:set("lmapd", action_name, "name", action_name) end
  if action_task ~= nil then cur:set("lmapd", action_name, "task", action_task) end
  if action_destinations ~= nil then cur:set("lmapd", action_name, "destination", action_destinations) end
  if action_hostname ~= nil then cur:set("lmapd", action_name, "host_name", action_hostname) end
  -- all options in action_options are options already in the config
  if action_options ~= nil and uci_to_json.get_table_length(action_options) > 0 then
    cur:set("lmapd", action_name, "task_options", action_options)
  end
  cur:save("lmapd")
  cur:commit("lmapd")
end

function json_to_uci.add_schedule_uci(schedule_table)
  local uci = require "uci"
  local cur = uci:cursor()
  local schedule_name = schedule_table["name"]
  schedule_name = json_to_uci.replace_hyphens_for_uci(schedule_name)
  cur:set("lmapd", schedule_name, "schedule")
  if schedule_name ~= nil then cur:set("lmapd", schedule_name, "name", schedule_name) end
  if schedule_table['start'] ~= nil then cur:set("lmapd", schedule_name, "start", schedule_table["start"]) end
  if schedule_table["execution_mode"] ~= nil then cur:set("lmapd", schedule_name, "execution_mode", schedule_table["execution_mode"]) end
  if schedule_table['action'] ~= nil then cur:set("lmapd", schedule_name, "action", schedule_table['action']) end
  cur:save('lmapd')
  cur:commit('lmapd')
end

--events = indexed list of event tables
function json_to_uci.validate_and_add_events(events)
  for idx, event in pairs(events) do
    event_name = json_to_uci.replace_hyphens_for_uci(event["name"])
    if(not json_to_uci.find_section_by_option("event", event_name, "name")) then
      json_to_uci.add_event_to_event_list_uci(event_name)
      json_to_uci.add_event_uci(event)
    end
  end
end

function json_to_uci.update_uci_from_json()
  local config_file = nixio.open("/lmapd-config.json", "r")
  local file_size = config_file:stat("size")
  local read_buffer = config_file:read(file_size)
  local events = (luci.jsonc.parse(read_buffer))["ietf-lmap-control:lmap"]["events"]["event"]
  json_to_uci.validate_and_add_events(events)
end

function json_to_uci.add_event_to_event_list_uci(event_name)
  local uci = require "uci"
  local cur = uci:cursor()
  events_list = cur:get("lmapd", "events", "event_names")
  if events_list == nil then events_list = {} end
  table.insert(events_list, event_name)
  cur:set("lmapd", "events", "event_names", events_list)
  cur:save("lmapd")
  cur:commit("lmapd")
end

--event table from JSON parser
function json_to_uci.add_event_uci(event_table)
  local uci = require "uci"
  local cur = uci:cursor()
  local event_name = event_table["name"]
  event_name = json_to_uci.replace_hyphens_for_uci(event_name)
  json_to_uci.validate_and_add_section(event_name, "event")
  cur:set("lmapd", event_name, "name", event_name)
  if event_table["random-spread"] ~= nil then
    cur:set("lmapd", event_name, "random_spread", event_table["random-spread"])
  end
  if event_table["cycle-interval"] ~= nil then
    cur:set("lmapd", event_name, "cycle_interval", event_table["cycle-interval"])
  end
  if event_table["periodic"] ~= nil then
    cur:set("lmapd", event_name, "event_type", '0')
    cur:set("lmapd", event_name, "interval", event_table["periodic"]["interval"])
  elseif event_table["calendar"] ~= nil then
    cur:set("lmapd", event_name, "event_type", '1')
    cur:set("lmapd", event_name, "month", event_table["calendar"]["month"])
    cur:set("lmapd", event_name, "day_of_month", event_table["calendar"]["day-of-month"])
    cur:set("lmapd", event_name, "day_of_week", event_table["calendar"]["day-of-week"])
    cur:set("lmapd", event_name, "hour", event_table["calendar"]["hour"])
    cur:set("lmapd", event_name, "minute", event_table["calendar"]["minute"])
    cur:set("lmapd", event_name, "second", event_table["calendar"]["second"])
  elseif event_table["one-off"] ~= nil then
    cur:set("lmapd", event_name, "event_type", '2')
    cur:set("lmapd", event_name, "time", event_table["one-off"]["time"])
  end
  cur:save("lmapd")
  cur:commit("lmapd")
end

function json_to_uci.add_option_uci(option_table)
  local uci = require "uci"
  local cur = uci:cursor()
  if json_to_uci.validate_and_add_section(option_table['id'], 'task_option') then
    cur:set("lmapd", option_table['id'], "id", option_table['id'])
  end
  if option_table['name'] ~= nil then cur:set("lmapd", option_table['id'], "name", option_table['name']) end
  if option_table['value'] ~= nil then cur:set("lmapd", option_table['id'], "value", option_table['value']) end
  cur:save("lmapd")
  cur:commit("lmapd")
end

function json_to_uci.add_task_to_capabilities_uci(task_name)
  local uci = require "uci"
  local cur = uci:cursor()
  tasks_list = cur:get("lmapd", "capabilities", "task_names")
  if tasks_list == nil then tasks_list = {} end
  table.insert(tasks_list, task_name)
  cur:set("lmapd", "capabilities", "task_names", tasks_list)
  cur:save("lmapd")
  cur:commit("lmapd")
end

function json_to_uci.add_task_uci(name, options, program, version)
  local uci = require "uci"
  local cur = uci:cursor()
  cur:set("lmapd", name, "task")
  cur:set("lmapd", name, "name", name)
  if program ~= nil then cur:set("lmapd", name, "program", program) end
  if version ~= nil then cur:set("lmapd", name, "version", version) end
  local options_list = {}
  if options ~= nil then
    for idx, val in pairs(options) do
      val["id"] = json_to_uci.replace_hyphens_for_uci(val["id"])
      table.insert(options_list, val["id"])
      json_to_uci.add_option_uci(val["id"], val["name"])
    end
    local uci_to_json = require "lmapd.uci_to_json"
    if uci_to_json.get_table_length(options_list) > 0 then
      cur:set("lmapd", name, "task_options", options_list)
    end
  end
  cur:save("lmapd")
  cur:commit("lmapd")
end

--This function assumes all of name, options, program, version are defined in the json
function json_to_uci.set_tasks_list(capabilities)
  local uci = require "uci"
  local cur = uci:cursor()
  for idx, cap in pairs(capabilities) do
    local task_name = cap["name"]
    task_name = json_to_uci.replace_hyphens_for_uci(task_name)
    local task_options = cap["option"]
    local task_program = cap["program"]
    local task_version = cap["version"]
    local bool_task_in_uci = cur:get("lmapd", task_name, "name")
    if (bool_task_in_uci == nil) then
      json_to_uci.add_task_uci(task_name, task_options, task_program, task_version)
      json_to_uci.add_task_to_capabilities_uci(task_name)
    end
  end
  cur:save("lmapd")
  cur:commit("lmapd")
end


--sets the global task_list to the list read from the capabilities section in the UCI
function json_to_uci.read_tasks_list()
  local uci = require "uci"
  local cur = uci:cursor()
  task_list = cur:get("lmapd", "capabilities", "task_names")
  return task_list
end

--[[
This function sets the global section_name to the section name of an
anonymous section by looking through the option of all
sections of a certain type, caveat of not using named sections
]]--
function json_to_uci.find_section_by_option(type, to_search_for, option)
  local uci = require "uci"
  local cur = uci:cursor()
  section_name = ""
  cur:foreach("lmapd", type,
  function(section)
    if section[option] == to_search_for then
      section_name = section['.name']
    end
  end
  )
  if(section_name == "") then
    return false -- if false, then section_name wasn't set
  else
    return true
  end
end

function json_to_uci.read_capabilities_json()
  local nixio = require "nixio"
  local json = require "luci.jsonc"
  local capabilities_file = nixio.open("/usr/share/lmapd/capabilities.json", "r")
  local file_size = capabilities_file:stat("size")
  local read_buffer = capabilities_file:read(file_size)
  local tasks = (json.parse(read_buffer))["ietf-lmap-control:lmap"]["capabilities"]["tasks"]
  return tasks
end

return json_to_uci
