$( document ).ready(function() {
    // Initialize tabs
    $("#tabs").tabs();
    // Create tables
    experimentTable = createExperimentTable();
    createEventTables();
    addEventTableHooks();
    // Initialize event type select box
    $("#event-type").select2({
        "allowClear": true,
        "placeholder": "Event Type Filter"
    });
    // Color variable list titles
    $("#float-variables-title").css("background-color", FLOAT_COLOR);
    $("#int-variables-title").css("background-color", INT_COLOR);
    $("#boolean-variables-title").css("background-color", BOOL_COLOR);
});

// Initialize event table list
var eventTables = [];

// Define colors
var FLOAT_COLOR = "#d9ead3";
var INT_COLOR = "#cfe2f3";
var BOOL_COLOR = "#fff2cc";
var VAR_COLOR = "#f4cccc";

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

// Define default experiment table data
var experimentTableDataDefault = [
    ["ch1", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch2", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch3", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch4", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch5", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch6", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["ch7", "", "", "", "", "", "", "", "", "", "", "", ""]
];

// Retrieve data from HTML storage
var eventTypeDataJSON = JSON.parse($("#storage").data("evtyp").replaceAll("'", "\""));

// Create event tables
var createEventTables = function (eventTableDataList = null) {
    Object.keys(eventTypeDataJSON).sort().map(function (eventType, eventTypeIndex) {
        var eventTypeData = eventTypeDataJSON[eventType];
        var eventTableData = eventTableDataList ? eventTableDataList[eventTypeIndex] : null;
        $("#event-type").append("<option value='" + eventType + "'>" + eventType + "</option>");
        $("#event-tables").append("<div class='table' id='table-" + eventType + "'></div>");
        eventTables.push(createEventTable(eventType, eventTypeData, eventTableData));
    });
}

var addEventTableHooks = function () {
    eventTables.forEach(function (eventTable) {
        addBeforeRemoveRowHook(eventTable);
        addAfterRemoveRowHook(eventTable);
        addAfterChangeHook(eventTable);
    });
}

var createEventTable = function (eventType, eventTypeData, eventTableData) {
    var numParams = Object.keys(eventTypeData.params).length;
    var sortedParamNames = Object.keys(eventTypeData.params).sort();
    if (!eventTableData) {
        // Default event table data
        eventTableData = [Array.apply(null, Array(numParams + 1)).map(String.prototype.valueOf, "")];
        eventTableData[0][0] = eventType + "_event";
    }
    // Define table
    var container = document.getElementById("table-" + eventType);
    var eventTable = new Handsontable(container, {
        data: eventTableData,
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
        colHeaders: ["events"].concat(sortedParamNames.map(function (paramName) {
            if (!(eventTypeData.params[paramName].type === "boolean")) {
                var paramUnit = eventTypeData.params[paramName].unit;
                return paramName + " (" + paramUnit + ")";
            } else {
                return paramName;
            }
        })),
        rowHeaders: true,
        cells: function(row, column, prop) {
            var cellProperties = {};
            var visualRowIndex = this.instance.toVisualRow(row);
            var visualColIndex = this.instance.toVisualColumn(column);
            if (visualColIndex === 0) {
                cellProperties.validator = generateParamValidator();
                cellProperties.renderer = firstColRenderer;
                cellProperties.strict = true;
                cellProperties.allowInvalid = false;
            } else {
                var paramType = eventTypeData.params[sortedParamNames[visualColIndex - 1]].type;
                cellProperties.className = ["cell-" + paramType];
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
        var isNum = NUM_REGEX.test(stringifiedValue);
        var isVar = VAR_REGEX.test(stringifiedValue);
        var isBool = BOOL_REGEX.test(stringifiedValue);
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
        cellProperties.type = paramType === "boolean" ? "autocomplete" : "text";
        if (!stringifiedValue) {
            // Empty cell
            cellProperties.className.push("htLeft");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
        } else if (paramType === "float" && stringifiedValue.match(NUM_REGEX)) {
            // Float cell
            var newValue = value.replace("u", MU);
            cellProperties.className.push("htRight");
            var newArguments = [instance, td, row, col, prop, newValue, cellProperties];
            Handsontable.renderers.TextRenderer.apply(this, newArguments);
            td.style.backgroundColor = FLOAT_COLOR;
        } else if (paramType === "int" && stringifiedValue.match(NUM_REGEX) && decodeNumeric(stringifiedValue) % 1 === 0) {
            // Integer cell
            cellProperties.className.push("htRight");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = INT_COLOR;
        } else if (paramType === "boolean" && stringifiedValue.match(BOOL_REGEX)) {
            // Boolean cell
            cellProperties.className.push("htLeft");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = BOOL_COLOR;
        } else {
            // Variable cell
            cellProperties.className.push("htLeft");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.fontWeight = "bold";
            td.style.backgroundColor = VAR_COLOR;
        }
    };
    return paramRenderer;
};

var createExperimentTable = function (experimentTableData = null) {
    var container = document.getElementById("exp-table");
    if (!experimentTableData) {
        // Default experiment table data
        experimentTableData = experimentTableDataDefault;
    }
    var experimentTable = new Handsontable(container, {
        data: experimentTableData,
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
                cellProperties.source = eventTables.map(function (eventTable) {
                    return eventTable.getDataAtCol(0);
                }).flat().filter(function (eventName) {
                    return eventName !== null;
                }).sort();
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
        return true;
    });
}

var updateVariables = function () {
    $(".variable-list li").map(function () {
        var variableName = $(this).data("name");
        var containsVariable = eventTables.map(function (eventTable) {
            return !(eventTable.getData().flat().includes(variableName));
        });
        if (!containsVariable.includes(false)) {
            $(".variable-list li[data-name='" + variableName + "']").remove();
        }
    });
}

var addAfterRemoveRowHook = function (eventTable) {
    eventTable.addHook("afterRemoveRow", function (index, amount, physicalRows, source) {
        updateVariables();
    });
}

var getParamTypeAtCell = function (eventTable, row, col) {
    var cellClassName = eventTable.getCellMeta(row, col).className;
    if (cellClassName.includes("cell-float")) {
        return "float"
    } else if (cellClassName.includes("cell-int")) {
        return "int"
    } else if (cellClassName.includes("cell-boolean")) {
        return "boolean"
    }
}

var addAfterChangeHook = function (eventTable) {
    eventTable.addHook("afterChange", function(changes, source) {
        if (source === "loadData") {
          return; //don't save this change
        }
        var currentVariables = $(".variable-list li").map(function() {
            return $(this).data("name");
        }).get();
        changes.forEach(function(change) {
            var row = change[0];
            var col = change[1];
            var value = change[3];
            if (VAR_REGEX.test(value) && col !== 0 && !currentVariables.includes(value) && value) {
                var paramType = getParamTypeAtCell(eventTable, row, col);
                var variableList = $("#" + paramType + "-variables");
                variableList.append("<li data-name='" + value + "'>" + value + "<li>");
                // Sort variables alphabetically
                variableList.html(variableList.children().sort(function(a, b) {
                    return ($(a).text().toUpperCase()).localeCompare($(b).text().toUpperCase());
                }));
                // Remove empty list items from variable list
                variableList.children().filter(function () {
                   return $(this).text() === "";
                }).remove();
            }
        });
        updateVariables();
    });
}

$("#event-type").on("change", function () {
    if ($(this).val()) {
        $("#event-tables .table").hide();
        $("#table-" + $(this).val()).show();
    } else {
        $("#event-tables .table").show();
    }
});

var resetTables = function () {
    $("#exp-table").empty();
    $("#event-tables").empty();
    $(".htMenu").remove();
    eventTables = [];
}

var loadJson = function (loadedData) {
    var eventTableDataList = loadedData.data.eventData;
    var experimentTableData = loadedData.data.experimentData;
    resetTables();
    experimentTable = createExperimentTable(experimentTableData);
    createEventTables(eventTableDataList);
    $("#event-type").trigger("change");
}

$("#load-exp").on("click", function () {
    $("#upload-json").find("input").click();
    $("#upload-json").find("input").on("change", function() {
      $("#upload-json").submit();
    });
});

$("#save-exp").on("click", function () {
    var eventTableDataList = eventTables.map(function (eventTable) {
        return eventTable.getData();
    });
    var experimentTableData = experimentTable.getData();
    var jsonExport = {"data": {"eventData": eventTableDataList, "experimentData": experimentTableData}};
    var fileName = prompt("Input file name");
    Sijax.request("save_json", [jsonExport, fileName]);
});