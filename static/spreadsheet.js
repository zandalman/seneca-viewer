//List of events in object format, to be passed to DataTables()
var events = configuration["example_data"];
//List of all event types
var eventTypes = configuration["types"];
//JSON object with format (eventType: [associated parameters])
var typeParameters = configuration["type_parameters"];
//List of all unique parameters
var allParameters = configuration["all_parameters"];

//The total number of events added is used as a unique event ID
var eventCount = 1;
    
//Define the DataTables() columns option for the event tables
//Sets the first two columns
//The first column holds ordering data
//Clicking the cells in the second deletes the corresponding row
var columnGenerate = [{
		"name": "sequence",
		"data": "sequence"
	},
	{
		"name": "delete",
		"data": "delete",
		"render": function (data, type, row) {
			var $delete = $("<div class='delete'>⠀</div>");
			return $delete.prop("outerHTML");
		}
	},

]

var activeFile;
    function generate(jsonText){
        $("#paramRepo").empty();
	    $("#paramSet").children(".pList").empty();
        var variables= [];
        var activeFile= JSON.parse(jsonText);
        $.each(activeFile, function (index, event) {
            subEvents=event["subEvents"];
            $.each(subEvents, function(index, subEvent){
                $("#paramSet").children(".pList").append("<span>"+subEvent["eventType"]+"</span>");
                $.each(subEvent, function(key, value){
                    if (key != "eventType"){
                        variables.push(value);
                    }
                });
            });
	    });
	    variables = [...new Set(variables)];
	    $.each(variables, function (index, variable) {
	        $("#paramRepo").append("<li>"+variable+"</li>");
	        $("#paramSet").children(".pList").append("<span>"+variable+" <input></span>");
	    });
    };


