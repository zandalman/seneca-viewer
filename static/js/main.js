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
    $("#float-variables-title").css("background-color", COLORS.float);
    $("#int-variables-title").css("background-color", COLORS.int);
    $("#boolean-variables-title").css("background-color", COLORS.boolean);
    $("#string-variables-title").css("background-color", COLORS.string);
});

// Initialize event table list
var eventTables = [];

// Define ID length
var ID_LENGTH = 5;
var ABBR_LENGTH = 3;
var IDs = [];

// Define colors
COLORS = {
    float: "#d9ead3",
    int: "#cfe2f3",
    boolean: "#fff2cc",
    string: "#f4cccc",
    floatVar: "#93c47d",
    intVar: "#6fa8dc",
    booleanVar: "#ffd966",
    stringVar: "#e06666",
    header: "#EEE"
};

// Define regex expressions
REGEX = {
    number: /^-?(0|[1-9]\d*)?(\.\d+)?(?<=\d)(e-?(0|[1-9]\d*))?([yzafpnumkMGTPEZY]$|$)/,
    string: /(?=^[a-zA-Z])(?=^[a-zA-Z0-9\-_]+$)/,
    boolean: /^(true|false)$/
};

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

// Return an array of a given length filled with a given value
var createFullArray = function (length, value) {
    return Array.apply(null, Array(length)).map(String.prototype.valueOf, value);
};

// Define default experiment table data
var experimentTableDataDefault = [
    ["ch1", "DDS"].concat(createFullArray(12, "")),
    ["ch2", "DDS"].concat(createFullArray(12, "")),
    ["ch3", "DDS"].concat(createFullArray(12, "")),
    ["ch4", "DDS"].concat(createFullArray(12, "")),
    ["ch5", "DDS"].concat(createFullArray(12, "")),
    ["ch6", "DDS"].concat(createFullArray(12, "")),
    ["ch7", "DDS"].concat(createFullArray(12, ""))
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

// Add hooks to event tables
var addEventTableHooks = function () {
    eventTables.forEach(function (eventTable) {
        addBeforeRemoveRowHook(eventTable);
        addAfterRemoveRowHook(eventTable);
        addAfterChangeHook(eventTable);
        addAfterCreateRowHook(eventTable);
    });
}

var toggleCellIsVariable = function (eventTable, row, col) {
    var isVariable = isVariableAtCell(eventTable, row, col);
    var paramType = getParamTypeAtCell(eventTable, row, col);
    eventTable.setCellMeta(row, col, "comments", !isVariable);
    if (!isVariable) {
        eventTable.setCellMeta(row, col, "validator", generateParamValidator("string"));
    } else {
        eventTable.setCellMeta(row, col, "validator", generateParamValidator(paramType));
    }
    eventTable.render();
}

var toggleSelectedCellsIsVariable = function (eventTable) {
    var selection = eventTable.getSelectedLast();
    if (selection) {
        var startRow = Math.min(selection[0], selection[2]);
        var endRow = Math.max(selection[0], selection[2]);
        var startCol = Math.min(selection[1], selection[3]);
        var endCol = Math.max(selection[1], selection[3]);
        for (var row = startRow; row <= endRow; row++) {
            for (var col = Math.max(1, startCol); col <= endCol; col++) {
                toggleCellIsVariable(eventTable, row, col);
            }
        }
    }
}

var createEventTable = function (eventType, eventTypeData, eventTableData) {
    var numParams = Object.keys(eventTypeData.params).length;
    var sortedParamNames = Object.keys(eventTypeData.params).sort();
    if (!eventTableData) {
        // Default event table data
        eventTableData = [createFullArray(numParams + 1, "")];
        eventTableData[0][0] = generateEventID(eventType);
    }
    // Define table
    var container = document.getElementById("table-" + eventType);
    var eventTable = new Handsontable(container, {
        data: eventTableData,
        className: eventType,
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
                    name: "Remove event",
                    disabled: function () {
                        return this.getSelectedLast()[0] === 0;
                    }
                },
                "copy": {},
                "cut": {},
                "undo": {},
                "redo": {},
                "variable": {
                    name: "Toggle variable",
                    disabled: function () {
                        return this.getSelectedLast()[1] === 0;
                    },
                    callback: function () {
                        toggleSelectedCellsIsVariable(this);
                    }
                }
            }
        },
        colHeaders: [eventType + " events"].concat(sortedParamNames.map(function (paramName) {
            if (!(["boolean", "string"].includes(eventTypeData.params[paramName].type))) {
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
                cellProperties.editor = false;
                cellProperties.renderer = headerRenderer;
            } else {
                var paramType = eventTypeData.params[sortedParamNames[visualColIndex - 1]].type;
                cellProperties.className = ["cell-" + paramType];
                cellProperties.validator = cellProperties.comments ? generateParamValidator("string") : generateParamValidator(paramType);
                cellProperties.renderer = generateParamRenderer(paramType);
                cellProperties.strict = true;
                cellProperties.allowInvalid = false;
            }
            return cellProperties;
        },
        preventOverflow: "horizontal",
        fillHandle: {
            direction: "vertical",
            autoInsertRow: true
        },
        licenseKey: "non-commercial-and-evaluation"
    });
    return eventTable;
}

