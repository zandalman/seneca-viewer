$(document).ready(function () {
    // Initialize tabs
    $("#tabs").tabs();
    $(".num-param-input, .bool-param-input").hide();
});

var UNITS = {
    "y": 10e-24,
    "z": 10e-21,
    "a": 10e-18,
    "f": 10e-15,
    "p": 10e-12,
    "n": 10e-9,
    "u": 10e-6,
    "m": 10e-3,
    "": 1,
    "k": 10e3,
    "M": 10e6,
    "G": 10e9,
    "P": 10e12,
    "T": 10e15,
    "E": 10e18,
    "Z": 10e21,
    "Y": 10e24
};

Object.keys(UNITS).forEach(function(key) {
    $(".unit-select").append("<option value='" + key + "'>" + key + "</option>");
});

var code_mirror = CodeMirror(document.getElementById("code-editor"), {
  value: "x = 2\n",
  mode:  "python"
});

var tableDataDefault = [
    ["ch1", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch2", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch3", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch4", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch5", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch6", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch7", "", "", "", "", "", "", "", "", "", "", "", ""]
];

// Define renderer for first column of table (i.e. channels)
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
    data: tableDataDefault,
    fixedColumnsLeft: 1,
    manualRowMove: true,
    contextMenu: {
        callback: function (key, selection, clickEvent) {
            console.log(key, selection, clickEvent);
        },
        items: {
            "col_left": {
                name: "Add timestep left",
                disabled: function () {
                    return this.getSelectedLast()[1] === 0;
                }
            },
            "col_right": {
                name: "Add timestep right"
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
    rowHeaders: true,
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
        event.data({
            type: "undefined",
            params: {}
        });
        event.append("<i class='fa fa-times-circle active remove-event'></i>\ ");
        event.append(name + "\ ");
        event.append("<i class='fa fa-edit active edit-event'></i>\ ");
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

$("#add-col").on("click", function () {
    hot.alter("insert_col", hot.getData()[0].length, $("#num-col").val());
});

$("#event-edit").dialog({
    autoOpen: false,
    modal: true,
    height: 300,
    width: 600,
    resizable: false
});

var setEventEditorDefault = function(event) {
    // Clear event type select box
    $("#event-type").val(null).trigger("change");
    $(".params").hide();
    // Set all parameters to variables
    $(".select-param-type option[value='variable']").prop("selected", true);
    $(".num-param-input, .bool-param-input").hide();
    $(".var-param-input").show();
    // Set all parameter inputs to default values
    $(".num-param-input, .var-param-input").each(function() {
       $(this).val($(this).data("default"));
    });
};

var setEventEditor = function(event, eventType) {
    // Select event type in event type select box
    $("#event-type option[value='" + eventType + "']").prop("selected", true);
    $("#event-type").trigger("change");
    // Retrieve event parameters
    var paramDict = event.data("params");
    Object.keys(paramDict).forEach(function(paramName) {
        var paramData = paramDict.paramName;
        var paramHTML = $(".param[data-event='" + eventType + "'][data-param='" + paramName + "']");
        paramHTML.find(".select-param-type option[value='" + paramData.type + "']").prop("selected", true);
        paramHTML.find(".select-param-type").trigger("change");
        // Set parameters
        switch (paramData.type) {
            case "fixed":
                paramHTML.find($(".num-param-input")).val(paramHTML.value);
                break;
            case "variable":
                paramHTML.find($(".var-param-input")).val(paramHTML.value);
                break;
            default:
                null;
        }
    });
};

// Open event editor
$("#events").on("click", ".edit-event", function () {
    var event = $(this).parent();
    var eventName = event.data("name");
    var eventType = event.data("type");
    setEventEditorDefault();
    if (eventType !== "undefined") {
        setEventEditor(event, eventType);
    }
    $("#event-edit").dialog("option", "title", "Event Editor: " + eventName); // Set event editor title
    $("#event-edit").data("event", eventName);
    $("#event-edit").dialog("open"); // Open event editor
});

$("#event-type").select2({
    placeholder: "Event Type",
    width: "100%"
});

var plotDataDefault = {
    target: "#signal",
    width: 400,
    height: 200,
    xAxis: {domain: [0, 5]},
    yAxis: {domain: [-1, 1]},
    grid: true,
    disableZoom: true,
    data: [
        {
            fn: "0"
        }
    ]
};

functionPlot(plotDataDefault);

$(".select-param-type").on("change", function () {
    var paramType = $(this).val();
    switch (paramType) {
        case "fixed":
            $(this).parent().find(".num-param-input, .bool-param-input").show();
            $(this).parent().find(".var-param-input").hide();
            break;
        case "variable":
            $(this).parent().find(".num-param-input, .bool-param-input").hide();
            $(this).parent().find(".var-param-input").show();
            break;
        default:
            null;
    }
});

$("#event-type").on("select2:select", function (e) {
    $(".params").hide();
    $(".params[data-event='" + $(this).val() + "']").show();
    var plotData = JSON.parse(JSON.stringify(plotDataDefault)); // Deep copy default plot data
    switch ($(this).val()) {
        case "constant":
            //plotData.data[0].fn = paramData.value.default;
            break;
        case "exponential":
            break;
        case "Gaussian":
            break;
        case "log":
            break;
        case "Lorentzian":
            break;
        case "pulse":
            break;
        case "ramp":
            break;
        case "sawtooth":
            break;
        case "sine":
            break;
        case "square":
            break;
        case "step":
            break;
        case "trapeziod":
            break;
        case "triangle":
            break;
        default:
            1+1;
    }
    functionPlot(plotData);
});
