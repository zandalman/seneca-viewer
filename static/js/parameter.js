var uploadedJSON;

/*
 *Uploads json to variable setter
 *@param {String} logicJson json file contents
 */

function uploadJsonTemplate(logicJson){
       //remove existing table elements and parameter lists
       $('#table').DataTable().destroy();
       $('#table').find('tbody').remove();
       $("#paramRepo").find('span').remove();
       //show the table header
       $("#table").find('th').show();
       $("#paramSearch").show();
       $("#clearAll").show();
        var table = $("#table").DataTable({
            "columns": [
                {"name": "name"},
                {"name": "sets"},
                {"name": "eventType"},
                {
                    "data": null,
                    "name": "subEvent",
                },
                {"name": "subEvent Group"},
                {"name": "Event"},
                {
                    "name": "value",
                    "data": null,
                    "render": function (data, type, row) {
                        if (type === 'display') {
                            var sets=row[1];
                            //if the parameter is keyed as settable, display as an input field
                            if (configuration["original"][eventType][sets] == "set"){
                                var inputVal = $("<input class='mousetrap' type='text'>");
                                return inputVal.prop("outerHTML");
                            }
                            else {
                                return data;
                            }
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
				    "targets": [2,3,4,5]
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
                dataSrc: [5, 4,3],
                startRender: function (rows, group, level){
                    if (level == 0){
                        return group;
                    }
                    if (level == 1){
                        return "Event Group " + (group + 1);
                    }
                    if (level == 2){
                        return "subEvent " + group;
                    }
                }
            },
            colReorder: true,
            order: [[5, "asc"]]
		});
		var subEvents;
		var variables =[];
		uploadedJSON = JSON.parse(logicJson);
		var data= uploadedJSON.content;
        $.each(data, function (eventName, eventObj) {
            subEventLists=eventObj["subEvents"];
            $.each(subEventLists, function(index, subEventList){
                subEventGroup = index;
                //subEventGroup = eventName + " " + index;
                $.each(subEventList, function(index2, subEvent){
                    eventType = subEvent.eventType;
                    if (subEvent.name == ""){
                            subEventName = index2;
                            //subEventName = subEventGroup + " " + index2;
                        }
                     else {
                        subEventName = subEvent.name;
                     }
                    $.each(subEvent, function(key, value){
                        var inputType = configuration["original"][eventType][key];
                        var newRow = table.row.add([value, key, eventType, subEventName, subEventGroup, eventName, undefined]);
                        if (key != "eventType" && inputType == "set"){
                            if (!variables.includes(value)){
                                console.log(value);
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
	    });
        table.draw();
}

$(document).ready(function(){
    //hide the table controls until data is supplied and the DataTable is generated
    $("#table").find('th').hide();
    $("#paramSearch").hide();
    $("#clearAll").hide();

    $(document).on('click', "#generate", function(e){
        Sijax.request("pass_json", [$("#json-select").val(), "parameter"]);
    });

    $(document).on('click', "#saveParameters", function(e){
       if ($("#parameterFileName").val() == "") {
            alert("missing file name");
            return false;
        }
        console.log("ok");
       $("#table").DataTable().rows().every( function ( rowIdx, tableLoop, rowLoop ) {
            var data = this.data();
            //refer to "columns" option in the table definition for indices
            var name = data[0];
            var parameter = data[1];
            var eventType = data[2];
            var subEventName = data[3];
            var subEventGroup = data[4];
            var event = data[5];
            var value = $($("#table").DataTable().cell(this, "value:name").node()).children("input").val();
            var subEventObj =  uploadedJSON.content[event].subEvents[subEventGroup][subEventName];
            subEventObj[parameter] = value;
        } );
        file_name = $("#parameterFileName").val();
        Sijax.request("save_parameter_json", [uploadedJSON, file_name, false]);
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
                $(table.cell(rowIdx, "value:name").node()).children("input").val(newValue);
                } );
    });

    $('#parameter').on('change', 'td input', function(e){
        var table=$('#table').DataTable();
         var varName = table.row($(this).closest('tr')).data()[0];
         var newValue = $(this).val();
         $("span[varName=" + varName + "]").children("input").val(newValue);
         table.rows( function ( idx, data, node ) {
            return data[0] === varName ?
                true : false;
            })
            .every(function ( rowIdx, tableLoop, rowLoop ) {
                $(table.cell(rowIdx, "value:name").node()).children("input").val(newValue);
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
                        return $(table.row(dataIndex).node()).hasClass("selected");
                    }
                );
            } else if (showingSettables == true) {
                $.fn.dataTable.ext.search.pop();
            }
            showingSettables = !showingSettables;
            table.draw();
    });
})