// Define renderer to disguise table cells as table headers
function headerRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    td.style.backgroundColor = COLORS["header"];
}


// Define renderer for experiment table
function experimentTableRenderer(instance, td, row, col, prop, value, cellProperties) {
    var displayMode = $("#exp-table-display-mode").val();
    var eventType = Boolean(value) ? getEventType(value) : value;
    if (value) {
        null;
        // Maybe add comments with event parameters?
        //cellProperties.comment = {value: "hello", readOnly: true};
    }
    switch (displayMode) {
        case "event-type":
            var newArguments = [instance, td, row, col, prop, eventType, cellProperties];
            Handsontable.renderers.TextRenderer.apply(this, newArguments);
            break;
        case "event-id":
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            break;
    }
}

// Add timesteps to experiment table
$("#add-col").on("click", function () {
    experimentTable.alter("insert_col", experimentTable.getData()[0].length, $("#num-col").val());
});

// Default plot data for visualizer
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

// Translate numeric event table inputs to numbers
var decodeNumeric = function (value) {
    var lastChar = value.slice(-1);
    if (isNaN(lastChar)) {
        value = value.slice(0, -1);
        return parseFloat(value) * UNITS[lastChar];
    } else {
        return parseFloat(value);
    }
}

// Generate custom validator for event tables
var generateParamValidator = function (paramType) {
    var paramValidator = function (value, callback) {
        var stringifiedValue = Handsontable.helper.stringify(value);
        var isNum = REGEX.number.test(stringifiedValue);
        var isString = REGEX.string.test(stringifiedValue);
        var isBool = REGEX.boolean.test(stringifiedValue);
        switch (paramType) {
            case "float":
                callback(Boolean(isNum || !stringifiedValue));
                break;
            case "int":
                callback(Boolean((isNum && decodeNumeric(stringifiedValue) % 1 === 0) || !stringifiedValue));
                break;
            case "boolean":
                callback(Boolean(isBool || !stringifiedValue));
                break;
            case "string":
                callback(isString || !stringifiedValue);
                break;
        }
    };
    return paramValidator;
}

