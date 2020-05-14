'use strict';
'require uci';
'require form';
'require ui';
'require dom';
'require fs';
'require validation';

let formData = {
    basic_add: {
	name: null,
	action_task: null,
	event_type: null,
	interval: null,
	months: null,
	calendar_month: null,
	days: null,
	calendar_day_of_week: null,
	calendar_day_of_month: null,
	calendar_every_hour: null,
	calendar_hour: null,
	calendar_every_minute: null,
	calendar_minute:null,
	calendar_every_second: null,
	calendar_second: null,
	host_name: null,
	ping_count: null,
	ping_size: null,
	tracert_max_hops: null,
	tracert_numeric: null
    }
};

function convertUciToJson() {
    return fs.exec_direct('lua', [ '/usr/lib/lua/lmapd/generateJson.lua' ]);
}

function validate_and_add_section(section_name, section_type) {
    if (!uci.get('lmapd', section_name)) {
	uci.add('lmapd', section_type, section_name);
	return true;
    }
    return false;
}

function add_option_uci(option_table) {
    if (option_table.id) {
	if (validate_and_add_section(option_table.id, 'task_option')) {
	    uci.set('lmapd', option_table.id, 'id', option_table.id);
	}
	if (option_table.name) {
	    uci.set('lmapd', option_table.id, 'name', option_table.name);
	}
	if (option_table.value) {
	    uci.set('lmapd', option_table.id, 'value', option_table.value);
	}
    }
}

function add_action_uci(action) {
    validate_and_add_section(action.name, 'action');
    if (action.name) {
	uci.set('lmapd', action.name, 'name', action.name);
    }
    if (action.task) {
	uci.set('lmapd', action.name, 'task', action.task);
    }
    if (action.destination) {
	uci.set('lmapd', action.name, 'destination', action.destination);
    }
    if (action.hostname) {
	uci.set('lmapd', action.name, 'host_name', action.hostname);
    }
    if (action.option && action.option.length > 0) {
	uci.set('lmapd', action.name, 'task_options', action.option);
    }
}

function add_event_uci(event_table) {
    validate_and_add_section(event_table.name, 'event');
    uci.set('lmapd', event_table.name, 'name', event_table.name);
    if (event_table.periodic) {
	uci.set('lmapd', event_table.name, 'event_type', '0');
	uci.set('lmapd', event_table.name, 'interval', event_table.periodic.interval);
    }
    else if (event_table.calendar) {
	uci.set('lmapd', event_table.name, 'event_type', '1');
	uci.set('lmapd', event_table.name, 'month', event_table.calendar.month);
	if (event_table.calendar.day_of_month) {
	    uci.set('lmapd', event_table.name, 'day_of_month', event_table.calendar.day_of_month);    
	}
	if (event_table.calendar.day_of_week) {
	    uci.set('lmapd', event_table.name, 'day_of_week', event_table.calendar.day_of_week);
	}
	uci.set('lmapd', event_table.name, 'hour', event_table.calendar.hour);
	uci.set('lmapd', event_table.name, 'minute', event_table.calendar.minute);
	uci.set('lmapd', event_table.name, 'second', event_table.calendar.second);
    }
    else if (event_table.immediate) {
	uci.set('lmapd', event_table.name, 'event_type', '2');
    }
}

function add_schedule_uci(schedule_table) {
    validate_and_add_section(schedule_table.name, 'schedule');
    if (schedule_table.name) {
	uci.set('lmapd', schedule_table.name, 'name', schedule_table.name);
    }
    if (schedule_table.start) {
	uci.set('lmapd', schedule_table.name, 'start', schedule_table.start);
    }
    if (schedule_table.execution_mode) {
	uci.set('lmapd', schedule_table.name, 'execution_mode', schedule_table.execution_mode);
    }
    if (schedule_table.action) {
	uci.set('lmapd', schedule_table.name, 'action', schedule_table.action);	
    }
}

