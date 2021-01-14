$( document ).ready(function() {
    // Initialize tabs
    $("#tabs").tabs();
});

var UNITS = {
    "y": 1e-24,
    "z": 1e-21,
    "a": 1e-18,
    "f": 1e-15,
    "p": 1e-12,
    "n": 1e-9,
    "\u03BC": 1e-6,
    "m": 1e-3,
    "": 1,
    "k": 1e3,
    "M": 1e6,
    "G": 1e9,
    "P": 1e12,
    "T": 1e15,
    "E": 1e18,
    "Z": 1e21,
    "Y": 1e24
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

$("#events").on("input", ".colorpicker", function () {
    experimentTable.render();
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
    var tableData = experimentTable.getData();
    var changes = [];
    for (i = 0; i < tableData.length; i++) {
        for (j = 0; j < tableData[i].length; j++){
            if (tableData[i][j] === name) {
                changes.push([i, j, ""]);
            }
        }
    }
    if (changes.length > 0) {
        if (confirm("Are you sure you want to delete '" + name + "'? " + String(changes.length) + " cells will be cleared in the experiment table.")){
            experimentTable.setDataAtCell(changes);
        }
    }
});

$("#add-col").on("click", function () {
    experimentTable.alter("insert_col", experimentTable.getData()[0].length, $("#num-col").val());
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

function paramRenderer(instance, td, row, col, prop, value, cellProperties) {
    var stringifiedValue = Handsontable.helper.stringify(value);
    if (!isNaN(stringifiedValue) && stringifiedValue) {
        newValue = value;
        var power = Math.max(Math.min(Math.pow(1000, Math.floor(Math.log10(Math.abs(value)) / 3)), 1e24), 1e-24);
        var prefix = Object.keys(UNITS).filter(function(key) {return UNITS[key] === power;})[0];
        newValue = String((value / power).toFixed(3)) + prefix;
        cellProperties.className = "htRight";
        newArguments = [instance, td, row, col, prop, newValue, cellProperties];
        Handsontable.renderers.TextRenderer.apply(this, newArguments);
    } else {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        td.style.fontWeight = "bold";
        if ($("#variables").find("li[data-name='" + value + "']:hover").length > 0) {
            td.style.backgroundColor = "yellow";
        }
    }
}
Handsontable.renderers.registerRenderer("paramRenderer", paramRenderer);

$("#variables").on("mouseenter, mouseleave", "li", function () {
    sineEventTable.render();
});

var tableDataDefault2 = [
    ["ev1", "", "", ""],
    ["ev2", "", "", ""],
    ["ev3", "", "", ""],
    ["ev4", "", "", ""],
    ["ev5", "", "", ""],
    ["ev6", "", "", ""],
    ["ev7", "", "", ""]
];

customValidator = function (value, callback) {
    if (isNaN(value) && value && !value.match(/(?=^[a-zA-Z])(?=^[a-zA-Z0-9]+$)/)) {
        callback(false);
    } else {
        callback(true);
    }
};
Handsontable.validators.registerValidator("custom-validator", customValidator);

// Define table
var container2 = document.getElementById("sine-table");
var sineEventTable = new Handsontable(container2, {
    data: tableDataDefault2,
    fixedColumnsLeft: 1,
    manualRowMove: true,
    contextMenu: {
        callback: function (key, selection, clickEvent) {
            console.log(key, selection, clickEvent);
        },
        items: {
            "row_above": {
                name: "Add event above"
            },
            "row_below": {
                name: "Add event below"
            },
            "remove_row": {
                name: "Remove event"
            },
            "copy": {},
            "cut": {},
            "undo": {},
            "redo": {}
        }
    },
    colHeaders: ["events", "time (s)", "amplitude (V)", "frequency (Hz)"],
    rowHeaders: true,
    cells: function(row, column, prop) {
        var cellProperties = {};
        var visualRowIndex = this.instance.toVisualRow(row);
        var visualColIndex = this.instance.toVisualColumn(column);
        if (visualColIndex === 0) {
            cellProperties.renderer = firstColRenderer;
        } else {
            cellProperties.renderer = paramRenderer;
        }
        return cellProperties;
    },
    preventOverflow: "horizontal",
    licenseKey: "non-commercial-and-evaluation"
});


// Define table
var container = document.getElementById("exp-table");
var experimentTable = new Handsontable(container, {
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
            cellProperties.source = sineEventTable.getDataAtCol(0).filter(function (eventName) {return !(eventName === null || eventName === "");});
            cellProperties.strict = true;
            cellProperties.allowInvalid = false;
            cellProperties.renderer = colorRenderer;
        }
        return cellProperties;
    },
    preventOverflow: "horizontal",
    licenseKey: "non-commercial-and-evaluation"
});

// Clear cells in experiment table when removing events in event tables
sineEventTable.addHook("beforeRemoveRow", function (index, amount, physicalRows, source) {
    var expData = experimentTable.getData();
    var eventNames = sineEventTable.getDataAtCol(0);
    var removedEventNames = physicalRows.map(function (rowIndex) {return eventNames[rowIndex];});
    var expChanges = [];
    for (i = 0; i < expData.length; i++) {
        for (j = 0; j < expData[i].length; j++){
            if (removedEventNames.includes(expData[i][j])) {
                expChanges.push([i, j, ""]);
            }
        }
    }
    if (expChanges.length > 0) {
        confirmMessage = "Are you sure you want to delete "
            + (removedEventNames.length > 1 ? String(removedEventNames.length) + " events? " : "event '" + removedEventNames[0] + "'? ")
            + String(expChanges.length) + " cells will be cleared.";
        if (confirm(confirmMessage)){
            experimentTable.setDataAtCell(expChanges);
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
});

sineEventTable.addHook("afterRemoveRow", function (index, amount, physicalRows, source) {
    var currentVariables = $("#variables li").map(function() {
        return $(this).data("name");
    }).get();
    currentVariables.map(function(variableName) {
        if (!(sineEventTable.getData().flat().includes(variableName))) {
            $("#variables li[data-name='" + variableName + "']").remove();
        }
    });
});

sineEventTable.addHook("afterChange", function(changes, source) {
    if (source === 'loadData') {
      return; //don't save this change
    }
    var currentVariables = $("#variables li").map(function() {
        return $(this).data("name");
    }).get();
    changes.forEach(function(change) {
        var col = change[1];
        var value = change[3];
        if (isNaN(value) && col !== 0) {
            if (!currentVariables.includes(value)) {
                $("#variables").append("<li data-name='" + value + "'>" + value + "<li>");
                // Sort variables alphabetically
                $("#variables li").sort(function(a, b) {
                    return ($(a).text().toUpperCase()).localeCompare($(b).text().toUpperCase());
                }).appendTo("#variables");
                // Remove empty list items from varibale list
                $("#variables li").filter(function () {
                   return $(this).text() === "";
                }).remove();
            }
        }
    });
    currentVariables.map(function(variableName) {
        if (!(sineEventTable.getData().flat().includes(variableName))) {
            $("#variables li[data-name='" + variableName + "']").remove();
        }
    });
});

function loadJson(loadedData) {
    var loadData = JSON.parse(loadedData).data;
    var eventData = loadData.eventData;
    var experimentData = loadData.experimentData;
    sineEventTable.loadData(eventData);
    experimentTable.loadData(experimentData);
}

$("#load-exp").on("click", function () {
    $("#upload-json").find("input").click();
    $("#upload-json").find("input").on( "change", function() {
      $("#upload-json").submit();
    });
});

$("#save-exp").on("click", function () {
    var eventData = sineEventTable.getData();
    var experimentData = experimentTable.getData();
    var jsonExport = JSON.stringify({"data": {"eventData": eventData, "experimentData": experimentData}});
    var fileName = prompt("Input file name");
    Sijax.request("save_json", [jsonExport, fileName])
});
