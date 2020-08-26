$(document).ready(function(){
    //hide the table controls until data is supplied and the DataTable is generated
    $("#table").find('th').hide();
    $("#paramSearch").hide();
    $("#clearAll").hide();

    $(document).on('click', "#generate", function(e){
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
})