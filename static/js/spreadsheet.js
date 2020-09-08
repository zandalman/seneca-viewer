//List of events in object format, to be passed to DataTables()
var events = configuration.example_data;
//List of all event types
var eventTypes = configuration.types;
//JSON object with format (eventType: [associated parameters])
var typeParameters = configuration.type_parameters;
//List of all unique parameters
var allParameters = configuration.all_parameters;

//The total number of events added is used as a unique event ID
var eventCount = 1;
//The total number of groups added is used as a unique group ID
var groupCount = 0;

//Creates the DataTables() columns option for the event tables
//and defines the first two columns
//The first column holds ordering data
//Clicking the cells in the second deletes the corresponding row
var columnGenerate = [{
        "name": "sequence",
        "data": "sequence"
    },
    {
        "name": "delete",
        "data": "delete",
        "render": function(data, type, row) {
            var $delete = $("<div class='delete'>⠀</div>");
            return $delete.prop("outerHTML");
        }
    }
];

 /*
 *Sets the selected element as the single active element
 *@param {String} attribute Attr. used to identify the selected element
 *@param {String} value The value of the attribute
 *@param {Node} $node Alternatively, directly pass the selected node
 *@param {String} elementClass Class assigned to element group
 *@param {Bool} hide True to hide previously active element
 */
function setActive(attribute, value, $node, elementClass, hide) {
    //set currently active member of the elementClass as inactive and hide
    var elements = document.getElementsByClassName(elementClass);
    if (!$node) {
        if (!attribute || !value) {
            console.log("No selector was provided.");
            return;
        }
        var $selected = $(elements).filter("[" + attribute +
            "=" + value + "]");
        if (!$selected) {
            console.log("Selected element does not exist.");
            return;
        }
        if (hide) {
            $(elements).filter(".active").hide();
        }
        $(elements).filter(".active").removeClass("active");
        $selected.addClass("active");
        $selected.show();
        return $selected;
    }
    if ($node) {
        if (hide) {
            $(elements).filter(".active").hide();
        }
        $(elements).filter(".active").removeClass("active");
        $node.addClass("active");
        $node.show();
        return $node;
    }
}

/*
 *Sets the selected element as active
 *@param {String} attribute Attr. used to identify the selected element
 *@param {String} value The value of the attribute
 *@param {Node} $node Alternatively, directly pass the selected node
 *@param {String} elementClass Class assigned to element group
 */
function addActive(attribute, value, $node, elementClass) {
    //set currently active member of the elementClass as inactive and hide
    var elements = document.getElementsByClassName(elementClass);
    if (!$node) {
        if (!attribute || !value) {
            console.log("No selector was provided.");
            return;
        }
        var $selected = $(elements).filter("[" + attribute +
            "=" + value + "]");
        if (!$selected) {
            console.log("Selected element does not exist.");
            return;
        }
        $selected.addClass("active");
        return $selected;
    }
    if ($node) {
        $node.addClass("active");
        return $node;
    }
}

/*
 *Creates a new event table group
 *Adds a corresponding entry to the sortable group list
 *Returns the new group
 */
function addGroup() {
    var newSorter = $("<ul class='groupSorter'><span> Event " +
        groupCount +
        "</span><div class='eventList'></div></ul>");
    newSorter.attr("groupID", groupCount);
    newSorter.appendTo($("#event-list"));
    setActive("", "", newSorter, "groupSorter", false);
    var newGroup = $("<div class='group'></div>");
    newGroup.appendTo("#sort-boxes");
    newGroup.attr("groupID", groupCount);
    newGroup.html("<input class='groupName' placeholder='event name'></div>");
    newGroup.append("<div id='add-group' class='addEvent'>+</div>");
    setActive(undefined, undefined, newGroup, "group", true);
    groupCount++;
    return newGroup;
}

/*
 *Creates a new .sort-box containing an empty event table
 *Adds a corresponding entry to the sortable event list
 *Returns the new .sort-box containing the event table node
 */
