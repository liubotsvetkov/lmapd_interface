local uci_to_json = {

}

--returns a list of section names of a given section type in lmapd
function uci_to_json.get_section_names(type_name)
  local uci = require "uci":cursor()
  local section_list = {}
  uci:foreach("lmapd", type_name,
  function(s)
    table.insert(section_list, s['.name'])
  end
  )
  return section_list
end

--only works for contiguously indexed arrays
function uci_to_json.get_table_length(table)
  local count = 0
  for _, _ in pairs(table) do
    count = count + 1
  end
  return count
end

function uci_to_json.replace_underscores_for_json(str)
  if str ~= nil then
    return string.gsub(str,"_", "-")
  end
end

function uci_to_json.to_number_on_table(table)
  -- allow wildcards
  if table ~= nil then
    if table[1] ~= nil then
      if table[1] == "*" then
        return table
      end
    end
  end
  for idx, val in pairs(table) do
    table[idx] = tonumber(val)
  end
  return table
end

function uci_to_json.add_if_not_nil(value, table, key)
  key = key or nil
  if key ~= nil and value ~= nil and table ~= nil then
    table[key] = value
  elseif value ~= nil and table ~= nil then
    table.insert(value)
  end
end

function uci_to_json.get_action_data(action_name)
  local uci = require "uci".cursor()
  local action_table = {}
  action_table['name'] = action_name
  local task = uci:get("lmapd", action_name, "task")
  local task_options = uci:get("lmapd", action_name, "task_options")
  action_table['task'] = task
  action_table['option'] = {}
  if task_options ~= nil then
    for idx, option_id in pairs(task_options) do
      local option_table = uci_to_json.get_option_data(option_id)
      action_table['option'][idx] = option_table
      option_list_len = uci_to_json.get_table_length(task_options)
    end
  else
    option_list_len = 0
  end

  local host_name = uci:get("lmapd", action_name, "host_name")
  host_name_table = {}
  host_name_table['id'] = 'hostname'
  host_name_table['value'] = host_name
  if host_name ~= nil then
    action_table['option'][option_list_len + 1] = host_name_table
  end
  local task_destinations = uci:get("lmapd", action_name, "destination")
  action_table['destination'] = task_destinations
  return action_table
end

function uci_to_json.get_schedule_data(schedule_name)
  local uci = require "uci".cursor()
  local schedule_table = {}
  schedule_table['name'] = schedule_name

  local schedule_start = uci:get("lmapd", schedule_name, "start")
  local schedule_end = uci:get("lmapd", schedule_name, "end")
  local schedule_duration = uci:get("lmapd", schedule_name, "duration")
  uci_to_json.add_if_not_nil(schedule_start, schedule_table, "start")
  uci_to_json.add_if_not_nil(schedule_end, schedule_table, "end")
  uci_to_json.add_if_not_nil(schedule_duration, schedule_table, "duration")

  local execution_mode = uci:get("lmapd", schedule_name, "execution_mode")
  uci_to_json.add_if_not_nil(execution_mode, schedule_table, "execution-mode")

  local actions_list = uci:get("lmapd", schedule_name, "action")
  schedule_table['action'] = {}
  if actions_list ~= nil then
    for idx, action_name in pairs(actions_list) do
      local action_table = uci_to_json.get_action_data(action_name)
      schedule_table['action'][idx] = action_table
    end
  end

  return schedule_table
end

function uci_to_json.get_schedules_data()
  local uci = require "uci".cursor()
  local schedules_list = uci_to_json.get_section_names('schedule')
  local schedules_table = {}
  schedules_table['schedule'] = {}
  for idx, sched_name in pairs(schedules_list) do
    local schedule_table = uci_to_json.get_schedule_data(sched_name)
    schedules_table['schedule'][idx] = schedule_table
  end
  return schedules_table
end

function uci_to_json.get_agent_data()
  local uci = require "uci"
  local cur = uci:cursor()
  local agent_table = {}
  local agent_id = cur:get("lmapd", "agent", "agent_id")
  local group_id = cur:get("lmapd", "agent", "group_id")
  local report_agent_id = cur:get("lmapd", "agent", "report_agent_id")
  local report_group_id = cur:get("lmapd", "agent", "report_group_id")

  if agent_id ~= nil then
    agent_table["agent-id"] = agent_id
  end
  if group_id ~= nil then
    agent_table["group-id"] = group_id
  end
  if report_agent_id ~= nil then
    if report_agent_id == '0' then
      agent_table["report-agent-id"] = false
    else
      agent_table['report-agent-id'] = true
    end
  end
  if report_group_id ~= nil then
    if report_group_id == '0' then
      agent_table["report-group-id"] = false
    else
      agent_table['report-group-id'] = true
    end
  end

  return agent_table
end

function uci_to_json.get_option_data(option_id)
  local uci = require "uci"
  local cur = uci:cursor()
  local option_table = {}
  option_table['id'] = option_id
  local option_name = cur:get("lmapd", option_id, "name")
  local option_value = cur:get("lmapd", option_id, "value")
  if option_name ~= nil then
    option_table['name'] = option_name
  end
  if option_value ~= nil then
    option_table['value'] = option_value
  end
  return option_table
end