// Generate custom renderer for event tables
var generateParamRenderer = function (paramType) {
    var paramRenderer = function (instance, td, row, col, prop, value, cellProperties) {
        var stringifiedValue = Handsontable.helper.stringify(value);
        var isVariable = cellProperties.comments;
        // Set default cell properties
        cellProperties.source = ["true", "false"];
        cellProperties.type = paramType === "boolean" ? "autocomplete" : "text";
        if (isVariable) {
            cellProperties.className.push("htLeft");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = COLORS[paramType + "Var"];
        } else {
            if (!stringifiedValue) {
                cellProperties.className.push("htLeft");
                Handsontable.renderers.TextRenderer.apply(this, arguments);
            } else {
                switch (paramType) {
                    case "float":
                        var newValue = value.replace("u", MU);
                        cellProperties.className.push("htRight");
                        var newArguments = [instance, td, row, col, prop, newValue, cellProperties];
                        Handsontable.renderers.TextRenderer.apply(this, newArguments);
                        break;
                    case "int":
                        cellProperties.className.push("htRight");
                        Handsontable.renderers.TextRenderer.apply(this, arguments);
                        break;
                    case "boolean":
                        cellProperties.className.push("htLeft");
                        Handsontable.renderers.TextRenderer.apply(this, arguments);
                        break;
                    case "string":
                        cellProperties.className.push("htLeft");
                        Handsontable.renderers.TextRenderer.apply(this, arguments);
                        break;
                }
            }
            td.style.backgroundColor = COLORS[paramType];
        }
    };
    return paramRenderer;
};