function addEvent() {
    var newSortBox = $("<div class='sort-box'>" +
        "<div class='flex' style='height: 15px'></div>" +
        "</div>");
    var newTable = $("<table class='display width='100%'>" +
        "<thead><tr></tr></thead></table>");
    var activeGroup = $(".group").filter(".active");
    newSortBox.appendTo(activeGroup);
    activeGroup.append(activeGroup.find(".addEvent"));
    newSortBox.attr("boxID", eventCount);
    var $newSorter = $("<li></li>");
    $newSorter.attr("eventID", eventCount);
    $(".groupSorter").filter(".active").find(".eventList").append($newSorter);
    var $deleteButton = $("<div class='deleteEventTable'>X</div>");

    newSortBox.children(".flex").append($deleteButton);

    newTable.attr("sortTableID", eventCount);
    newTable.appendTo(newSortBox);
    setActive("", "", newSortBox, "sort-box", false);
    newTable.find("tr").append("<th>sequence</th>");
    newTable.find("tr").append("<th>X</th>");

    $.each(allParameters, function(index, value) {
        newTable.find("tr").append("<th>" + value + "</th>");
    });

    $("th:contains('eventType')").addClass("initVisible");
    $("th:contains('name')").addClass("initVisible");
    $("th:contains('delay')").addClass("initVisible");

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
                "targets": "_all"
            },
            {
                orderable: true,
                className: "reorder",
                targets: 0
            },
            {
                orderable: false,
                targets: "_all"
            }
        ],

        "columns": columnGenerate,
        "data": [],
        "dom": "Bt",
        buttons: [],
        "order": [
            [0, "asc"]
        ],
        "bSort": true,
        "scrollX": "400px",
        "scrollY": "400px",
        "deferRender": false,
        "scrollCollapse": true,
        "rowReorder": {
            dataSrc: "sequence",
            update: true,
            selector: "tr td:not(:first-child)"
        },
        serverSide: false,
        colReorder: true,
        "paging": false
    });
    newDataTable.buttons().containers().addClass("flex");
    newDataTable.clear().draw();
    eventCount++;
    return newSortBox;
}

function uploadJson(jsonString) {
        //preventDefault stops the page from reloading
        //event.preventDefault();
        $.fn.dataTable
            .tables({
                api: true
            })
            .clear();
        $(".group").find("table").DataTable().destroy();
        $(".group").remove();
        $(".groupSorter").remove();
        eventCount = 0;
        var rowIDCount = 0;
        var jsonObj = JSON.parse(jsonString).content;
        var parentSortBox;
        var subEvents;
        var subEventObj;
        var eventType;
        var row;
        var $rowNode;
        var newSortRow;
        var subEventList;
        for (event in jsonObj) {
            if (jsonObj.hasOwnProperty(event)) {
                addGroup();
                $(".groupSorter").last().children("span").html(event);
                subEvents = jsonObj[event].subEvents;
                for (var i in subEvents) {
                    parentSortBox = addEvent();
                    eventTable = parentSortBox.find("table").DataTable();
                    parentSortBox.find(".event-name").val(eventCount);
                    $(".sorter").last().html(eventCount);
                    subEventList = subEvents[i];
                    for (var j in subEventList) {
                        subEventObj = subEventList[j];
                        eventType = subEventObj.eventType;
                        row = $("#" + eventType)
                            .DataTable()
                            .row
                            .add(subEventObj);
                        $rowNode = $(row.node());
                        $rowNode.attr("ID", rowIDCount);


                        newSortRow = eventTable.row.add(subEventObj);
                        eventTable
                            .cell(newSortRow.node(), 2).data(eventType);
                        eventTable
                            .cell(newSortRow.node(), 0).data(rowIDCount);
                        $(newSortRow.node()).attr("rowID", rowIDCount);
                        rowIDCount = rowIDCount + 1;
                    }
                    eventTable.draw();
                    /*$(".second-tables").find("tr").addClass("updated");
                    $(".table-row").addClass("active");
                    $(".update").click();*/
                }
                $(".table-row").removeClass("active");
                $(".table-row").eq(0).addClass("active");
                $(".table-row").eq(0).find("table").DataTable().draw();
                $.each($("datalist"), function(index, value) {
                    var $datalist = $(this);
                    var datalist = this;
                    var listID = datalist.id;
                    var parameter = listID.split("-")[0];
                    $("#sort").append($datalist.options);
                    var newOption = true;
                    $("#" + eventType).DataTable()
                        .cells(undefined, parameter + ":name")
                        .every(function() {
                            for (var j = 0; j < datalist.options.length; j++) {
                                if (this.data() == datalist.options[j].value) {
                                    newOption = false;
                                    break;
                                }
                            }
                            if (newOption) {
                                $("#" + datalist.id).append("<option>" +
                                    this.data() + "</option>");
                            }

                        });
                });
            }
        }
    }
