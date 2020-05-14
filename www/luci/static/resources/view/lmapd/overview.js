'use strict';
'require fs';
'require ui';

//convert timestamp to date and time 
function convertToTime(result_timestamp) {
    let months_arr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let date = new Date(result_timestamp*1000);
    let year = date.getFullYear();
    let month = months_arr[date.getMonth()];
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    let resultTime = month + '-' + day + '-' + year + '-' + hours + ':' 
	+ minutes.substr(-2) + ':' + seconds.substr(-2);
    return resultTime;
}

//fill the result drop-down list with paths to results files
function fillSelect(dest_schedule, schedule) {
    for (let action of schedule['action']) {
	fs.exec_direct('/usr/bin/lua', [ '/usr/lib/lua/lmapd/get_results_filenames.lua', 
	dest_schedule, action['name'] ])
	.then(function(results_filenames) {
	    let resArr = results_filenames.split(',');
	    let select = document.getElementsByClassName(action['name'] + '_select');
	    while (select[0].childNodes.length >= 1) {
		select[0].removeChild(select[0].firstChild);
	    }
	    resArr.forEach(value => {
		let result_timestamp = value.substring(
		    value.indexOf("report_primary/") + 15,
		    value.indexOf("-basic_schedule")
		);
		if (result_timestamp) {
		    let resultTime = convertToTime(result_timestamp);
		    let newOption = document.createElement('option');
		    newOption.value = value;
		    newOption.text = resultTime;
		    select[0].appendChild(newOption);
		}
	    });
	});
    }
}

//fetch result according to a given path and display in a modal
function showResult(path) {
    if (path && path.length > 0) {
	let meta_data_path = path.replace(".data", ".meta");
	let p1 = fs.read_direct(path);
	let p2 = fs.read_direct(meta_data_path);
	Promise.all([p1, p2])
	.then((texts) => {
	    ui.showModal('Result', [
		E('h3', [ 'Data' ]),
		E('pre', [ texts[0] ]),
		E('h3', [ 'Metadata' ]),
		E('pre', [ texts[1] ]),
		E('div', { 'class': 'right' }, [
		    E('button', {
			'class': 'cbi-button cbi-button-primary',
			'click': () => {
			    ui.hideModal();
			}
		    }, [ 'Close' ])
		])
	    ]);
	});
    }
    else {
	alert('No results found');
    }
}