// Create experiment table
var createExperimentTable = function (experimentTableData = null) {
    var container = document.getElementById("exp-table");
    if (!experimentTableData) {
        // Default experiment table data
        experimentTableData = experimentTableDataDefault;
    }
    var experimentTable = new Handsontable(container, {
        data: experimentTableData,
        fixedColumnsLeft: 2,
        comments: true,
        manualRowMove: true,
        contextMenu: {
            callback: function (key, selection, clickEvent) {
                console.log(key, selection, clickEvent);
            },
            items: {
                "col_left": {
                    name: "Add timestep left",
                    disabled: function () {
                        return this.getSelectedLast()[1] < 2;
                    }
                },
                "col_right": {
                    name: "Add timestep right"
                },
                "remove_col": {
                    name: "Remove timestep",
                    disabled: function () {
                        return this.getSelectedLast()[1] < 2;
                    }
                },
                "copy": {},
                "cut": {},
                "undo": {},
                "redo": {}
            }
        },
        colHeaders: function(index) {
            switch (index) {
                case 0:
                    return "channel";
                case 1:
                    return "device type";
                default:
                    return index - 1;
            }
        },
        rowHeaders: true,
        cells: function(row, column, prop) {
            const cellProperties = {};
            const visualRowIndex = this.instance.toVisualRow(row);
            const visualColIndex = this.instance.toVisualColumn(column);
            if (visualColIndex < 2) {
                cellProperties.editor = false;
                cellProperties.renderer = headerRenderer;
            } else {
                cellProperties.type = "autocomplete";
                cellProperties.source = [""].concat(eventTables.map(function (eventTable) {
                    return eventTable.getDataAtCol(0);
                }).flat().filter(function (eventName) {
                    return eventName !== null;
                }).sort());
                cellProperties.strict = true;
                cellProperties.allowInvalid = false;
                cellProperties.renderer = experimentTableRenderer;
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
        var experimentTableData = experimentTable.getData();
        var eventNames = eventTable.getDataAtCol(0);
        var removedEventNames = physicalRows.map(function (rowIndex) {return eventNames[rowIndex];});
        var expChanges = [];
        for (i = 0; i < experimentTableData.length; i++) {
            for (j = 0; j < experimentTableData[i].length; j++){
                if (removedEventNames.includes(experimentTableData[i][j])) {
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

// Update variable list
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

var addAfterCreateRowHook = function (eventTable) {
    eventTable.addHook("afterCreateRow", function (index, amount, source) {
        var eventType = eventTable.getSettings().className;
        for (i = index; i < index + amount; i++) {
            eventTable.setDataAtCell(i, 0, generateEventID(eventType));
        }
    });
}

var isVariableAtCell = function (eventTable, row, col) {
    return eventTable.getCellMeta(row, col).comments;
}

// Get parameter type associated with event table cell
var getParamTypeAtCell = function (eventTable, row, col) {
    var cellClassName = eventTable.getCellMeta(row, col).className;
    if (cellClassName.includes("cell-float")) {
        return "float"
    } else if (cellClassName.includes("cell-int")) {
        return "int"
    } else if (cellClassName.includes("cell-boolean")) {
        return "boolean"
    } else if (cellClassName.includes("cell-string")) {
        return "string"
    }
}

var addAfterChangeHook = function (eventTable) {
    eventTable.addHook("afterChange", function (changes, source) {
        if (source === "loadData") {
            return; //don't save this change
        }
        var currentVariables = $(".variable-list li").map(function () {
            return $(this).data("name");
        }).get();
        changes.forEach(function (change) {
            var row = change[0];
            var col = change[1];
            var value = change[3];
            if (!currentVariables.includes(value) && value && isVariableAtCell(eventTable, row, col)) {
                var paramType = getParamTypeAtCell(eventTable, row, col);
                var variableList = $("#" + paramType + "-variables");
                variableList.append("<li data-name='" + value + "'>" + value + "<li>");
                // Sort variables alphabetically
                variableList.html(variableList.children().sort(function (a, b) {
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

// Hide and show event tables based on event type filter
$("#event-type").on("change", function () {
    if ($(this).val()) {
        $("#event-tables .table").hide();
        $("#table-" + $(this).val()).show();
    } else {
        $("#event-tables .table").show();
    }
});

// Reset event tables
var resetTables = function (loadedData) {
    // Retrieve table data
    var eventTableDataList = loadedData.data.eventData;
    var experimentTableData = loadedData.data.experimentData;
    // Remove old tables
    $("#exp-table").empty();
    $("#event-tables").empty();
    $(".htMenu").remove();
    eventTables = [];
    // Create new tables
    experimentTable = createExperimentTable(experimentTableData);
    createEventTables(eventTableDataList);
    $("#event-type").trigger("change");
}

var loadJson = function (loadedData) {
    resetTables(loadedData);
}

$("#load-exp").on("click", function () {
    $("#upload-json-input").val("");
    $("#upload-json-input").click();
    $("#upload-json-input").on("change", function () {
        $("#upload-json").submit();
    });
});

$("#save-exp").on("click", function () {
    var eventTableDataList = eventTables.map(function (eventTable) {
        return eventTable.getData();
    });
    var experimentTableData = experimentTable.getData();
    var jsonExport = {"data": {"eventData": eventTableDataList, "experimentData": experimentTableData}};
    var fileName = $("#loaded-experiment-name").html() === "No Experiment Loaded" ? prompt("Input file name") + ".json" : $("#loaded-experiment-name").html();
    Sijax.request("save_json", [jsonExport, fileName]);
});

var generateEventID = function (eventType) {
    var abbr = eventTypeDataJSON[eventType].abbreviation;
    while (true) {
        var id = Math.random().toString(36).substr(2, ID_LENGTH).toUpperCase();
        if (!IDs.includes(id)) {
            IDs.push(id);
            return abbr + "-" + id;
        }
    }
}

var getEventType = function (value) {
    var abbr = value.substr(0, ABBR_LENGTH);
    var eventType = Object.keys(eventTypeDataJSON).filter(function (eventType) {
        return eventTypeDataJSON[eventType].abbreviation === abbr;
    })[0];
    return eventType;
}

// Update experiment table renderer on display mode change
$("#exp-table-display-mode").on("change", function () {
    experimentTable.render();
});

var getEventTableData = function (eventTable) {
    var eventTableData = eventTable.getData();
    for (i = 0; i < eventTableData.length; i++) {
        for (j = 1; j < eventTableData[i].length; j++) {
            var paramType = getParamTypeAtCell(eventTable, i, j);
            if (paramType === "float" || paramType === "int") {
                eventTableData[i][j] = decodeNumeric(eventTableData[i][j]);
            } else if (paramType === "boolean") {
                eventTableData[i][j] = Boolean(eventTableData[i][j]);
            }
        }
    }
    return eventTableData;
}

$(document).on("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "s")) {
        $("#save-exp").trigger("click");
        e.preventDefault();
    } else if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "b")) {
        eventTables.forEach(function (eventTable) {
            toggleSelectedCellsIsVariable(eventTable);
        });
        e.preventDefault();
    }
});
