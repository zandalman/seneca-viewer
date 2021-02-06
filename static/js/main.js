$( document ).ready(function() {
    // Initialize tabs
    $("#tabs").tabs();
    // Create tables
    experimentTable = createExperimentTable();
    createEventTables();
    addEventTableHooks();
    // Initialize select boxes
    $("#event-type-filter").select2({
        allowClear: true,
        placeholder: "Event Type Filter",
        width: 200
    });
    $("#device-filter").select2({
        allowClear: true,
        placeholder: "Device Filter",
        width: 200
    });
    // Color variable list titles
    $("#float-variables-title").css("background-color", COLORS.float);
    $("#int-variables-title").css("background-color", COLORS.int);
    $("#boolean-variables-title").css("background-color", COLORS.boolean);
    $("#string-variables-title").css("background-color", COLORS.string);
});

// Initialize event table and event type list
var eventTables = [];
var eventTypes = [];
var eventTypesWithImages = [];

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
    header: "#EEE",
    event: "#FAFAFA"
};

// Define regex expressions
REGEX = {
    number: /^-?(0|[1-9]\d*)?(\.\d+)?(?<=\d)(e-?(0|[1-9]\d*))?([yzafpnumkMGTPEZY]$|$)/,
    variable: /(?=^[a-zA-Z])(?=^[a-zA-Z0-9\-_]+$)/,
    boolean: /^(true|false)$/
};

// Define unicode characters
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

// Return an array of a given length of increasing integers starting from a given value
var range = function (length, start = 0) {
    return Array.apply(null, Array(length)).map(function (_, i) {return i + start;});
}

// Define default experiment table data
var experimentTableDataDefault = [
    ["ch1", "DDS"].concat(createFullArray(12, "")),
    ["ch2", "DDS"].concat(createFullArray(12, "")),
    ["ch3", "DDS"].concat(createFullArray(12, "")),
    ["ch4", "DDS"].concat(createFullArray(12, "")),
    ["ch5", "ADC"].concat(createFullArray(12, "")),
    ["ch6", "ADC"].concat(createFullArray(12, "")),
    ["ch7", "DAC"].concat(createFullArray(12, ""))
];

// Retrieve data from HTML storage
var configData = JSON.parse($("#storage").data("config").replaceAll("'", "\""));
var eventTypeDataAll = configData.events;
var devices = configData.devices;

