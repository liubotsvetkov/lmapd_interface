'use strict';
'require fs';
'require ui';
'require uci';

return L.view.extend({
    title: "Remove Schedule",
    
    load: function() {
	let p = fs.exec_direct('/usr/share/lmapd/lmapctl.sh', [ 'status' ])
	.then(function(result) {
	    return fs.read_direct('/var/run/lmapd-state.json', 'json');
	});
	return L.resolveDefault(p, null);
    },
    render: function(data) {
	if (data) {
	    let schedules = data['ietf-lmap-control:lmap']['schedules']['schedule'];
	    let sched_rows = this.getSchedRows(schedules);
	    let no_sched_msg = this.getNoSchedMsg(sched_rows.length);
	    
	    return E([], [
		E('h2', [ 'Remove Schedule' ]),
		E('div', { 'class': 'cbi-section' }, [
		    E('div', { 'class': 'table' }, sched_rows),
		    no_sched_msg
		])
    	    ]);
    	}
    	else {
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
			    }).catch(function(err){
				window.location.reload();
			    });
			}
		    }, [ 'Start' ])
		])
	    ]);
    	}
    },
    addFooter: function() {
	return null;
    },
    getSchedRows: function(schedules) {
	let sched_rows = [];
	sched_rows.push(E('div', { 'class': 'tr' }, [
		E('div', { 'class': 'td middle' }, [ E('h6', [ 'Schedule name' ])]),
		E('div', { 'class': 'td middle' }, [ E('h6', [ 'Action name' ])]),
		E('div', { 'class': 'td middle' }, [ ' ' ])
	]));
	
	for (let schedule of schedules) {
	    if (!schedule['name'].startsWith('basic_schedule')) {
		continue;
	    }
	    for (let action of schedule['action']) {
		let start_index = action['name'].lastIndexOf('_') + 1;
		let user_task_name = action['name'].substr(start_index);
		sched_rows.push(E('div', { 'class': 'tr ' + user_task_name }, [
		    E('div', { 'class': 'td middle ', 'style': 'font-weight:bold' }, [ schedule['name'] ]),
		    E('div', { 'class': 'td middle ' }, [ action['name'] ]),
		    E('div', { 'class': 'td middle ' }, [ 
			E('button', {
			    'class': 'cbi-button cbi-button-negative ',
			    'click': () => {
				uci.load('lmapd').then(() => {
				    deleteTask(user_task_name);
				    uci.save().then(() => {
					uci.apply().then (() => {
					    convertUciToJson().then(() => {
						let taskRow = document.getElementsByClassName(user_task_name);
						taskRow[0].style.display = 'none';
						ui.addNotification(null, [
						    E('p', [ 'Task is successfully deleted' ])
						]);
					    });
					});
				    });
				});
				deleteResults(user_task_name, schedule['name'], action['name'])
				.then(() => {
					console.log('successfully deleted results');
				}).catch(() => {
					console.log('No results found');
				});
			    }
			}, [ 'Delete' ]
			)
		    ])
		]))
	    }
	}
	return sched_rows;
    },
    getNoSchedMsg: function(sched_rows_length) {
	let no_sched_msg = '';
	if (sched_rows_length < 2) {
	    no_sched_msg = E('p', { 'style': 'text-align: center;' }, [ 'No Schedules found' ]);	
	}
	return no_sched_msg;
    },
    startLmapd: function() {
	return fs.exec_direct('/etc/init.d/lmapd', [ 'start' ]); 
    }
});

function deleteTask(name) {
    uci.remove('lmapd', 'basic_option_' + name + '_ping_count');
    uci.remove('lmapd', 'basic_option_' + name + '_ping_size');
    uci.remove('lmapd', 'basic_option_' + name + '_tracert_max_hops');
    uci.remove('lmapd', 'basic_option_' + name + '_tracert_numeric');
    
    uci.remove('lmapd', 'basic_action_' + name);
    uci.remove('lmapd', 'basic_event_' + name);
    uci.remove('lmapd', 'basic_schedule_' + name);
}

function deleteResults(user_task_name, schedule_name, action_name) {
    console.log(user_task_name);
    console.log(schedule_name);
    console.log(action_name);
    return fs.exec_direct('/usr/bin/lua', [ '/usr/lib/lua/lmapd/delete_results.lua', 
	user_task_name, schedule_name, action_name ]);
}

function convertUciToJson() {
    return fs.exec_direct('lua', [ '/usr/lib/lua/lmapd/generateJson.lua' ]);
}
