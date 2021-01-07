$(document).ready(function () {
    // Initialize tabs
    $("#tabs").tabs();
    $("td").addClass("blue-bg");
});

var code_mirror = CodeMirror(document.getElementById("code-editor"), {
  value: "x = 2\n",
  mode:  "python"
});

var data = [
    ["ch1", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch2", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch3", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch4", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch5", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch6", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch7", "", "", "", "", "", "", "", "", "", "", "", ""]
];

// Define renderer for first column of table
function firstColRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    td.style.fontWeight = "bold";
    td.style.background = "#EEE";
}

// Define renderer for colored cells
function colorRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var color = $("#events li[data-name='" + value + "'] input").val();
    td.style.backgroundColor = color;
}
Handsontable.renderers.registerRenderer("colorRenderer", colorRenderer);

// Define table
var container = document.getElementById("exp-table");
var hot = new Handsontable(container, {
    data: data,
    fixedColumnsLeft: 1,
    contextMenu: {
        callback: function (key, selection, clickEvent) {
            console.log(key, selection, clickEvent);
        },
        items: {
            "row_above": {
                name: "Insert channel above"
            },
            "row_below": {
                name: "Insert channel below"
            },
            "col_left": {
                name: "Insert timestep left",
                disabled: function () {
                    return this.getSelectedLast()[1] === 0;
                }
            },
            "col_right": {
                name: "Insert timestep right"
            },
            "remove_row": {
                name: "Remove channel"
            },
            "remove_col": {
                name: "Remove timestep",
                disabled: function () {
                    return this.getSelectedLast()[1] === 0;
                }
            },
            "copy": {},
            "cut": {},
            "undo": {},
            "redo": {}
        }
    },
    colHeaders: function(index) {
        return index > 0 ? index : "channels";
    },
    cells: function(row, column, prop) {
        const cellProperties = {};
        const visualRowIndex = this.instance.toVisualRow(row);
        const visualColIndex = this.instance.toVisualColumn(column);
        if (visualColIndex === 0) {
            cellProperties.editor = "text";
            cellProperties.renderer = firstColRenderer;
        } else {
            cellProperties.type = "autocomplete";
            cellProperties.source = $("#events li").map(function () {
                return $(this).data("name");
            }).toArray();
            cellProperties.strict = true;
            cellProperties.allowInvalid = false;
            cellProperties.renderer = colorRenderer;
        }
        return cellProperties;
    },
    manualRowMove: true,
    licenseKey: "non-commercial-and-evaluation"
});

$("#events").on("input", ".colorpicker", function () {
    hot.render();
});

$("#add-event").on("click", function() {
    var name = $("#add-event-name").val();
    var events = $("#events li").map(function () {
        return $(this).data("name");
    }).toArray();
    if (events.includes(name)) {
        alert("An event with name '" + name + "' already exists.");
    } else if (name !== "") {
        $("#events").append("<li data-name='" + name + "'></li>");
        var event = $("#events li[data-name='" + name + "']");
        event.append("<i class='fa fa-times-circle active remove-event'></i>\ ");
        event.append(name + "\ ");
        event.append("<input type='color' value='#ffffff' class='colorpicker'>");
        $("#add-event-name").val("");
    }
});

$(document).on("keypress", function(e) {
    if(e.key === "Enter") {
        if ($("#add-event-name").is(":focus")) {
            $("#add-event").trigger("click");
        }
    }
});

$("#events").on("click", ".remove-event", function () {
    var name = $(this).parent().data("name");
    $(this).parent().remove();
    var tableData = hot.getData();
    var changes = [];
    for (i = 0; i < tableData.length; i++) {
        for (j = 0; j < tableData[i].length; j++){
            if (tableData[i][j] === name) {
                changes.push([i, j, ""]);
            }
        }
    }
    if (changes.length > 0) {
        if (confirm("Are you sure you want to delete '" + name + "'? " + String(changes.length) + " cells will be cleared.")){
            hot.setDataAtCell(changes);
        }
    }
});