// Create event tables
var createEventTables = function (eventTableDataList = null) {
    devices.sort().forEach(function (device) {
        $("#device-filter").append("<option value='" + device + "'>" + device + "</option>");
    });
    Object.keys(eventTypeDataAll).sort().map(function (eventType, eventTypeIndex) {
        var eventTypeData = eventTypeDataAll[eventType];
        var eventTableData = eventTableDataList ? eventTableDataList[eventTypeIndex] : null;
        $("#event-type-filter").append("<option value='" + eventType + "'>" + eventType + "</option>");
        $("#event-tables").append("<div class='table' id='table-" + eventType + "'></div>");
        eventTables.push(createEventTable(eventType, eventTypeData, eventTableData));
        eventTypes.push(eventType);
        if (eventTypeData.image === "true") {
            eventTypesWithImages.push(eventType);
        }
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

// Toggle whether a cell is a variable
var toggleCellIsVariable = function (eventTable, row, col) {
    var isVariable = isVariableAtCell(eventTable, row, col);
    var paramType = getParamTypeAtCell(eventTable, row, col);
    eventTable.setCellMeta(row, col, "comments", !isVariable);
    eventTable.setDataAtCell(row, col, null);
    eventTable.render();
}

// Toggle whether selected cells are variables
var toggleSelectedCellsAreVariable = function (eventTable) {
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

// Create an event table
var createEventTable = function (eventType, eventTypeData, eventTableData) {
    var numParams = Object.keys(eventTypeData.params).length;
    var sortedParamNames = Object.keys(eventTypeData.params).sort();
    // Use default event table data if there is no data
    if (!eventTableData) {
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
                    name: "Toggle variable <span class='hotkey-text'>ctrl + b</span>",
                    disabled: function () {
                        return this.getSelectedLast()[1] === 0;
                    },
                    callback: function () {
                        toggleSelectedCellsAreVariable(this);
                    }
                }
            }
        },
        colHeaders: [eventType].concat(sortedParamNames.map(function (paramName) {
            if (eventTypeData.params[paramName].unit) {
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
                cellProperties.readOnly = true;
                cellProperties.renderer = headerRenderer;
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
        fillHandle: {
            direction: "vertical",
            autoInsertRow: true
        },
        autoColumnSize: {useHeaders: true},
        licenseKey: "non-commercial-and-evaluation"
    });
    return eventTable;
}

// Define renderer to disguise table cells as table headers
function headerRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    td.style.backgroundColor = COLORS.header;
    td.style.color = "black";
}

// Define renderer for experiment table
function experimentTableRenderer(instance, td, row, col, prop, value, cellProperties) {
    var displayMode = $("#exp-table-display-mode").val();
    var eventType = Boolean(value) ? getEventType(value) : value;
    if (document.getElementById("comments").checked && value) {
        var eventTable = eventTables[eventTypes.indexOf(eventType)];
        var params = eventTable.getColHeader().slice(1);
        var eventTableRow = eventTable.getDataAtCol(0).indexOf(value);
        var paramValues = eventTable.getDataAtRow(eventTableRow).slice(1);
        var commentString = params.map(function (param, idx) {
            var paramValue = paramValues[idx] ? paramValues[idx] : "undefined";
            return param + ": " + paramValue;
        }).join("\n");
        if (commentString !== "") {cellProperties.comment = {value: commentString, readOnly: true};}
    } else {
        cellProperties.comment = {value: null, readOnly: true};
    }
    var newArguments = [];
    switch (displayMode) {
        case "event-type":
            newArguments = [instance, td, row, col, prop, eventType, cellProperties];
            Handsontable.renderers.TextRenderer.apply(this, newArguments);
            break;
        case "event-id":
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            break;
        case "image":
            if (eventTypesWithImages.includes(eventType)) {
                td.style.backgroundImage = "url('/static/plot_images/" + eventType + ".png')";
                td.style.backgroundSize = "contain";
                newArguments = [instance, td, row, col, prop, "", cellProperties];
            } else {
                newArguments = [instance, td, row, col, prop, eventType, cellProperties];
            }
            Handsontable.renderers.TextRenderer.apply(this, newArguments);
            break;
    }
    if (value) {
        td.style.backgroundColor = COLORS.event;
    }
}

// Render experiment table when toggling comments
$("#comments").on("click", function () {
    experimentTable.render();
});

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
        var isVariable = isVariableAtCell(this.instance, this.row, this.col);
        if (isVariable) {
            callback(REGEX.variable.test(stringifiedValue) || !stringifiedValue);
        } else {
            var isNum = REGEX.number.test(stringifiedValue);
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
                    callback(true);
                    break;
            }
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
                "redo": {},
                "mergeCells": {
                    disabled: function () {
                        var selection = this.getSelectedLast();
                        var onlyOneCellSelected = selection[0] === selection[2] && selection[1] === selection[3];
                        var multipleRowsSelected = selection[0] !== selection[2];
                        return multipleRowsSelected || onlyOneCellSelected;
                    }
                }
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
                cellProperties.readOnly = true;
                cellProperties.renderer = headerRenderer;
            } else {
                cellProperties.type = "autocomplete";
                cellProperties.source = [""].concat(eventTables.map(function (eventTable, idx) {
                    var devices = eventTypeDataAll[eventTypes[idx]].devices;
                    var deviceCompatible = devices.includes(experimentTableData[visualRowIndex][1]) || devices[0] === "all";
                    return deviceCompatible ? eventTable.getDataAtCol(0) : null;
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
        mergeCells: true,
        autoColumnSize: {useHeaders: true},
        licenseKey: "non-commercial-and-evaluation"
    });
    // Remove null values from merged cells
    experimentTable.addHook("afterMergeCells", function (cellRange, mergeParent) {
        var value = experimentTable.getDataAtCell(mergeParent.row, mergeParent.col);
        var changes = range(mergeParent.colspan, mergeParent.col).map(function (col) {
            return [mergeParent.row, col, value];
        });
        experimentTable.setDataAtCell(changes);
    });
    experimentTable.addHook("afterSelection", function (row, column, row2, column2, preventScrolling, selectionLayerLevel) {
        if (row >= 0) {
            var device = experimentTable.getDataAtCell(row, 1);
            var channel = experimentTable.getDataAtCell(row, 0);
            $("#device-filter").val(device);
            $("#device-filter").trigger("change");
            $("#current-channel").html(channel);
        }
    });
    return experimentTable;
}

// Automatically merge cells in experiment table if they are in same row with adjacent values
$("#automerge").on("click", function () {
    var experimentTableData = experimentTable.getData();
    var mergeCells = [];
    for (var row = 0; row < experimentTableData.length; row++) {
        for (var col = 2; col < experimentTableData[row].length; col++){
            var value = experimentTableData[row][col];
            var colspan = 1;
            while (value && experimentTableData[row][col + colspan] === value) {
                colspan++;
            }
            if (colspan > 1) {
                mergeCells.push({row: row, col: col, rowspan: 1, colspan: colspan});
                col = col + colspan - 1;
            }
        }
    }
    experimentTable.updateSettings({
        mergeCells: mergeCells
    });
    mergeCells.forEach(function (mergeParent) {experimentTable.runHooks("afterMergeCells", {}, mergeParent)});
});

// Delete instances of event in experiment table before removing event from event table
var addBeforeRemoveRowHook = function (eventTable) {
    eventTable.addHook("beforeRemoveRow", function (index, amount, physicalRows, source) {
        var experimentTableData = experimentTable.getData();
        var eventNames = eventTable.getDataAtCol(0);
        var removedEventNames = physicalRows.map(function (rowIndex) {return eventNames[rowIndex];});
        var expChanges = [];
        for (var row = 0; row < experimentTableData.length; row++) {
            for (var col = 0; col < experimentTableData[row].length; col++){
                if (removedEventNames.includes(experimentTableData[row][col])) {
                    expChanges.push([row, col, null]);
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

// Update variable lists based on event table rows
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

// Generate event IDs for new events
var addAfterCreateRowHook = function (eventTable) {
    eventTable.addHook("afterCreateRow", function (index, amount, source) {
        var eventType = eventTable.getSettings().className;
        for (var row = index; row < index + amount; row++) {
            eventTable.setDataAtCell(row, 0, generateEventID(eventType));
        }
    });
}

// Check if a given event table cell is a variable cell
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

// Add new variables if necessary
var addAfterChangeHook = function (eventTable) {
    eventTable.addHook("afterChange", function (changes, source) {
        if (source === "loadData") {
            return; // don't do hook if loading data
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
        experimentTable.render();
    });
}

// Hide and show event tables based on event type filter
$("#event-type-filter").on("change", function () {
    var eventType = $(this).val();
    if (eventType) {
        $("#device-filter").val(null).trigger("change");
        $("#event-tables .table").hide();
        $("#table-" + eventType).show();
    } else {
        $("#event-tables .table").show();
    }
});

// Hide and show event tables based on device filter
$("#device-filter").on("change", function () {
    var device = $(this).val();
    if (device) {
        $("#event-type-filter").val(null).trigger("change");
        $("#event-tables .table").hide();
        eventTables.forEach(function (eventTable, idx) {
            var devices = eventTypeDataAll[eventTypes[idx]].devices;
            if (devices.includes(device) || devices[0] === "all") {
                $("#table-" + eventTypes[idx]).show();
            }
        });
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
    eventTypes = [];
    // Create new tables
    experimentTable = createExperimentTable(experimentTableData);
    createEventTables(eventTableDataList);
    $("#event-type-filter").trigger("change");
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
    var eventTableDataAll = [];
    eventTables.forEach(function (eventTable, idx) {
        var eventTableData = eventTable.getData();
        var numRows = eventTableData.length;
        var numCols = eventTableData[0].length;
        var eventTableVariableData = JSON.parse(JSON.stringify(eventTableData));
        for (var row = 0; row <= numRows; row++) {
            eventTableVariableData[row] = eventTable.getCellMetaAtRow(row).map(function (cellMeta) {
               return cellMeta.comments;
            });
        }
        eventTableDataAll.push({
            eventType: eventTypes[idx],
            data: eventTableData,
            variableData: eventTableVariableData
        });
    });
    var experimentTableData = experimentTable.getData();
    var variableData = {};
    $(".variable-list").map(function () {
        var varType = $(this).data("type");
        variableData[varType] = $(this).children().map(function () {
            return $(this).data("name");
        }).get();
    });
    var jsonExport = {
        data: {
            eventData: eventTableDataAll,
            experimentData: experimentTableData,
            variableData: variableData
        }
    };
    //var fileName = $("#loaded-experiment-name").html() === "No Experiment Loaded" ? prompt("Input file name") : $("#loaded-experiment-name").html();
    var fileName = "tfile"
    Sijax.request("save_json", [jsonExport, fileName]);
});

// Generate a random event ID
// Event IDs consist of a 3-letter abbreviation for the event type and a five character alphanumeric sequence
var generateEventID = function (eventType) {
    var abbr = eventTypeDataAll[eventType].abbreviation;
    while (true) {
        var id = Math.random().toString(36).substr(2, ID_LENGTH).toUpperCase();
        // Make sure event ID is not already taken
        if (!IDs.includes(id)) {
            IDs.push(id);
            return abbr + "-" + id;
        }
    }
}

// Return the event type based on the abbreviation
var getEventType = function (value) {
    var abbr = value.substr(0, ABBR_LENGTH);
    var eventType = Object.keys(eventTypeDataAll).filter(function (eventType) {
        return eventTypeDataAll[eventType].abbreviation === abbr;
    })[0];
    return eventType;
}

// Update experiment table renderer on display mode change
$("#exp-table-display-mode").on("change", function () {
    experimentTable.render();
});

// Convert event table data into proper data types
// Unused function
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

// Define hot keys
$(document).on("keydown", function (e) {
    // ctrl + s = save experiment
    if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "s")) {
        $("#save-exp").trigger("click");
        e.preventDefault();
    // ctrl + b = toggle whether selected cells are variables
    } else if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "b")) {
        eventTables.forEach(function (eventTable) {
            toggleSelectedCellsAreVariable(eventTable);
        });
        e.preventDefault();
    }
});