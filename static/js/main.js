$( document ).ready(function() {
    // Initialize tabs
    $("#tabs").tabs();
    // Create tables
    experimentTable = createExperimentTable();
    createEventTables();
    addEventTableHooks();
    // Initialize select box
    $("#event-type").select2({
        "allowClear": true,
        "placeholder": "Event Type Filter"
    });
});

var eventList = [];
var eventTables = [];

// Define regex expressions
var NUM_REGEX = /^-?(0|[1-9]\d*)?(\.\d+)?(?<=\d)(e-?(0|[1-9]\d*))?([yzafpnumkMGTPEZY]$|$)/;
var VAR_REGEX = /(?=^[a-zA-Z])(?=^[a-zA-Z0-9\-_]+$)(?=^(?!(true|false)$))/;
var BOOL_REGEX = /^(true|false|)$/;
var MU = "\u03BC";

// Define unit conversions
var UNITS = {
    "y": 1e-24,
    "z": 1e-21,
    "a": 1e-18,
    "f": 1e-15,
    "p": 1e-12,
    "n": 1e-9,
    "u": 1e-6,
    "m": 1e-3,
    "": 1,
    "k": 1e3,
    "M": 1e6,
    "G": 1e9,
    "T": 1e12,
    "P": 1e15,
    "E": 1e18,
    "Z": 1e21,
    "Y": 1e24
};

var eventTypeDataJSON = JSON.parse($("#storage").data("evtyp").replaceAll("'", "\""));

var createEventTables = function () {
    Object.keys(eventTypeDataJSON).forEach(function (eventType) {
        var eventTypeData = eventTypeDataJSON[eventType];
        $("#event-type").append("<option value='" + eventType + "'>" + eventType + "</option>");
        $("#event-tables").append("<p>" + eventType + "</p>");
        $("#event-tables").append("<div class='table' id='table-" + eventType + "'></div>");
        eventTables.push(createEventTable(eventType, eventTypeData));
    });
}

var addEventTableHooks = function () {
    eventTables.forEach(function (eventTable) {
        addBeforeRemoveRowHook(eventTable);
        addAfterRemoveRowHook(eventTable);
        addAfterChangeHook(eventTable);
    });
}

var createEventTable = function (eventType, eventTypeData) {
    var numParams = Object.keys(eventTypeData.params).length;
    var sortedParamNames = Object.keys(eventTypeData.params).sort();
    var defaultTableData = [Array.apply(null, Array(numParams + 1)).map(String.prototype.valueOf, "")];
    defaultTableData[0][0] = eventType + "_event";
    eventList.push(eventType + "_event");
    // Define table
    var container = document.getElementById("table-" + eventType);
    var eventTable = new Handsontable(container, {
        data: defaultTableData,
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
        colHeaders: ["events"].concat(sortedParamNames),
        rowHeaders: true,
        cells: function(row, column, prop) {
            var cellProperties = {};
            var visualRowIndex = this.instance.toVisualRow(row);
            var visualColIndex = this.instance.toVisualColumn(column);
            if (visualColIndex === 0) {
                cellProperties.renderer = firstColRenderer;
            } else {
                var paramType = eventTypeData.params[sortedParamNames[visualColIndex - 1]].type;
                cellProperties.validator = generateParamValidator(paramType);
                cellProperties.renderer = generateParamRenderer(paramType);
                cellProperties.strict = true;
                cellProperties.allowInvalid = false;
            }
            return cellProperties;
        },
        preventOverflow: "horizontal",
        licenseKey: "non-commercial-and-evaluation"
    });
    return eventTable;
}

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

$("#add-col").on("click", function () {
    experimentTable.alter("insert_col", experimentTable.getData()[0].length, $("#num-col").val());
});