var groupsMerged = {};
var dataSubmit = {};
var validSubmit = true;

function tableParse(){
    $.each($("#event-list").find(".groupSorter"), function(index, group) {
        var groupName = $(this).find("span").html();
        var eventList = $(this).find("li");
        var groupData = [];
        dataSubmit = {};
        $.each(eventList, function(index, value) {
            var id = $(this).attr("eventID");
            var $table = $("table[sortTableID=" + id + "]").DataTable();
            data = $table.buttons.exportData();
            groupData.push(JSON.stringify(data));
        });
        groupsMerged[groupName] = groupData;
    });
    dataSubmit["content"] = groupsMerged;
    dataSubmit["meta"] = {"values": "false"};
    return dataSubmit;
}

function updateTemp(){
     Sijax.request("save_json", [tableParse(), 'temp', true]);
}

function updateTables(){
    var activeTables = $(".table-row").filter(".active").has(".updated");
        var eventTable = $(".sort-box")
            .filter(".active")
            .find("table")
            .DataTable();
        //transfer the updated rows' data into sorter table
        $.each(activeTables, function(index, tableRow) {
            parentTable = $(this).find("table").DataTable();
            parentTable
                .rows(".updated")
                .every(function(rowIdx, tableLoop, rowLoop) {
                    var tableType = parentTable.table().node().id;
                    if (parentTable.cell(rowIdx, "name:name").data() != "") {
                        //criteria for getting into the sorter is having a name
                        $(this.node()).removeClass("updated");
                        //the row ID links the row to sorter row
                        var rowID = $(parentTable.row(rowIdx).node())
                            .attr("ID");
                        var nameData = this.data().name;
                        var tableID = parentTable.table().node().id;

                        if ($(this.node()).hasClass("saved")) {
                            $("option[value=" + rowID + "]").html(nameData);
                        }

                        //if there is no sorter element corresponding to the row, make one
                        if (!$("[rowID=" + rowID + "]").length) {
                            $(this.node()).addClass("logged");
                            var newSortRow = eventTable.row.add(this.data());
                            eventTable
                                .cell(newSortRow.node(), 2)
                                .data(tableID)
                                .draw();
                            eventTable
                                .cell(newSortRow.node(), 0)
                                .data(rowID)
                                .draw();
                            $(newSortRow.node()).attr("rowID", rowID);
                            newSortRow.draw();

                            //else, update the existing sorter element
                        } else if ($("[rowID=" + rowID + "]").length) {
                            var sortTable = $("[rowID=" + rowID + "]")
                                .closest("table")
                                .DataTable();
                            var sortRow = sortTable
                                .row($("[rowID=" + rowID + "]"));
                            sortRow.data(this.data()).draw();
                            sortTable
                                .cell(sortRow.node(), 0)
                                .data(rowID)
                                .draw();
                            sortTable
                                .cell(sortRow.node(), 2)
                                .data(tableID)
                                .draw();
                            $(sortRow.node()).attr("rowID", rowID);

                        }
                    }
                });
            parentTable.draw();
        });
        updateTemp();
        console.log('updated');
}
/**
 * This function will restore the order in which data was read into a DataTable
 * (for example from an HTML source). Although you can set `dt-api order()` to
 * be an empty array (`[]`) in order to prevent sorting during initialisation,
 * it can sometimes be useful to restore the original order after sorting has
 * already occurred - which is exactly what this function does.
 *
 * @name order.neutral()
 * @summary Change ordering of the table to its data load order
 * @author [Allan Jardine](http://datatables.net)
 * @requires DataTables 1.10+
 *
 * @returns {DataTables.Api} DataTables API instance
 *
 * @example
 *    // Return table to the loaded data order
 *    table.order.neutral().draw();
 */