return L.view.extend({
    title: "Overview",
    
    load: function() {
	let p = fs.exec_direct('/usr/share/lmapd/lmapctl.sh', [ 'status' ])
	.then(function(result) {
	    return fs.read_direct('/var/run/lmapd-state.json', 'json');
	});
	return L.resolveDefault(p, null);
    },
    render: function(data) {
	if (data) {
	    let agent = data['ietf-lmap-control:lmap']['agent'];
	    let capabilities = data['ietf-lmap-control:lmap']['capabilities'];
	    let cap_tag = capabilities['tag'];
	    let cap_tasks = capabilities['tasks']['task'];
	    let schedules = data['ietf-lmap-control:lmap']['schedules']['schedule'];
	    let tags_block = this.getTagsBlock(cap_tag);
	    let supp_task_block = this.getSuppTaskBlock(cap_tasks);
	    let sched_rows = this.getSchedRows(schedules);
	    let no_sched_msg = this.getNoSchedMsg(sched_rows.length);
	    
	    return E([], [
		E('h2', [ 'Overview' ]),
		E('div', { 'class': 'cbi-section' }, [
		    E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr rowstyle-1' }, [
			    E('div', { 'class': 'td' }, [ 'Agent ID' ]),
			    E('div', { 'class': 'td' }, [ agent['agent-id'] ])
			]),
			E('div', { 'class': 'tr rowstyle-2' }, [
			    E('div', { 'class': 'td' }, [ 'Version' ]),
			    E('div', { 'class': 'td' }, [ capabilities['version'] ])
			]),
			E('div', { 'class': 'tr rowstyle-1' }, [
			    E('div', { 'class': 'td' }, [ 'Last Started' ]),
			    E('div', { 'class': 'td' }, [ agent['last-started'] ])
			]),
			tags_block,
			supp_task_block
		    ])
		]),
		E('h2', [ 'Schedules' ]),
		E('div', { 'class': 'cbi-section' }, [
		    E('div', { 'class': 'table' }, sched_rows),
		    no_sched_msg
		])
    	    ]);
    	}
    	//in case lmapd is not running
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
    getTagsBlock: function(cap_tag) {
	let tags = '';
	let tags_block = '';
	if (cap_tag) {
	    cap_tag.forEach(element => {
		tags += element;
		if (cap_tag[cap_tag.length - 1] !== element) {
		    tags += ', ';
		}
	    });
	}
	if (tags.length > 0) {
	    tags_block = E('div', { 'class': 'tr rowstyle-2' }, [
		E('div', { 'class': 'td' }, [ 'Tags' ]),
		E('div', { 'class': 'td' }, [ tags ])
	    ]);
	}
	return tags_block;
    },
    getSuppTaskBlock: function(cap_tasks) {
	let tasks = '';
        let task_block = '';
        if (cap_tasks) {
    	    cap_tasks.forEach(element => {
    		tasks += element.name;
    		if (cap_tasks[cap_tasks.length - 1] !== element) {
    		    tasks += ', ';
    		}
    	    });
    	    if (tasks.length > 0) {
    		task_block = E('div', { 'class': 'tr rowstyle-1' }, [
    		    E('div', { 'class': 'td' }, [ 'Supported Tasks' ]),
    		    E('div', { 'class': 'td' }, [ tasks ])
    		]);
    	    }
    	    return task_block;
        }
    },
    getSchedRows: function(schedules) {
	let sched_rows = [];
	sched_rows.push(E('div', { 'class': 'tr' }, [
		E('div', { 'class': 'td middle' }, [ 'Schedule' ]),
		E('div', { 'class': 'td middle' }, [ 'Status' ]),
		E('div', { 'class': 'td middle' }, [ 'Number of Invocations' ]),
		E('div', { 'class': 'td middle' }, [ 'Last invocation time' ]),
		E('div', { 'class': 'td middle' }, [ 'Number of failures' ]),
		E('div', { 'class': 'td middle' }, [ 'Disk space (bytes)' ]),
		E('div', { 'class': 'td middle' }, [ ' ' ]),
		E('div', { 'class': 'td middle' }, [ ' ' ])
	]));
	
	for (let schedule of schedules) {
	    sched_rows.push(E('div', { 'class': 'tr' }, [
		E('div', { 'class': 'td middle' }, [ schedule['name'] ]),
		E('div', { 'class': 'td middle' }, [ schedule['state'] ]),
		E('div', { 'class': 'td middle' }, [ schedule['invocations'] ]),
		E('div', { 'class': 'td middle' }, [ schedule['last-invocation'] ]),
		E('div', { 'class': 'td middle' }, [ schedule['failures'] ]),
		E('div', { 'class': 'td middle' }, [ schedule['storage'] ]),
		E('div', { 'class': 'td middle' }, [ ' ' ]),
		E('div', { 'class': 'td middle' }, [ E('button', {
		    'class': 'cbi-button cbi-button-primary ' + schedule['name'] + '_btn',
		    'click': () => {
			fillSelect('report_primary', schedule);
			
			let actionElements = document.getElementsByClassName(schedule['name']);
			for (let i = 0; i < actionElements.length; i++) {
			    if (actionElements[i].style.display === 'none') {
				actionElements[i].style.display = 'table-cell';
			    } else {
				actionElements[i].style.display = 'none';
			    }    
			}
			let detailsBtn = document.getElementsByClassName(schedule['name'] + '_btn')[0];
			if (detailsBtn.innerText === "Details") {
			    detailsBtn.innerText = "Hide";
			}
			else {
			    detailsBtn.innerText = "Details";
			}
		    } }, [ 'Details' ])
		])
	    ]));
	    
	    sched_rows.push(E('div', { 'class': 'tr', 'style': 'background-color: #00A3E0; color: white;' }, [
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Action' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Status' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Number of Invocations' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Last invocation time' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Number of failures' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Disk space (bytes)' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 'Results' ]),
		E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ ' ' ])
	    ]));
	    for (let action of schedule['action']) {
		sched_rows.push(E('div', { 'class': 'tr', 'style': 'background-color: DCDCDC;' }, [
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['name'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['state'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['invocations'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['last-invocation'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['failures'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ action['storage'] ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 
			E('select', { 'name': 'results', 'class': action['name'] + '_select' },
			    [ '' ]
			)
		    ]),
		    E('div', { 'class': 'td middle ' + schedule['name'], 'style': 'display: none;' }, [ 
			E('button', {
			    'class': 'cbi-button cbi-button-primary ' + schedule['name'] + '_select_btn',
			    'click': () => { 
				let selected_element = document.getElementsByClassName(action['name'] + '_select');
				let path = null;
				if (selected_element[0].options[selected_element[0].selectedIndex]) {
				    path = selected_element[0].options[selected_element[0].selectedIndex].value;
				}
				showResult(path); 
			    } }, [ 'Show' ]
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