$(document).ready(function () {

    $("#table").find('th').hide();
    $("#paramSearch").hide();
    $("#clearAll").hide();

    $(document).on('click', "#generate", function(e){
       // generate($("#jsonDisplay").html());
       $('#table').DataTable().destroy();
       $('#table').find('tbody').remove();
       $("#paramRepo").find('span').remove();
       $("#table").find('th').show();
       $("#paramSearch").show();
       $("#clearAll").show();
        var table = $("#table").DataTable({
            "columns": [
                {"name": "name"},
                {"name": "sets"},
                {"name": "eventType"},
                {"name": "subEvent"},
                {"name": "Event"},
                {
                    "name": "value",
                    "render": function (data, type, row) {
                        if (type === 'display') {
                            return data;
                        } else {
                            return data;
                        }
                    }
                },
            ],
			"columnDefs": [{
					"defaultContent": "",
					"targets": "_all"
				},
				{
				    "visible": false,
				    "targets": [2,3,4]
				},
				{
					"className": "cell-border",
					"targets": "none"
				},
			],
			"dom": '<"top"Btip>',
			buttons: [],
			"bSort": true,
			serverSide: false,
			"paging": false,
             rowGroup: {
                dataSrc: [4,3]
            },
            colReorder: true,
            order: [[4]]
		});
        var jsonText = $("#jsonDisplay").html();
		var activeFile= JSON.parse(jsonText);
        $.each(activeFile, function (index, event) {
            var subEvents=event["subEvents"];
            var variables =[];
            $.each(subEvents, function(index2, subEvent){
                $.each(subEvent, function(key, value){
                    var eventType=subEvent["eventType"];
                    var inputType = configuration["original"][eventType][key];
                    var newRow = table.row.add([value, key, subEvent["eventType"], subEvent["name"], index, undefined]);
                    if (key != "eventType" && inputType == "set"){
                        if (!variables.includes(value)){
                            var $variableInput = $("<span>" + value + " <input></span>");
                            $variableInput.attr('varName', value);
                            $("#paramRepo").append($variableInput);
                            variables.push(value);
                        }

                        $(newRow.node()).addClass("selected");
                    }
                });
            });
	    });
        table.draw();
    });


    $(document).on('input', "#paramSearch", function(e){
         var table=$('#table').DataTable();
         table.search( $(this).val() ).draw();
    });

    $('#paramRepo').on('dblclick', 'span', function(e){
        var table=$("#table").DataTable();
        var varName=$(this).closest('span').attr('varName');
        table.column(0).search('\^' + varName + '\$', true, false ).draw();
    });

    $('#clearAll').on('dblclick', function(e){
        console.log('hello');
        var table = $('#table').DataTable();
        table
         .search( '' )
         .columns().search( '' )
         .draw();
    });

    $('#paramRepo').on('change', 'input', function(e){
        var table=$('#table').DataTable();
         var varName=$(this).closest('span').attr('varName');
         var newValue = $(this).val();
         table.rows( function ( idx, data, node ) {
            return data[0] === varName ?
                true : false;
            })
            .every(function ( rowIdx, tableLoop, rowLoop ) {
                table.cell(rowIdx, "value:name").data(newValue).draw();
                } );
    });

    $(document).on('click', "#resetSort", function(e){
         var table=$('#table').DataTable();
         table.order.neutral().draw();
    });

    var showingSettables = false;
	$(document).on('click', '#getSettables', function (e) {
	    var table = $('#table').DataTable();
            if (showingSettables == false) {
                $.fn.dataTable.ext.search.push(
                    function (settings, data, dataIndex) {
                        return $(table.row(dataIndex).node()).hasClass('selected');
                    }
                );
            } else if (showingSettables == true) {
                $.fn.dataTable.ext.search.pop();
            }
            showingSettables = !showingSettables;
            table.draw();
    });

    $("#spreadsheet").addClass("active");
    $("#jsonSelector").val($("#target option:first").val());

    //Create datalists for each parameter to store values entered
	$.each(allParameters, function (index, value) {
		$('#variable-lists').append("<option>" + value + "</option>");
		var $newVarList = $("<datalist></datalist>");
		$newVarList.attr('id', value + '-list');
		$newVarList.appendTo($('.parameter-box'));
	});
    
    //for each parameter, add a column to the to the columns option
	$.each(allParameters, function (index, value) {
		columnGenerate.push({
			"data": value,
			"name": value
		});
	});

    /*
     *Toggles between a DataTable() search filter and no filtering
     *@param {Node} $node Alternatively, directly pass the selected node
     *@param {String} elementClass Class assigned to element group
     */
    function toggleSearch(attribute, value, $node, elementClass){
    }


    /*
     *Sets the selected element as the single active element
     *@param {String} attribute Attr. used to identify the selected element
     *@param {String} value The value of the attribute 
     *@param {Node} $node Alternatively, directly pass the selected node
     *@param {String} elementClass Class assigned to element group
     *@param {Bool} hide True to hide previously active element
     */
    function setActive(attribute, value, $node, elementClass, hide){
        //set currently active member of the elementClass as inactive and hide
        var elements = document.getElementsByClassName(elementClass);
        if (!$node) {
            if (!attribute || !value) {
                console.log('No selector was provided.')
                return;
            }
            var $selected = $(elements).filter("[" + attribute +
                                 "=" + value + "]");
            if (!$selected) {
                console.log('Selected element does not exist.')
                return;
            }
            if (hide){
                $(elements).filter(".active").hide();
            }
           $(elements).filter(".active").removeClass("active");
           $selected.addClass("active");
           $selected.show();
           return $selected;
        }
        
        if ($node) {
            if (hide){
                $(elements).filter(".active").hide();
            }
            $(elements).filter(".active").removeClass("active");
            $node.addClass("active");
            $node.show();
        }          
                
    }

    var groupCount = 0;
    /*
     *Creates a new event table group
     *Adds a corresponding entry to the sortable group list
     */
    function addGroup(){
        var newSorter = $('<ul class="groupSorter"><span> Group ' + groupCount + '</span></ul>');
        newSorter.attr('groupID', groupCount);
        $(".groupSorter").filter(".active").removeClass("active");
        $(".groupSorter").children().filter(".active").removeClass("active");
		newSorter.addClass("active");
		newSorter.appendTo($('#event-list'));
		var newGroup = $('<div class="group"></div>');
		newGroup.appendTo("#sort-boxes");
		newGroup.attr("groupID", groupCount);
		newGroup.html('<input class="groupName" placeholder="group name">');
		setActive(undefined, undefined, newGroup, "group", true);
		addEvent();
        groupCount++;
    }

    addGroup();

    $(document).on('click', '.addGroup', function(e){
        addGroup();
    });

    $(document).on('click', '.groupSorter', function(e) {
        var groupIDVal = $(this).attr('groupID');
        var $group = setActive('groupID', groupIDVal, undefined, "group", true);
        setActive(undefined, undefined, $(this), "groupSorter", false);
        setActive(undefined, undefined, $group.children().first(), "sort-box", false);
        setActive(undefined, undefined, $(this).find('.sorter').first(), "sorter", false);
    });
    /*
     *Creates a new DIV containing an empty event table
     *Adds a corresponding entry to the sortable event list
     *Returns the new .sort-box containing the event table node
     */
    
	function addEvent() {
    	//define a new entry in the event list
		var newSorter = $('<li class="sorter"><span> Event ' + eventCount + '</span></li>');
		
		//link the entry to the event page through the shared eventID/eventTableID value 
		newSorter.attr('eventID', eventCount);
	
		$(".sorter").filter(".active").removeClass("active");
		newSorter.addClass("active");
		newSorter.appendTo($('.groupSorter').filter('.active'));

		var newSortBox = $('<div class="sort-box">' +
                        	   '<div class="flex" width="100%">' + 
                        	   '</div>' + 
                    	   '</div>');
		var newTable = $('<table class="display" width="100%"><thead><tr></tr></thead></table>');
		newSortBox.appendTo($(".group").filter('.active'));
		newSortBox.attr("boxID", eventCount);

        var $name = $('<input class="event-name">');
        $name.val("Event "+ eventCount);
        
        newSortBox.children(".flex").append($name);
        /*

		var sequenceTypeSelect = $('<div class="sequence">' +
			'<select><option disabled selected>sequence</option>' +
			'<option value="parallel">parallel</option>' +
			'<option value="serial">serial</option>' +
			'</select></div>');
		sequenceTypeSelect.appendTo(newSortBox.children(".flex"));*/
        
		//newSortBox.children(".flex").append('<input type="checkbox">');

		newTable.attr("sortTableID", eventCount);
		newTable.appendTo(newSortBox);
		/*
		$('.sort-box').filter('.active').hide();
		$('.sort-box').filter('.active').removeClass("active");
		newSortBox.addClass("active");
		newSortBox.show();*/
		
		setActive("","", newSortBox, "sort-box", false);
		newTable.find('tr').append("<th>sequence</th>");
		newTable.find('tr').append("<th>X</th>");

		$.each(allParameters, function (index, value) {
			newTable.find('tr').append("<th>" + value + "</th>");
		});


		$("th:contains('eventType')").addClass('initVisible');
		$("th:contains('name')").addClass('initVisible');
		$("th:contains('delay')").addClass('initVisible');

		var newDataTable = newTable.DataTable({
			"columnDefs": [{
					"defaultContent": "",
					"targets": "_all"
				},
				{
					"type": "num",
					"targets": 0
				},
				{
					"className": "cell-border",
					"targets": "_all"
				},
				{
					"visible": true,
					"targets": ["initVisible", 1]
				},
				{
					"visible": false,
					"targets": '_all'
				},
				{
					orderable: true,
					className: 'reorder',
					targets: 0
				},
				{
					orderable: false,
					targets: '_all'
				}
			],

			"columns": columnGenerate,
			"data": [],
			"dom": 'Bt',
			buttons: [],
			"order": [
				[0, "asc"]
			],
			"bSort": true,
			"scrollX": "400px",
			"scrollY": "400px",
			"scrollCollapse": true,
			"rowReorder": {
				dataSrc: 'sequence',
				update: true,
				selector: 'tr td:not(:first-child)'
			},
			"scrollCollapse": true,
			serverSide: false,
			colReorder: true,
			"paging": false,
		});
		newDataTable.buttons().containers().addClass('flex');
		newDataTable.clear().draw();
		eventCount++;
		return newSortBox;
	};


    $(document).on('click', '.mainTab', function (e) {
	    setActive("ID", $(this).attr("data-tabID"), "", "mainTabContent");

	});

    $(document).on("click", ".addEvent", addEvent);
    //Add a single event table on load
    $('.addEvent').click();


	$("#sort").sortable();

	//generate the containers + buttons for new tables

	$.each(eventTypes, function (index, value) {
		var newTab = $("<div class='tab'>" + value + "</div>");
		newTab.attr("tabID", value);
		$(".context .tabs-bar").append(newTab);

		var newTableRow = $('<div class="table-row"></div>');

		var tableButtons = $('<div class="table-buttons"></div>');

		//buttons for every context
		tableButtons.append('<button class="save-selected">save selected</button></div>');
		tableButtons.append('<button class="fill-selected">fill selected</button></div>');
		tableButtons.append('<button class="fill-options"><select class="fill-selector"><option disabled selected>fill options</option></select></button>');
		tableButtons.append('<button class="add-rows">add rows</button>');
		tableButtons.appendTo(newTableRow);

		newTableRow.append('<div class="row-subset"><table class="display" width="100%"></table></div>');
		newTableRow.appendTo($(".second-tables"));

		var newTable = newTableRow.find('table');
		newTable.append("<thead><tr></tr></thead>");
		newTable.find("tr").append("<th class='select-all'>✔</th>");
		$.each(typeParameters[value], function (key, pair) {
			newTable.find("tr").append("<th>" + pair + "</th>");
		});
		newTable.attr("id", value);
		newTableRow.attr("boxID", value);
	});

	//initialize first tab as the active one
	$('.table-row').hide();
	$('.table-row').eq(0).addClass('active');
	$('.tabs-bar .tab').eq(0).addClass('active');
	$('.table-row').eq(0).show();


	//generate the new DataTables

	var rowIDCount = 0;


	$.each(eventTypes, function (index, type) {
		//the first column stores both the eventType and the selector
		var columns = [{
			"name": "eventType",
			"data": "eventType",
			render: function (data, type, row) {
				if (type === 'display') {
					return;
				} else {
					return data;
				}
			}
		}];

		//for each parameter, add new column entry
		$.each(typeParameters[type], function (index, value) {
			columns.push({
				"data": value,
				"name": value,
				"render": function (data, type, row) {
					if (data === undefined) {
						data = '';
					};
					if (type === 'display') {
						var $in = $("<input name='' type='text' list=" + value + "-list value=" + data + ">");
						return $in.prop("outerHTML");
					} else {
						return data;
					}
				}
			});
		});
		$("th:contains('eventType')").addClass('hiddenColumn');
		var newTable = $("#" + type).DataTable({
			"columnDefs": [{
					orderable: false,
					className: 'select-checkbox',
					targets: 0
				},
				{
					"defaultContent": '',
					"targets": "_all"
				},
				{
					"defaultContent": type,
					"targets": "0"
				},
				{
					"visible": false,
					"targets": "hiddenColumn"
				},
				{
					"className": "cell-border",
					"targets": "_all"
				},
			],
			"ordering": false,
			"scrollX": true,
			keys: true,
			pageLength: 50,
			"scrollY": '55vh',
			"scrollCollapse": true,
			rowReorder: false,
			fixedHeader: true,
			select: {
				style: 'multi',
				selector: 'td:first-child'
			},
			"autoFill": {
				columns: ':not(:first-child)'
			},
			"responsive": false,
			searching: true,
			"columns": columns,
			"data": [],
			"dom": 'tf<"'+type+'">',
		});
        $("div."+type).html("<div style='text-align:right;'>"+ type + "</div>");
		//the dataTable initially has to be supplied with a data format
		//now, clear the data
		newTable.clear().draw();
		//newTable.row.add(events.find(event => event.eventType===type)).draw();


		for (var i = 0; i < 10; i++) {
			var newRow = newTable.row.add([]);
			newTable.cell(newRow, 0).data(rowIDCount);
			$(newRow.node()).attr('id', rowIDCount);
			rowIDCount++;
		}
		newTable.columns.adjust();
		newTable.draw();

	});


	$(".save").on('click', function (e) {
		var eventList = $('#sort').find('li');
		var allTables = $('.sort-box').find('table');
		var finalData = {};
		var eventsMerged ={};
		var validSubmit = true;
		$.each(eventList, function (index, value) {
			var id = $(this).attr("eventID");
			var $sortBox = $(".sort-box[boxID=" + id + "]");
			var sequenceType = $sortBox.find('.sequence').children('select').val();
			if (sequenceType == null) {
				alert('Events must be assigned sequence type');
				validSubmit = false;
				return false;
			}

			if ($('#fileName').val() == '') {
				alert('missing file name');
				validSubmit = false;
				return false;
			}

			var $table = $("table[sortTableID=" + id + "]").DataTable();
			data = $table.buttons.exportData();
			var eventName = $sortBox.find('.event-name').val();
			var eventData = {};
			eventData["sequenceType"] = sequenceType;
			eventData["data"] = JSON.stringify(data);
			eventsMerged[eventName] = eventData;

		})

		if (validSubmit == true) {
            finalData["fileName"] = $('#fileName').val();
		    finalData["fileData"] = eventsMerged;
			$.ajax({
					url: "/main",
					type: "POST",
					data: JSON.stringify(finalData),
					contentType: 'application/json; charset=utf-8',
					dataType: 'json',
				})
				.done(function (data) {
					console.log("After " + data["word"]);
				});
		}

	});

    $(document).on('click', "#toggleSorter", function(e){
         $("#event-list").toggle();
         $(".sort-box").filter('.active').find('table').DataTable().columns.adjust().draw();
    });


	$(document).on('click', '.upload', function (e) {
		$("#upload-json").click();
	});


	$(document).on('click', '.add-rows', function (e) {
		var parentTable = $(this).closest('.table-row').find('table').DataTable();
		for (var i = 0; i < 5; i++) {
			var newRow = parentTable.row.add([]);
			parentTable.cell(newRow, 0).data(rowIDCount);
			$(newRow.node()).attr('id', rowIDCount);
			rowIDCount++;
		}
		parentTable.draw();
	});

	$(".tabs-bar").on("click", ".tab", function () {
		if (allTabs == false) {
			$('.table-row').filter('.active').hide();
			$('.table-row').filter('.active').removeClass('active');
			$('.tabs-bar').find('.tab').filter('.active').removeClass('active');
			var activePage = $('.table-row[boxID=' + $(this).attr('tabID') + ']');
			activePage.show();
			activePage.addClass('active');
			activePage.find('table').DataTable().columns.adjust().draw();
			$(this).addClass("active");
		}

	});

	//  Implement on text change
	$(document).on('change', '.table-row td input', function (e) {
		var row = $(this).closest('tr');
		var parentTable = row.closest('table').DataTable();
		parentTable.cell($(this).closest('td')).data($(this).val()).draw();
		row.addClass('updated');

		var newOption = true;
		var datalist = this.list;
		for (var j = 0; j < datalist.options.length; j++) {
			if (this.value == datalist.options[j].value) {
				newOption = false;
				break;
			}
		}
		if (newOption) {
			$("#" + datalist.id).append("<option>" + this.value + "</option>");
			$("#parameter_panel").append("<li>"+this.value+"</li>");
		}
	});

	var allTabs = false;

	$(document).on('click', '.all-tabs', function (e) {
		allTabs = !allTabs;
		if (allTabs == true) {
			$('.table-row').show();
			$('.table-row').addClass("active");
			$('.table-row').find('table').DataTable().columns.adjust().draw();
		} else {
			$('.table-row').hide();
			$('.table-row').removeClass("active");
			$('.table-row').eq(0).addClass("active");
			$('.table-row').eq(0).show();
			$('.table-row').filter('.active').find('table').DataTable().columns.adjust().draw();

		}
	});

	var all = false;

	$(document).on('click', '.all', function (e) {
		all = !all;
		if (all == true) {
			$('.sort-box').show();
			$('.sort-box').find('table').DataTable().columns.adjust().draw();
		} else {
			$('.sort-box').hide();
			$('.sort-box').filter('.active').show();
		}
	});

	$(document).on("dblclick", ".sorter", function (e) {
        $('.sorter').filter('.active').removeClass('active');
        setActive(undefined, undefined, $(this), '.sorter', false);
        var activeSortPage = setActive('boxID', $(this).attr("eventID"), undefined, 'sort-box', false);
        activeSortPage.find('table').DataTable().columns.adjust().draw();
	})


	$(document).on({
		mouseenter: function () {
			var rowID = $(this).closest('tr').attr('rowID');
			$('#' + rowID).addClass('blue');
			if (true) {
				if (!$('#' + rowID).closest('.table-row').hasClass('active')) {
					var boxID = $('[rowID=' + rowID + ']').closest('.table-row').attr('boxID');
					$('.tab[tabID=' + boxID + ']').addClass('blue');
				}
			}
		},
		mouseleave: function () {
			var rowID = $(this).closest('tr').attr('rowID');
			$('#' + rowID).removeClass('blue');
			if (true) {
				if (!$('#' + rowID).closest('.table-row').hasClass('active')) {
					var boxID = $('[rowID=' + rowID + ']').closest('.table-row').attr('boxID');
					$('.tab[tabID=' + boxID + ']').removeClass('blue');
				}
			}
		}
	}, ".sort-box tr"); //pass the element as an argument to .on


	$(document).on('keypress', 'td:first-child', function (e) {
		if (e.which == 13) {
			alert('You pressed enter!');
		}
	});


	$.each(eventTypes, function (index, type) {
		$("#" + type).DataTable().on('key-focus', function (e, datatable, cell, originalEvent) {
			$(cell.node()).find('input').focus();
		});

		$("#" + type).DataTable().on('key-blur', function (e, datatable, cell, originalEvent) {
			$(cell.node()).find('input').blur();
		});


		$("#" + type).DataTable().on('autoFill', function (e, datatable, cells) {
			$.each(cells, function (index, value) {
				var rowID = cells[index][0].index.row;
				$(datatable.row(rowID).node()).addClass('updated');
			});

		});
	});

	$(document).on('input', '.event-name', function () {
		var $this = $(this);
		var id = $this.closest('.sort-box').attr('boxID');
		$(".groupSorter").find('li[eventID=' + id + ']').html($this.val());
	});

    $(document).on('input', '.groupName', function () {
		var $this = $(this);
		var id = $this.closest('.group').attr('groupID');
		$('.groupSorter[groupID=' + id + ']').children().first().html($this.val());
	});

	$(document).on('click', '.second-tables th', function (e) {
		var name = $(this).html();
		var activeTable = $('.sort-box').filter('.active').find('table').DataTable();
		var column = activeTable.column(name + ":name");
		column.visible(!column.visible());
	});

	$(document).on('click', '.delete', function (e) {
		var parentTable = $(this).closest('table').DataTable();
		var row = parentTable.row($(this).parents('tr'));
		var rowID = parentTable.cell(row, 0).data();
		$("#" + rowID).removeClass('blue');
		$("#" + rowID).removeClass('logged');
		row.remove().draw();

	});

	$(document).on('click', '.select-all', function (e) {
		var parentTable = $(this).closest('.table-row').find('table').DataTable();
		$(parentTable.rows({
			filter: 'applied'
		}).nodes()).addClass('selected');
	});


	$(document).on('click', '.fill-selected', function (e) {
	    var activeTables = $('.table-row').filter('.active').has('.selected');
	    $.each(activeTables, function (index, tableRow) {
	        var parentTableRow = $(this);
            var parentTable = $(this).find('table').DataTable();
            parentTable.rows('.selected').every(function (rowIdx, tableLoop, rowLoop) {
                var rowID = parentTableRow.find($(".fill-selector")).val();
                this.data(parentTable.row($("#" + rowID)).data()).draw();
            });
            $(parentTable.rows('.selected').nodes()).addClass('updated');
            $(parentTable.rows('.selected').nodes()).removeClass('selected');
        });
	});

	$(document).on('click', '.save-selected', function (e) {
	    var activeTables = $('.table-row').filter('.active').has('.selected');
	    $.each(activeTables, function (index, tableRow) {
	        var parentTable = $(this).closest('.table-row').find('table').DataTable();
            var $cell = $(this);
            parentTable.rows('.selected').every(function (rowIdx, tableLoop, rowLoop) {
                $(this.node()).addClass('saved');
                $(this.node()).removeClass('selected');
                var rowID = $(this.node()).attr('id');
                if (!$("option[value=" + rowID + "]").length) {
                    var $newFillOption = $("<option></option>");
                    $newFillOption.val(rowID);
                    $newFillOption.html(this.data().name);
                    $newFillOption.appendTo($cell.closest('.table-row').find('select'));
                }

            });
         })
	});

	var showingSaved = false;
	$(document).on('click', '.show-saved', function (e) {
	    var activeTables = $('.table-row').filter('.active');
            $.each(activeTables, function (index, tableRow) {
            var parentTable = $(this).closest('.table-row').find('table').DataTable();
            if (showingSaved == false) {
                $(".saved").addClass('selected');
                $.fn.dataTable.ext.search.push(
                    function (settings, data, dataIndex) {
                        return $(parentTable.row(dataIndex).node()).hasClass('saved');
                    }
                );
            } else if (showingSaved == true) {
                $.fn.dataTable.ext.search.pop();
            }
            showingSaved = !showingSaved;
            parentTable.draw();
            })
	});

	$(document).on('click', '.clear-selected', function (e) {
	    $(".selected").removeClass("selected");
	});

	$(document).on('click', '.delete-selected', function (e) {
	    var activeTables = $('.table-row').filter('.active').has('.selected');
	    $.each(activeTables, function (index, tableRow) {
	        var parentTable = $(this).find('table').DataTable();
            parentTable.rows('.selected').every(function (rowIdx, tableLoop, rowLoop) {
                var rowID = $(this.node()).attr('id');
                if ($(this.node()).hasClass('saved')) {
                    $("option[value=" + rowID + "]").remove();
                }
                $('[rowID=' + rowID + ']').closest('table').DataTable().row($('[rowID=' + rowID + ']')).remove().draw();
            });
            parentTable.rows('.selected').remove().draw();
            parentTable.draw();
	    });

	});

	$(document).on('click', '.config', function (e) {
		$('.config-popup').toggle();
		$(this).toggleClass('active');
	});

	$(document).on('click', '.update', function (e) {
		var activeTables = $('.table-row').filter('.active').has('.updated');
		var eventTable = $('.sort-box').filter('.active').find('table').DataTable();
		//transfer the updated rows' data into sorter table
        $.each(activeTables, function (index, tableRow) {
            parentTable = $(this).find('table').DataTable();
            parentTable.rows('.updated').every(function (rowIdx, tableLoop, rowLoop) {
			var tableType = parentTable.table().node().id;
			if (parentTable.cell(rowIdx, "name:name").data() != '') {
				//criteria for getting into the sorter is having a name
				$(this.node()).removeClass('updated');
				//the row ID links DataTable row to sorter row
				var rowID = $(parentTable.row(rowIdx).node()).attr('id');
				var nameData = this.data().name;
				var tableID = parentTable.table().node().id;

				if ($(this.node()).hasClass('saved')) {
					$('option[value=' + rowID + ']').html(nameData);
				}

				//if there is no sorter element corresponding to the row, make one
				if (!$('[rowID=' + rowID + ']').length) {
					$(this.node()).addClass('logged');
					var newSortRow = eventTable.row.add(this.data());
					eventTable.cell(newSortRow.node(), 2).data(tableID).draw();
					eventTable.cell(newSortRow.node(), 0).data(rowID).draw();
					$(newSortRow.node()).attr('rowID', rowID);
					newSortRow.draw();

					//else, update the existing sorter element
				} else if ($('[rowID=' + rowID + ']').length) {
					var sortTable = $('[rowID=' + rowID + ']').closest('table').DataTable();
					var sortRow = sortTable.row($('[rowID=' + rowID + ']'));
					sortRow.data(this.data()).draw();
					sortTable.cell(sortRow.node(), 0).data(rowID).draw();
					sortTable.cell(sortRow.node(), 2).data(tableID).draw();
					$(sortRow.node()).attr('rowID', rowID);

				}
			}
            });
            parentTable.draw();
        });
	});

	$(document).on('change', "#upload-json", function (event) {
		//preventDefault stops the page from reloading
		//event.preventDefault();
		$.fn.dataTable
			.tables({
				api: true
			})
			.clear();
		$('.group').remove();
		$('.groupSorter').remove();
		eventCount = 0;
		var rowIDCount = 0;
		var reader = new FileReader();
		reader.onload = function (event) {
			var jsonObj = JSON.parse(event.target.result);
			for (var event in jsonObj) {
			    addGroup();
			    $('.groupSorter').last().html(event);
				var subEvents = jsonObj[event]["subEvents"]
				for (var i in subEvents) {
				    var parentSortBox = addEvent();
                    parentSortBox.find('.event-name').val(eventCount);
                    /*$('.sort-box').last().find('select').val(jsonObj[event]["seqType"]);*/
                    $('.sorter').last().html(eventCount);
                    var subEventList = jsonObj[event]["subEvents"][i];
				    for (var j in subEventList){
                        var subEventObj = subEventList[j];
				        var eventType = subEventObj["eventType"];
                        var row = $("#" + eventType).DataTable().row.add(subEventObj);
                        var $rowNode = $(row.node());
                        $rowNode.attr('id', eventCount);
                        eventCount = eventCount + 1;
                        row.draw();
				    }
                    $(".second-tables").find("tr").addClass('updated');
                    $('.table-row').addClass('active');
                    $('.update').click();
                    $('.table-row').removeClass('active');
                    $('.table-row').eq(0).addClass('active');
				}

				$.each($('datalist'), function (index, value) {
					var $datalist = $(this);
					var datalist=this;

					var listID = datalist.id;
					var parameter = listID.split('-')[0];

                    $('#sort').append($datalist.options);
					var newOption = true;
					$("#"+ eventType).DataTable().cells(undefined, parameter + ":name").every( function(){
					    for (var j = 0; j < datalist.options.length; j++) {
                            if (this.data() == datalist.options[j].value) {
                                newOption = false;
                                break;
                            }
                        }
                        if (newOption) {
                            $("#" + datalist.id).append("<option>" + this.data() + "</option>");
                        }

					});
				});

			}

		};


		reader.readAsText(event.target.files[0]);
	});

	$(document).on('change', "#variable-lists", function (e) {
		$(".parameter-box").children("option").hide();
		var selectedList = $(this).children("option:selected").val();
		$(".parameter-box").append($("#" + selectedList + "-list").children("option"));
	});


	$(document).on('change', "table select", function (e) {
		var newEventType = $(this).children().filter(":selected").html();
		var indexList = events.find(event => event.eventType === newEventType);
		var siblingCells = $(this).parent().siblings("td");
		siblingCells.addClass("readonly");
		siblingCells.html(null);
		var self = this;

		$.each(indexList, function (index, value) {
			t.cell($(self).parent(), index + ":name").nodes().to$().removeClass("readonly");
			if (index != "eventType") {
				t.cell($(self).parent(), index + ":name").data(value).draw();
			}
		});
	});


});