$.fn.dataTable.Api.register("order.neutral()", function() {
    return this.iterator("table", function(s) {
        s.aaSorting.length = 0;
        s.aiDisplay.sort(function(a, b) {
            return a - b;
        });
        s.aiDisplayMaster.sort(function(a, b) {
            return a - b;
        });
    });
});

$(document).ready(function() {

    Mousetrap.bind("alt+s", function(e) {
      $(":focus").blur();
      updateTables();
    })

    Mousetrap.bind("alt+c", function(e){
        $('table').filter(".display").find('input').eq(1).focus();
    })

    Mousetrap.bind("alt+q", function(e){
        index = $(".sort-box").index($(".sort-box").filter(".active"));
        length = $('.sort-box:visible').length;
        setActive('','', $(".sort-box:visible").eq((index + 1 ) % length), "sort-box", false);
    })

    Mousetrap.bind("alt+w", function(e){
        index = $(".tab").index($(".tab").filter(".active"));
        setActive('','', $(".tab").eq((index + 1 ) % $(".table-row").length), "tab", false);
        activeTable = setActive("", "", $(".table-row").eq((index +1) %$(".table-row").length), "table-row", true);
        activeTable.find("table").DataTable().columns.adjust().draw();
    })

      Mousetrap.bind("alt+a", function(e){
        addEvent();
    })

    Mousetrap.bind("alt+r", function(e){
        addGroup();
        addEvent();
    })


    Mousetrap.bind("esc", function(e){
        $(':focus').blur();
    })


    $("#event-list").sortable();
    $("#spreadsheet").addClass("active");
    $("#jsonSelector").val($("#target option:first").val());

    //Create datalists for each parameter to store values entered
    $.each(allParameters, function(index, value) {
        $("#variable-lists").append("<option>" + value + "</option>");
        var $newVarList = $("<datalist></datalist>");
        $newVarList.attr("ID", value + "-list");
        $newVarList.appendTo($(".parameter-box"));
    });

    //for each parameter, add a column to the to the columns option
    $.each(allParameters, function(index, value) {
        columnGenerate.push({
            "data": value,
            "name": value
        });
    });

    addGroup();
    addEvent();

    //generate the containers + buttons for new tables
    $.each(eventTypes, function(index, value) {
        var newTab = $("<div class='tab'><span>" + value + "</span></div>");
        newTab.attr("tabID", value);
        $("#eventTableSelector").children(".tabs-bar").append(newTab);

        var newTableRow = $("<div class='table-row'></div>");
        var tableButtons = $("<div class='table-buttons'></div>");

        //buttons for every context
        tableButtons.append("<button class='save-selected'>" +
            "save selected</button>");
        tableButtons.append("<button class='fill-selected'>" +
            "fill selected</button>");
        tableButtons.append("<button class='fill-options'>" +
            "<select class='fill-selector'>" +
            "<option disabled selected>fill options</option></select>" +
            "</button>");
        tableButtons.append("<button class='add-rows'>add rows</button>");
        //tableButtons.appendTo(newTableRow);

        newTableRow.append("<div class='row-subset'>" +
            "<table class='display' width='100%'></table></div>");
        newTableRow.appendTo($(".second-tables"));

        var newTable = newTableRow.find("table");
        newTable.append("<thead><tr></tr></thead>");
        newTable.find("tr").append("<th class='select-all'>✔</th>");
        $.each(typeParameters[value], function(key, pair) {
            newTable.find("tr").append("<th>" + pair + "</th>");
        });
        newTable.attr("id", value);
        newTableRow.attr("boxID", value);
    });

    $(".table-row").hide();
    setActive("", "", $(".table-row").eq(0), "table-row", true);
    //initialize first tab as the active one
    $(".tabs-bar .tab").eq(0).addClass("active");

    //generate the new DataTables
    var rowIDCount = 0;

    $.each(eventTypes, function(index, type) {
        //the first column stores both the eventType and the selector
        var columns = [{
            "name": "eventType",
            "data": "eventType",
            render: function(data, type, row) {
                if (type === "display") {
                    return;
                } else {
                    return data;
                }
            }
        }];

        //for each parameter, add new column entry
        $.each(typeParameters[type], function(index, value) {
            columns.push({
                "data": value,
                "name": value,
                "render": function(data, type, row) {
                    if (data === undefined) {
                        data = "";
                    }
                    if (type === "display") {
                        var $in = $("<input name='' type='text' class='mousetrap' list=" +
                            value + "-list value=" + data + ">");
                        return $in.prop("outerHTML");
                    } else {
                        return data;
                    }
                }
            });
        });
        $("th:contains('eventType')").addClass("hiddenColumn");
         var newTable = $("#" + type).DataTable({
            "columnDefs": [{
                    orderable: false,
                    className: "select-checkbox",
                    targets: 0
                },
                {
                    "defaultContent": "",
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
            "scrollY": "55vh",
            "scrollCollapse": true,
            rowReorder: false,
            fixedHeader: true,
            "deferRender": false,
            select: {
                style: "multi",
                selector: "td:first-child"
            },
            "autoFill": {
                columns: ":not(:first-child)"
            },
            "responsive": false,
            searching: true,
            "columns": columns,
            "data": [],
            "dom": "tf<'" + type + "'>",
        });
        $("div." + type).html("<div style='text-align:right;'>" + type +
            "</div>");
        var tableRow = $("#"+type).closest(".table-row");
        tableRow.find(".dataTables_filter").css("margin-bottom", "5px");
        tableRow.find(".dataTables_filter").insertBefore(tableRow.find(".dataTables_scroll"));
    });

    $(document).on("click", ".addGroup", function(e) {
        addGroup();
        addEvent();
    });



    $(document).on("click", ".groupSorter", function(e) {
        var groupIDVal = $(this).attr("groupID");
        var $group = setActive("groupID", groupIDVal,
            undefined, "group", true);
        setActive(undefined, undefined,
            $(this), "groupSorter", false);
        setActive(undefined, undefined,
            $group.find(".sort-box").first(), "sort-box", false);
        $group.find("table").DataTable().columns.adjust().draw();
        setActive(undefined, undefined,
            $(this).find(".sorter").first(), "sorter", false);
    });


    $(document).on("click", ".addEvent", addEvent);

    $(".save").on("click", function(e) {
        validSubmit = true;
        if ($("#fileName").val() == "") {
            alert("missing file name");
            validSubmit = false;
            return false;
        }
        if (validSubmit == true) {
            Sijax.request("save_json", [tableParse(), $("#fileName").val(), false]);
        }
    });



    $(document).on("click", "#toggleSorter", function(e) {
        $("#event-list").toggle();
        $(".sort-box").filter(".active").find("table").DataTable()
            .columns.adjust().draw();
    });

    $(document).on("dblclick", ".sort-box", function(e) {
        setActive("", "", $(this), "sort-box", false);
    });


    $(document).on("click", ".add-rows", function(e) {
        var parentTable = $(".table-row").filter(".active").find("table").DataTable();
        for (var i = 0; i < 5; i++) {
            var newRow = parentTable.row.add([]).draw();
            parentTable.cell(newRow, 0).data(rowIDCount);
            $(newRow.node()).attr("ID", rowIDCount);
            rowIDCount++;
        }
        parentTable.draw();
    });

    $(".add-rows").eq(0).click();

    $(".tabs-bar").on("click", "span", function() {
        var $parentTab = $(this).closest(".tab");
        var tabID = $parentTab.attr("tabID");
        setActive("", "", $parentTab, "tab", false);
        var activeSortBox = setActive("boxID", tabID, "", "table-row", true);
        activeSortBox.find("table").DataTable().columns.adjust().draw();
    });

    //  Implement on text change
    $(document).on("change", ".table-row td input", function(e) {
        var row = $(this).closest("tr");
        var parentTable = row.closest("table").DataTable();
        parentTable.cell($(this).closest("td")).data($(this).val()).draw();
        row.addClass("updated");

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
            $("#parameter_panel").append("<li>" + this.value + "</li>");
        }
    });

    var all = false;

    $(document).on("click", ".all", function(e) {
        all = !all;
        if (all == true) {
            $(".sort-box").show();
            $(".sort-box").find("table").DataTable().columns.adjust().draw();
        } else {
            $(".sort-box").hide();
            $(".sort-box").filter(".active").show();
        }
    });

    $(document).on("dblclick", ".sorter", function(e) {
        $(".sorter").filter(".active").removeClass("active");
        setActive(undefined, undefined, $(this), ".sorter", false);
        var activeSortPage = setActive("boxID", $(this).attr("eventID"),
            undefined, "sort-box", false);
        activeSortPage.find("table").DataTable().columns.adjust().draw();
    });


    $(document).on({
        mouseenter: function() {
            var rowID = $(this).closest("tr").attr("rowID");
            $("#" + rowID).addClass("blue");
            if (!$("#" + rowID).closest(".table-row").hasClass("active")) {
                var boxID = $("#" + rowID).closest(".table-row").attr("boxID");
                $(".tab[tabID=" + boxID + "]").addClass("blue");
            }
        },
        mouseleave: function() {
            var rowID = $(this).closest("tr").attr("rowID");
            $("#" + rowID).removeClass("blue");
            if (true) {
                if (!$("#" + rowID).closest(".table-row").hasClass("active")) {
                    var boxID = $("#" + rowID).closest(".table-row").attr("boxID");
                $(".tab[tabID=" + boxID + "]").removeClass("blue");
                }
            }
        }
    }, ".sort-box tr"); //pass the element as an argument to .on

    $.each(eventTypes, function(index, type) {
        $("#" + type).DataTable()
            .on("key-focus", function(e, datatable, cell, originalEvent) {
                $(cell.node()).find("input").focus();
            });

        $("#" + type).DataTable()
            .on("key-blur", function(e, datatable, cell, originalEvent) {
                $(cell.node()).find("input").blur();
            });


        $("#" + type).DataTable()
            .on("autoFill", function(e, datatable, cells) {
                $.each(cells, function(index, value) {
                    var rowID = cells[index][0].index.row;
                    $(datatable.row(rowID).node()).addClass("updated");
                });

            });
    });

    $(document).on("input", ".event-name", function() {
        var $this = $(this);
        var id = $this.closest(".sort-box").attr("boxID");
        $(".groupSorter").find("li[eventID=" + id + "]").html($this.val());
    });

    $(document).on("input", ".groupName", function() {
        var $this = $(this);
        var id = $this.closest(".group").attr("groupID");
        $(".groupSorter[groupID=" + id + "]").children('span').html($this.val());
    });

    $(document).on("click", ".second-tables th", function(e) {
        var name = $(this).html();
        var activeTable = $(".sort-box")
            .filter(".active").find("table").DataTable();
        var column = activeTable.column(name + ":name");
        column.visible(!column.visible());
    });

    $(document).on("click", ".delete", function(e) {
        var parentTable = $(this).closest("table").DataTable();
        var row = parentTable.row($(this).parents("tr"));
        var rowID = parentTable.cell(row, 0).data();
        $("#" + rowID).removeClass("blue");
        $("#" + rowID).removeClass("logged");
        row.remove().draw();
    });

    $(document).on("click", ".deleteEventTable", function(e) {
        var parentTable = $(this)
                            .closest(".sort-box")
                            .find("table");
        parentTable.DataTable().destroy();
        $(this).closest(".sort-box").remove();
    });

    $(document).on("click", ".select-all", function(e) {
        var parentTable = $(this).closest(".table-row")
            .find("table").DataTable();
        $(parentTable.rows({
            filter: "applied"
        }).nodes()).addClass("selected");
    });


    $(document).on("click", ".fill-selected", function(e) {
        var activeTables = $(".table-row").filter(".active").has(".selected");
        $.each(activeTables, function(index, tableRow) {
            var parentTableRow = $(this);
            var parentTable = $(this).find("table").DataTable();
            parentTable.rows(".selected")
                .every(function(rowIdx, tableLoop, rowLoop) {
                    var rowID = $(".fill-selector").val();
                    var tableID = $(".table-row").filter(".active").attr("boxID");
                    this.data($("#"+tableID).DataTable().row($("#" + rowID)).data()).draw();
                });
            $(parentTable.rows(".selected").nodes()).addClass("updated");
            $(parentTable.rows(".selected").nodes()).removeClass("selected");
        });
    });



    $(document).on("click", ".save-selected", function(e) {
        var activeTables = $(".table-row").filter(".active").has(".selected");
        $.each(activeTables, function(index, tableRow) {
            var parentTable = $(this).closest(".table-row")
                .find("table").DataTable();
            var $cell = $(this);
            parentTable.rows(".selected")
                .every(function(rowIdx, tableLoop, rowLoop) {
                    $(this.node()).addClass("saved");
                    $(this.node()).removeClass("selected");
                    var rowID = $(this.node()).attr("ID");
                    if (!$("option[value=" + rowID + "]").length) {
                        var $newFillOption = $("<option></option>");
                        $newFillOption.val(rowID);
                        $newFillOption.html(this.data().name);
                        $newFillOption.appendTo($(".fill-selector"));
                    }

                });
        });
    });

    var showingSaved = false;
    $(document).on("click", ".show-saved", function(e) {
        var activeTables = $(".table-row").filter(".active");
        $.each(activeTables, function(index, tableRow) {
            var parentTable = $(this).closest(".table-row").find("table")
                .DataTable();
            if (showingSaved == false) {
                $(".saved").addClass("selected");
                $.fn.dataTable.ext.search.push(
                    function(settings, data, dataIndex) {
                        return $(parentTable.row(dataIndex).node())
                            .hasClass("saved");
                    }
                );
            } else if (showingSaved == true) {
                $.fn.dataTable.ext.search.pop();
            }
            showingSaved = !showingSaved;
            parentTable.draw();
        });
    });

    $(document).on("click", ".clear-selected", function(e) {
        $(".selected").removeClass("selected");
    });

    $(document).on("click", ".delete-selected", function(e) {
        var activeTables = $(".table-row").filter(".active").has(".selected");
        $.each(activeTables, function(index, tableRow) {
            var parentTable = $(this).find("table").DataTable();
            parentTable
                .rows(".selected")
                .every(function(rowIdx, tableLoop, rowLoop) {
                    var rowID = $(this.node()).attr("ID");
                    if ($(this.node()).hasClass("saved")) {
                        $("option[value=" + rowID + "]").remove();
                    }
                    $("[rowID=" + rowID + "]").closest("table").DataTable()
                        .row($("[rowID=" + rowID + "]")).remove().draw();
                });
            parentTable.rows(".selected").remove().draw();
            parentTable.draw();
        });

    });

    $(document).on("click", ".config", function(e) {
        $(".config-popup").toggle();
        $(this).toggleClass("active");
    });

    $(document).on("click", ".update", function(e) {
        updateTables();
    });

    $(document).on("click", ".upload", function(e) {
        if ($("#json-select").val() != null) {
            Sijax.request("pass_json", [$("#json-select").val(), "spreadsheet"]);
        }
    });

    $(document).on("change", "#variable-lists", function(e) {
        $(".parameter-box").children("option").hide();
        var selectedList = $(this).children("option:selected").val();
        $(".parameter-box").append($("#" + selectedList + "-list")
            .children("option"));
    });


    $(document).on("change", "table select", function(e) {
        var newEventType = $(this).children().filter(":selected").html();
        var indexList = events.find(event => event.eventType === newEventType);
        var siblingCells = $(this).parent().siblings("td");
        siblingCells.addClass("readonly");
        siblingCells.html(null);
        var self = this;

        $.each(indexList, function(index, value) {
            t.cell($(self).parent(), index + ":name").nodes()
                .to$().removeClass("readonly");
            if (index != "eventType") {
                t.cell($(self).parent(), index + ":name").data(value).draw();
            }
        });
    });

})