function uci_to_json.get_task_data(task_name)
  local uci = require "uci"
  local cur = uci:cursor()
  local task_table = {}
  local task_program = cur:get("lmapd", task_name, "program")
  local task_options = cur:get("lmapd", task_name, "task_options")
  task_table['name'] = task_name
  if task_program ~= nil then
    task_table['program'] = task_program
  end
  task_table['option'] = {}
  if task_options ~= nil then
    for idx, option_id in pairs(task_options) do
      local option_table = uci_to_json.get_option_data(option_id)
      task_table['option'][idx] = option_table
    end
  end
  return task_table
end

function uci_to_json.get_tasks_data()
  local uci = require "uci"
  local cur = uci:cursor()
  local capabilities = cur:get("lmapd", "capabilities", "task_names")
  local tasks_table = {} --tasks vs task, look at lmapd-config.json for further info
  tasks_table['task'] = {}
  for idx, task_name in pairs(capabilities) do
      local task_table = uci_to_json.get_task_data(task_name)
      tasks_table['task'][idx] = task_table
  end
  return tasks_table
end

function uci_to_json.get_event_data(event_name)
  local uci = require "uci"
  local cur = uci:cursor()
  local event_table = {}
  event_table['name'] = event_name
  local event_type = cur:get("lmapd", event_name, "event_type")
  local random_spread = cur:get("lmapd", event_name, "random_spread")
  local cycle_interval = cur:get("lmapd", event_name, "cycle_interval")
  if random_spread ~= nil then
    event_table['random-spread'] = tonumber(random_spread)
  end
  if cycle_interval ~= nil then
    event_table['cycle-interval'] = tonumber(cycle_interval)
  end
  if event_type == '0' then
    event_table['periodic'] = {}
    local interval = cur:get("lmapd", event_name, "interval")
    event_table['periodic']['interval'] = tonumber(interval)
  elseif event_type == '1' then
    event_table['calendar'] = {}
    local month = cur:get("lmapd", event_name, "month")
    local day_of_month = cur:get("lmapd", event_name, "day_of_month")
    local day_of_week = cur:get("lmapd", event_name, "day_of_week")
    local hour = cur:get("lmapd", event_name, "hour")
    local minute = cur:get("lmapd", event_name, "minute")
    local second = cur:get("lmapd", event_name, "second")
    local timezone_offset = cur:get("lmapd", event_name, "timezone_offset")
    if timezone_offset ~= nil then
      event_table['calendar']['timezone-offset'] = timezone_offset
    end
    if month ~= nil then
      event_table['calendar']['month'] = uci_to_json.to_number_on_table(month)
    else
      event_table['calendar']['month'] = {}
    end
    if day_of_month ~= nil then
      event_table['calendar']['day-of-month'] = uci_to_json.to_number_on_table(day_of_month)
    else
      event_table['calendar']['day-of-month'] = {}
    end
    if day_of_week ~= nil then
      event_table['calendar']['day-of-week'] = uci_to_json.to_number_on_table(day_of_week)
    else
      event_table['calendar']['day-of-week'] = {}
    end
    if hour ~= nil then
      event_table['calendar']['hour'] = uci_to_json.to_number_on_table(hour)
    else
      event_table['calendar']['hour'] = {}
    end
    if minute ~= nil then
      event_table['calendar']['minute'] = uci_to_json.to_number_on_table(minute)
    else
      event_table['calendar']['minute'] = {}
    end
    if second ~= nil then
      event_table['calendar']['second'] = uci_to_json.to_number_on_table(second)
    else
      event_table['calendar']['second'] = {}
    end
  elseif event_type == "2" then
    event_table['immediate'] = {}
    event_table['immediate'][1] = null
  end
  return event_table
end

function uci_to_json.get_events_data()
  local uci = require "uci"
  local cur = uci:cursor()
  local events_table = {}
  events_table['event'] = {}
  local events_list = uci_to_json.get_section_names('event')
  for idx, event_name in pairs(events_list) do
    local event_table = uci_to_json.get_event_data(event_name)
    events_table['event'][idx] = event_table
  end
  return events_table
end

function uci_to_json.generate() --generates the lmapd-config.json from the current UCI file and restart lmapd
  local json = require "luci.jsonc"
  local json_to_uci = require "lmapd.json_to_uci"
  local nixio = require "nixio"
  local nixioFs = require "nixio.fs"
  local luci_sys = require "luci.sys"
  local json_table = {}
  json_table['ietf-lmap-control:lmap'] = {}
  local agent_table = uci_to_json.get_agent_data()
  json_table['ietf-lmap-control:lmap']['agent'] = agent_table
  local tasks_table = json_to_uci.read_capabilities_json()
  json_table['ietf-lmap-control:lmap']['tasks'] = tasks_table
  local events_table = uci_to_json.get_events_data()
  json_table['ietf-lmap-control:lmap']['events'] = events_table
  local schedules_table = uci_to_json.get_schedules_data()
  json_table['ietf-lmap-control:lmap']['schedules'] = schedules_table
  nixioFs.remove("/usr/share/lmapd/lmapd-config.json")
  local file = nixio.open("/usr/share/lmapd/lmapd-config.json", "w")
  file:write(json.stringify(json_table, true)) --true for pretty print
  file:close()
  luci_sys.call("/etc/init.d/lmapd stop > /dev/null")
  luci_sys.call("/etc/init.d/lmapd start > /dev/null")
end

return uci_to_json