var plotDataDefault = {
    target: "#visualizer",
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

var decodeNumeric = function (value) {
    var lastChar = value.slice(-1);
    if (isNaN(lastChar)) {
        value = value.slice(0, -1);
        return parseFloat(value) * UNITS[lastChar];
    } else {
        return parseFloat(value);
    }
}

var generateParamValidator = function (paramType) {
    var paramValidator = function (value, callback) {
        var stringifiedValue = Handsontable.helper.stringify(value);
        var isNum = stringifiedValue.match(NUM_REGEX);
        var isVar = stringifiedValue.match(VAR_REGEX);
        var isBool = stringifiedValue.match(BOOL_REGEX);
        switch (paramType) {
            case "float":
                callback(Boolean(isNum || isVar || !stringifiedValue));
                break;
            case "int":
                callback(Boolean((isNum && decodeNumeric(stringifiedValue) % 1 === 0) || isVar || !stringifiedValue));
                break;
            case "boolean":
                callback(Boolean(isBool || isVar || !stringifiedValue));
                break;
            default:
                callback(Boolean(isVar || !stringifiedValue))
        }
    };
    return paramValidator;
}

var generateParamRenderer = function (paramType) {
    var paramRenderer = function (instance, td, row, col, prop, value, cellProperties) {
        var stringifiedValue = Handsontable.helper.stringify(value);
        // Set default cell properties
        cellProperties.source = ["true", "false"];
        cellProperties.className = "htLeft";
        cellProperties.type = paramType === "boolean" ? "autocomplete" : "text";
        if (!stringifiedValue) {
            // Empty cell
            Handsontable.renderers.TextRenderer.apply(this, arguments);
        } else if (paramType === "float" && stringifiedValue.match(NUM_REGEX)) {
            // Float cell
            var newValue = value.replace("u", MU);
            cellProperties.className = "htRight";
            var newArguments = [instance, td, row, col, prop, newValue, cellProperties];
            Handsontable.renderers.TextRenderer.apply(this, newArguments);
            td.style.backgroundColor = "#d9ead3";
        } else if (paramType === "int" && stringifiedValue.match(NUM_REGEX) && decodeNumeric(stringifiedValue) % 1 === 0) {
            // Integer cell
            cellProperties.className = "htRight";
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = "#cfe2f3";
        } else if (paramType === "boolean" && stringifiedValue.match(BOOL_REGEX)) {
            // Boolean cell
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = "#fff2cc";
        } else {
            // Variable cell
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.fontWeight = "bold";
            td.style.backgroundColor = "#f4cccc";
        }
    };
    return paramRenderer;
};

var createExperimentTable = function () {
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
                cellProperties.source = eventList;
                cellProperties.strict = true;
                cellProperties.allowInvalid = false;
            }
            return cellProperties;
        },
        preventOverflow: "horizontal",
        licenseKey: "non-commercial-and-evaluation"
    });
    return experimentTable;
}

var addBeforeRemoveRowHook = function (eventTable) {
    eventTable.addHook("beforeRemoveRow", function (index, amount, physicalRows, source) {
        var expData = experimentTable.getData();
        var eventNames = eventTable.getDataAtCol(0);
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
            } else {
                return false;
            }
        }
        removedEventNames.forEach(function (eventName) {
            eventIndex = eventList.indexOf(eventName);
            if (eventIndex !== -1) {
                eventList.splice(eventIndex, 1);
            }
        });
        return true;
    });
}

var addAfterRemoveRowHook = function (eventTable) {
    eventTable.addHook("afterRemoveRow", function (index, amount, physicalRows, source) {
        var currentVariables = $("#variables li").map(function () {
            return $(this).data("name");
        }).get();
        currentVariables.map(function (variableName) {
            if (!(eventTable.getData().flat().includes(variableName))) {
                $("#variables li[data-name='" + variableName + "']").remove();
            }
        });
    });
}

var addAfterChangeHook = function (eventTable) {
    eventTable.addHook("afterChange", function(changes, source) {
        if (source === "loadData") {
          return; //don't save this change
        }
        var currentVariables = $("#variables li").map(function() {
            return $(this).data("name");
        }).get();
        changes.forEach(function(change) {
            var col = change[1];
            var value = change[3];
            if (value.match(VAR_REGEX) && col !== 0 && !currentVariables.includes(value)) {
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
        });
        currentVariables.map(function(variableName) {
            if (!(eventTable.getData().flat().includes(variableName))) {
                $("#variables li[data-name='" + variableName + "']").remove();
            }
        });
    });
}

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
    Sijax.request("save_json", [jsonExport, fileName]);
});