return L.view.extend({
    load: function() {
	//check if lmapd is working
	fs.read_direct('/var/run/lmapd.pid')
	.catch(() => {
	    ui.showModal('LMAPD', [
		E('p', [ 'LMAPD is not running!' ]),
		E('div', { 'class': 'right' }, [
		    E('button', {
			'class': 'cbi-button cbi-button-primary',
			'click': () => {
			    this.startLmapd()
			    .then(function(res) {
				ui.hideModal();
				window.location.reload();
			    })
			    .catch(function(err) {
				window.location.reload();
			    });
			}
		    }, [ 'Start' ])
		])
	    ]);
	});
	return L.resolveDefault(uci.load('lmapd'), null);
    },
    render: function(data) {
	var m, s, o;

	m = new form.JSONMap(formData, 'Add Schedule');
	s = m.section(form.NamedSection, 'basic_add');
	
	o = s.option(form.Value, 'name', 'Name of your schedule', 
	    'Schedule name will be prefixed by basic_schedule_*');
	o.datatype="uciname";
	o.validate = function(section_id, value) {
	    let event_name_form = "basic_event_" + value;
	    let action_name_form = "basic_action_" + value;
	    let schedule_name_form = "basic_schedule_" + value;
	    
	    if (uci.get('lmapd', event_name_form, 'name')
		|| uci.get('lmapd', action_name_form, 'name')
		|| uci.get('lmapd', schedule_name_form, 'name')) 
	    {	
		return 'A task named ' + value + ' already exists.';
	    }
	    return true;
	}
	
	o = s.option(form.ListValue, 'action_task', 'Measurement to perform');
	let task_sections = uci.sections('lmapd', 'task', (measurement) => {
	    if (measurement['.name'] !== 'lmap_reporter') {
		o.value(measurement['.name']);
	    }
	});
	
	o = s.option(form.Value, 'host_name', 'IP Address of target');
	o.datatype = 'ipaddr';
	o.default = '8.8.8.8';
	
	o = s.option(form.Value, 'ping_count', 'Number of pings');
	o.datatype = 'uinteger';
	o.datatype = 'range(1, 4294967295)';
	o.default = '4';
	o.depends('action_task', 'ping');
	
	o = s.option(form.Value, 'ping_size', 'Size of ping packet', 'bytes');
	o.datatype = 'uinteger';
	o.datatype = 'range(32, 65527)';
	o.default = '32';
	o.depends('action_task', 'ping');
	
	o = s.option(form.Value, 'tracert_max_hops', 'Maximum number of hops', 'hop limit');
	o.datatype = 'uinteger';
	o.datatype = 'range(1, 255)';
	o.default = '30';
	o.depends('action_task', 'traceroute');
	
	o = s.option(form.Flag, 'tracert_numeric', 'Numeric addresses', 
	'Prevent resolving IP addresses to hostnames');
	o.depends('action_task', 'traceroute');
	
	
	o = s.option(form.ListValue, 'event_type', 'Event type');
	o.value('periodic');
	o.value('calendar');
	o.value('immediate');
	o.datatype = 'string';
	
	o = s.option(form.Value, 'interval', 'Interval', 'seconds');
	o.depends('event_type', 'periodic');
	o.default = '300';
	o.datatype = 'uinteger';
	o.datatype = 'min(1)';
	
	o = s.option(form.ListValue, 'months', 'Months');
	o.value('all months');
	o.value('select');
	o.depends({event_type: 'calendar'});
	
	o = s.option(form.MultiValue, 'calendar_month', 'Month');
	o.value('1', 'January');
	o.value('2', 'February');
	o.value('3', 'March');
	o.value('4', 'April');
	o.value('5', 'May');
	o.value('6', 'June');
	o.value('7', 'July');
	o.value('8', 'August');
	o.value('9', 'September');
	o.value('10', 'October');
	o.value('11', 'November');
	o.value('12', 'December');
	o.depends({event_type: 'calendar', months: 'select'});
	
	o = s.option(form.ListValue, 'days', 'Days');
	o.value('all days');
	o.value('select days of week');
	o.value('select days of month');
	o.depends({event_type: 'calendar'});
	
	o = s.option(form.MultiValue, 'calendar_day_of_month', 'Day of month');
	for (let i = 1; i < 32; i++) {
	    o.value(i.toString());
	}
	o.datatype = 'uinteger';
	o.depends({event_type: 'calendar', days: 'select days of month'});
	
	o = s.option(form.MultiValue, 'calendar_day_of_week', 'Weekday');
	o.value('1', 'Monday');
	o.value('2', 'Tuesday');
	o.value('3', 'Wednesday');
	o.value('4', 'Thursday');
	o.value('5', 'Friday');
	o.value('6', 'Saturday');
	o.value('0', 'Sunday');
	o.depends({event_type: 'calendar', days: 'select days of week'});
	
	o = s.option(form.ListValue, 'calendar_every_hour', 'Hours');
	o.value('all hours');
	o.value('select');
	o.depends('event_type', 'calendar');
	
	o = s.option(form.MultiValue, 'calendar_hour', 'Hour');
	for (let i = 0; i < 24; i++) {
	    o.value(i.toString());
	}
	o.datatype = 'uinteger';
	o.depends({event_type: 'calendar', calendar_every_hour: 'select'});
	
	o = s.option(form.ListValue, 'calendar_every_minute', 'Minutes');
	o.value('all minutes');
	o.value('select');
	o.depends('event_type', 'calendar');
	
	o = s.option(form.MultiValue, 'calendar_minute', 'Minute');
	for (let i = 0; i < 60; i++) {
	    o.value(i.toString());
	}
	o.datatype = 'uinteger';
	o.depends({event_type: 'calendar', calendar_every_minute: 'select'});
	
	o = s.option(form.ListValue, 'calendar_every_second', 'Seconds');
	o.value('all seconds');
	o.value('select');
	o.depends('event_type', 'calendar');
	
	o = s.option(form.MultiValue, 'calendar_second', 'Second');
	for (let i = 0; i < 60; i++) {
	    o.value(i.toString());
	}
	o.datatype = 'uinteger';
	o.depends({event_type: 'calendar', calendar_every_second: 'select'});
	
	return m.render();
    },
    handleSave: function() {
	let map = document.querySelector('.cbi-map');
	
	return dom.callClassMethod(map, 'save').then(function() {
	    let data = formData.basic_add;
	    
	    //validate input data
	    if (!data.name) {
		ui.addNotification(null, E('p', 'No name provided!'), 'danger');
		return;
	    }
	    if (!data.host_name) {
		return alert('No host_name provided!');
	    }
	    if (data.action_task === 'ping') {
		if (!data.host_name || !data.ping_count || !data.ping_size) {
		    return alert('Missing properties for ping task!');
		}
	    }
	    if (data.action_task === 'traceroute') {
		if (!data.tracert_max_hops) {
		    return alert('No max hop value provided for traceroute task!');
		}
	    }
	    if (data.event_type === 'periodic') {
		if (!data.interval) {
		    return alert('No interval value provided for periodic event!');
		}
	    }
	    if (data.event_type === 'calendar') {
		if ((data.months === 'select' && !data.calendar_month)
		    || (data.days === 'select days of week' && !data.calendar_day_of_week)
		    || (data.days === 'select days of month' && !data.calendar_day_of_month)
		    || (data.calendar_every_hour === 'select' && !data.calendar_hour)
		    || (data.calendar_every_minute === 'select' && !data.calendar_minute)
		    || (data.calendar_every_second === 'select' && !data.calendar_second)) 
		{
		    return alert('Mising fields for calendar event!');
		}
	    }
	    
	    //put data in the correct format to write in the uci file
	    let action_table = {};
	    let event_table = {};
	    let schedule_table = {};
	    let options_list = [];
	    if (data.action_task === 'ping') {
		let ping_count_option = {};
		let ping_size_option = {};
			
		if (data.ping_count !== null) {
		    ping_count_option.id = 'basic_option_' + data.name + '_ping_count';
		    ping_count_option.name = '-c';
		    ping_count_option.value = parseInt(data.ping_count);
		    options_list.push('basic_option_' + data.name + '_ping_count');
		    add_option_uci(ping_count_option);
		}
		if (data.ping_size !== null) {
		    ping_size_option.id= 'basic_option_' + data.name + '_ping_size';
		    ping_size_option.name = '-s';
		    ping_size_option.value = parseInt(data.ping_size);
		    options_list.push('basic_option_' + data.name + '_ping_size');
		    add_option_uci(ping_size_option);
		}
	    }
	    if (data.action_task === 'traceroute') {
		let tracert_max_hops_option = {};
		let tracert_numeric_option = {};
		if (data.tracert_max_hops !== null) {
		    tracert_max_hops_option.id = 'basic_option_' + data.name + '_tracert_max_hops';
		    tracert_max_hops_option.name = '-m';
		    tracert_max_hops_option.value = parseInt(data.tracert_max_hops);
		    options_list.push('basic_option_' + data.name + '_tracert_max_hops');
		    add_option_uci(tracert_max_hops_option);
		}
		if (data.tracert_numeric === '1') {
		    tracert_numeric_option.id = 'basic_option_' + data.name + '_tracert_numeric';
		    tracert_numeric_option.name = '-n';
		    options_list.push('basic_option_' + data.name + '_tracert_numeric');
		    add_option_uci(tracert_numeric_option);
		}
	    }
	    
	    action_table.name = 'basic_action_' + data.name;
	    action_table.task = data.action_task;
	    let destinations_list = [];
	    destinations_list.push('report_primary');
	    action_table.destination = destinations_list;
	    action_table.hostname = data.host_name;
	    action_table.option = options_list;
	    
	    event_table.name = 'basic_event_' + data.name;
	    if (data.event_type) {
		event_table.event_type = data.event_type;
	    }
	    if (data.event_type === 'periodic') {
		event_table.periodic = {};
		if (data.interval) {
		    event_table.periodic.interval = parseInt(data.interval);
		}
	    }
	    else if (data.event_type === 'calendar') {
		event_table.calendar = {};
		if (data.months === 'all months') {
		    event_table.calendar.month = [];
		    event_table.calendar.month.push('*');
		}
		else {
		    event_table.calendar.month = data.calendar_month;
		}
		if (data.days === 'all days') {
		    event_table.calendar.day_of_month = [];
		    event_table.calendar.day_of_month.push('*');
		    event_table.calendar.day_of_week = [];
		    event_table.calendar.day_of_week.push('*');
		}
		else if (data.days === 'select days of week') {
		    event_table.calendar.day_of_week = data.calendar_day_of_week;
		}
		else if (data.days === 'select days of month') {
		    event_table.calendar.day_of_month = data.calendar_day_of_month;
		}
		if (data.calendar_every_hour === 'all hours') {
		    event_table.calendar.hour = [];
		    event_table.calendar.hour.push('*');
		}
		else {
		    event_table.calendar.hour = data.calendar_hour;
		}
		if (data.calendar_every_minute === 'all minutes') {
		    event_table.calendar.minute = [];
		    event_table.calendar.minute.push('*');
		}
		else {
		    event_table.calendar.minute = data.calendar_minute;
		}
		if (data.calendar_every_second === 'all seconds') {
		    event_table.calendar.second = [];
		    event_table.calendar.second.push('*');
		}
		else {
		    event_table.calendar.second = data.calendar_second;
		}	
	    }
	    else if (data.event_type === 'immediate') {
		event_table.immediate = true;
	    }
	
	    schedule_table.name = 'basic_schedule_' + data.name;
	    schedule_table.start = 'basic_event_' + data.name;
	    schedule_table.execution_mode = 'sequential';
	    let actions_list = [];
	    actions_list.push('basic_action_' + data.name);
	    schedule_table.action = actions_list;
	    
	    add_action_uci(action_table);
	    add_event_uci(event_table);
	    add_schedule_uci(schedule_table);
	
	    return uci.save().then(() => {
		//transfer the changes to the server
		uci.apply();
		ui.addNotification(null, [
		    E('p', [ 'Task is successfully added' ])
		]);
		convertUciToJson().then((res) => {
		    console.log(res);
		}).catch((err) => {
		    console.log(err.message);
		});
	    });
	});
    },
    startLmapd: function() {
	return fs.exec_direct('/etc/init.d/lmapd', [ 'start' ]);
    },
    handleSaveApply: null,
    handleReset: null
});