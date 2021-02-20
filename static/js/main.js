$( document ).ready(function() {
    // Initialize tabs
    $("#tabs").tabs();
    // Create tables
    experimentTable = createExperimentTable();
    channels = experimentTable.getDataAtCol(0);
    createEventTables();
    // Add table hooks
    addEventTableHooks();
    addExperimentTableHooks();
    // Create variable lists
    createVariableLists();
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
    $("#channel-filter").select2({
        allowClear: true,
        placeholder: "Channel Filter",
        width: 200
    });
});

// Initialize empty variables, lists, and dictionaries
var experimentTable;
var eventTables = [];
var eventTypes = [];
var eventTypesWithImages = [];
var channels = [];
var IDs = [];
var globalVariables = {};
var selectedVariable = "";

// Define ID length
var ID_LENGTH = 5;
var ABBR_LENGTH = 3;

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
    event: "#FAFAFA",
    highlight: "#FFFF00"
};

// Define variable types
PARAM_TYPES = ["boolean", "float", "int", "string"].sort();
EDIT_SOURCES = ["edit", "Autofill.fill", "CopyPaste.paste", "UndoRedo.redo", "UndoRedo.undo"];

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

// Remove null or empty values from an array
var removeNull = function (arr) {
	return arr.filter(function (value) {
  	    return Boolean(value);
    });
}

// Define default experiment table data
var experimentTableDataDefault = [
    ["ch1", "TTL"].concat(createFullArray(12, "")),
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

// Create variable lists
var createVariableLists = function (variableDict = null) {
    // Define HTML for variable list
    var variableListHTML = PARAM_TYPES.map(function (paramType) {
        var variableListTitle = "<div class='" + paramType + "-variables-title'>" + paramType + " variables</div>\n";
        var variableList = "<ul class='variable-list' data-type='" + paramType + "'></ul>\n";
        return variableListTitle + variableList;
    }).join("");
    // Create global variable list
    $(".variables[data-channel='global']").html(variableListHTML);
    // Iterate through channels
    channels.forEach(function (channel) {
        // Create local variable list for each channel
        $("#channel-filter").append("<option value='" + channel + "'>" + channel + "</option>");
        $("#variables-local").append("<div class='variables' data-channel=" + channel + ">");
        $(".variables[data-channel='" + channel + "']").append(variableListHTML);
    });
    // Add correct color for each parameter type in variable list
    PARAM_TYPES.forEach(function (paramType) {
        $("." + paramType + "-variables-title").css("background-color", COLORS[paramType]);
    });
    // Hide local variable lists
    $("#variables-local .variables").hide();
}

// Create event tables
var createEventTables = function (eventTableDataList = null) {
    // Add devices to device filter
    devices.sort().forEach(function (device) {
        $("#device-filter").append("<option value='" + device + "'>" + device + "</option>");
    });
    // Iterate through event types
    Object.keys(eventTypeDataAll).sort().map(function (eventType, eventTypeIndex) {
        var eventTypeData = eventTypeDataAll[eventType];
        var eventTableData = eventTableDataList ? eventTableDataList[eventTypeIndex] : {"data": null};
        $("#event-type-filter").append("<option value='" + eventType + "'>" + eventType + "</option>");
        $("#event-tables").append("<div class='table' id='table-" + eventType + "'></div>");
        eventTables.push(createEventTable(eventType, eventTypeData, eventTableData.data));
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

// Add hooks to experiment table
var addExperimentTableHooks = function () {
    // Remove null values from merged cells
    experimentTable.addHook("afterMergeCells", function (cellRange, mergeParent) {
        var value = experimentTable.getDataAtCell(mergeParent.row, mergeParent.col);
        var changes = range(mergeParent.colspan, mergeParent.col).map(function (col) {
            return [mergeParent.row, col, value];
        });
        experimentTable.setDataAtCell(changes);
    });
    // Automatically update device filter after cell selection
    experimentTable.addHook("afterSelection", function (row, column, row2, column2, preventScrolling, selectionLayerLevel) {
        if (row >= 0) {
            var device = experimentTable.getDataAtCell(row, 1);
            var channel = experimentTable.getDataAtCell(row, 0);
            $("#device-filter").val(device);
            $("#device-filter").trigger("change");
            $("#channel-filter").val(channel);
            $("#channel-filter").trigger("change");
        }
    });
    experimentTable.addHook("afterChange", function (changes, source) {
        // If source of change is a form of cell editing...
        if (EDIT_SOURCES.includes(source)) {
            updateVariables();
        }
    });
}

var generateVariableHTML = function (variableName, channel, paramType, value) {
    return "<li class='variable' data-name='" + variableName + "' data-channel='" + channel + "' data-type='" + paramType + "' data-value='" + value + "'>\n" +
        "  <div class='vertical-center'>\n" +
        "    <span class='variable-name'>" + variableName.slice(1) + "</span>\n" +
        "    <input type='text' class='variable-input' value='" + value + "'>\n" +
        "  </div>\n" +
        "</li>"
}

// Toggle whether a variable is global
var toggleVariableIsGlobal = function(variableName, paramType) {
    if (Object.keys(globalVariables).includes(variableName)) {
        delete globalVariables[variableName];
    } else {
        globalVariables[variableName] = paramType;
    }
}

// Toggle whether selected cells are global variables
var toggleSelectedCellsAreGlobal = function (eventTable) {
    var selection = eventTable.getSelectedLast();
    if (selection) {
        var startRow = Math.min(selection[0], selection[2]);
        var endRow = Math.max(selection[0], selection[2]);
        var startCol = Math.min(selection[1], selection[3]);
        var endCol = Math.max(selection[1], selection[3]);
        var variableNames = [];
        var variableParamTypes = [];
        for (var row = startRow; row <= endRow; row++) {
            for (var col = Math.max(1, startCol); col <= endCol; col++) {
                var cellValue = eventTable.getDataAtCell(row, col);
                if (isVariable(cellValue)) {
                    variableNames.push(cellValue);
                    variableParamTypes.push(getParamTypeAtCell(eventTable, row, col));
                }
            }
        }
        variableNames.forEach(function (variableName, idx) {
            toggleVariableIsGlobal(variableName, variableParamTypes[idx]);
        });
    }
    updateVariables();
    eventTable.render();
}

var renderEventTables = function () {
    eventTables.forEach(function (eventTable) {
        eventTable.render();
    });
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
                "global": {
                    name: "Toggle global <span class='hotkey-text'>ctrl + g</span>",
                    // Disable toggle global option if no variable cells are selected
                    disabled: function () {
                        var selection = this.getSelectedLast();
                        var startRow = Math.min(selection[0], selection[2]);
                        var endRow = Math.max(selection[0], selection[2]);
                        var startCol = Math.min(selection[1], selection[3]);
                        var endCol = Math.max(selection[1], selection[3]);
                        for (var row = startRow; row <= endRow; row++) {
                            for (var col = startCol; col <= endCol; col++) {
                                if (isVariable(eventTable.getDataAtCell(row, col))) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    },
                    callback: function () {
                        toggleSelectedCellsAreGlobal(eventTable);
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
            if (column === 0) {
                cellProperties.readOnly = true;
                cellProperties.renderer = eventTableHeaderRenderer;
            } else {
                var paramType = eventTypeData.params[sortedParamNames[column - 1]].type;
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
function eventTableHeaderRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    if (selectedVariable && Object.keys(getEventVariables(value)).includes(selectedVariable)) {
        td.style.backgroundColor = COLORS.highlight;
    } else {
        td.style.backgroundColor = COLORS.header;
    }
    td.style.color = "black";
}

// Define renderer to disguise table cells as table headers
function experimentTableHeaderRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var rowData = instance.getDataAtRow(row);
    if (selectedVariable && Object.keys(getChannelVariables(rowData)).includes(selectedVariable)) {
        td.style.backgroundColor = COLORS.highlight;
    } else {
        td.style.backgroundColor = COLORS.header;
    }
    td.style.color = "black";
}

class menuEditor extends Handsontable.editors.BaseEditor {
    // Initialize editor instance
    init() {
        this.menu = this.hot.rootDocument.createElement("DIV");
        Handsontable.dom.addClass(this.menu, "menu");
        $(this.menu).data("value", "");
        this.menu.style.display = "none";
        this.hot.rootElement.appendChild(this.menu);
    }
    // Create menu
    prepare(row, col, prop, td, originalValue, cellProperties) {
        super.prepare(row, col, prop, td, originalValue, cellProperties);
        const menuItemsInput = this.cellProperties.menuItems;
        let menuItems;
        if (typeof menuItemsInput === "function") {
            menuItems = menuItemsInput(this.row, this.col, this.prop);
        } else {
            menuItems = menuItemsInput;
        }
        Handsontable.dom.empty(this.menu);
        Handsontable.helper.objectEach(menuItems, (menuItem, submenu) => {
            const menuItemElement = this.hot.rootDocument.createElement("DIV");
            menuItemElement.classList.add("menu-item");
            const menuItemTitleElement = this.hot.rootDocument.createElement("DIV");
            menuItemTitleElement.classList.add("menu-item-title");
            const submenuElement = this.hot.rootDocument.createElement("DIV");
            submenuElement.classList.add("submenu");
            this.menu.appendChild(menuItemElement);
            menuItemElement.appendChild(menuItemTitleElement);
            menuItemElement.appendChild(submenuElement);
            Handsontable.dom.fastInnerHTML(menuItemTitleElement, menuItem);
            submenu.forEach(function (submenuItem) {
                const submenuItemElement = this.hot.rootDocument.createElement("DIV");
                submenuItemElement.classList.add("submenu-item");
                submenuItemElement.value = submenuItem;
                submenuElement.append(submenuItemElement);
                Handsontable.dom.fastInnerHTML(submenuItemElement, submenuItem);
            });
        });
    }
    getValue() {
        return $(this.menu).data("value");
    }
    setValue(value) {
        $(this.menu).data("value", value);
    }
    open() {
        this._opened = true;
        this.refreshDimensions();
        this.menu.style.display = '';
    }
    refreshDimensions() {
        this.TD = this.getEditedCell();
        // TD is outside of the viewport.
        if (!this.TD) {
            this.close();
            return;
        }
        const { wtOverlays } = this.hot.view.wt;
        const currentOffset = Handsontable.dom.offset(this.TD);
        const containerOffset = Handsontable.dom.offset(this.hot.rootElement);
        const scrollableContainer = wtOverlays.scrollableElement;
        const editorSection = this.checkEditorSection();
        let width = Handsontable.dom.outerWidth(this.TD) + 1;
        let height = Handsontable.dom.outerHeight(this.TD) + 1;
        let editTop = currentOffset.top - containerOffset.top - 1 - (scrollableContainer.scrollTop || 0);
        let editLeft = currentOffset.left - containerOffset.left - 1 - (scrollableContainer.scrollLeft || 0);
        let cssTransformOffset;
        switch (editorSection) {
            case 'top':
                cssTransformOffset = Handsontable.dom.getCssTransform(wtOverlays.topOverlay.clone.wtTable.holder.parentNode);
                break;
            case 'left':
                cssTransformOffset = Handsontable.dom.getCssTransform(wtOverlays.leftOverlay.clone.wtTable.holder.parentNode);
                break;
            case 'top-left-corner':
                cssTransformOffset = Handsontable.dom.getCssTransform(wtOverlays.topLeftCornerOverlay.clone.wtTable.holder.parentNode);
                break;
            case 'bottom-left-corner':
                cssTransformOffset = Handsontable.dom.getCssTransform(wtOverlays.bottomLeftCornerOverlay.clone.wtTable.holder.parentNode);
                break;
            case 'bottom':
                cssTransformOffset = Handsontable.dom.getCssTransform(wtOverlays.bottomOverlay.clone.wtTable.holder.parentNode);
                break;
            default:
                break;
        }
        if (this.hot.getSelectedLast()[0] === 0) {
            editTop += 1;
        }
        if (this.hot.getSelectedLast()[1] === 0) {
            editLeft += 1;
        }
        const menuStyle = this.menu.style;
        if (cssTransformOffset && cssTransformOffset !== -1) {
            menuStyle[cssTransformOffset[0]] = cssTransformOffset[1];
        } else {
            Handsontable.dom.resetCssTransform(this.menu);
        }
        const cellComputedStyle = Handsontable.dom.getComputedStyle(this.TD, this.hot.rootWindow);
        if (parseInt(cellComputedStyle.borderTopWidth, 10) > 0) {
            height -= 1;
        }
        if (parseInt(cellComputedStyle.borderLeftWidth, 10) > 0) {
            width -= 1;
        }
        menuStyle.height = `${height}px`;
        menuStyle.minWidth = `${width}px`;
        menuStyle.top = `${editTop}px`;
        menuStyle.left = `${editLeft}px`;
        menuStyle.margin = '0px';
    }
    getEditedCell() {
        const { wtOverlays } = this.hot.view.wt;
        const editorSection = this.checkEditorSection();
        let editedCell;
        switch (editorSection) {
        case 'top':
            editedCell = wtOverlays.topOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.menu.style.zIndex = 101;
            break;
        case 'corner':
            editedCell = wtOverlays.topLeftCornerOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.menu.style.zIndex = 103;
            break;
        case 'left':
            editedCell = wtOverlays.leftOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.menu.style.zIndex = 102;
            break;
        default:
            editedCell = this.hot.getCell(this.row, this.col);
            this.menu.style.zIndex = '';
            break;
        }
        return editedCell < 0 ? void 0 : editedCell;
    }
    focus() {
        this.menu.focus();
    }
    close() {
        this._opened = false;
        this.menu.style.display = 'none';
    }
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
    return function (value, callback) {
        if (isVariable(value)) {
            callback(REGEX.variable.test(value.slice(1)));
        } else {
            var isNum = REGEX.number.test(value);
            var isBool = REGEX.boolean.test(value);
            switch (paramType) {
                case "float":
                    callback(Boolean(isNum || !value));
                    break;
                case "int":
                    callback(Boolean((isNum && decodeNumeric(value) % 1 === 0) || !value));
                    break;
                case "boolean":
                    callback(Boolean(isBool || !value));
                    break;
                case "string":
                    callback(true);
                    break;
            }
        }
    };
}

// Generate custom renderer for event tables
var generateParamRenderer = function (paramType) {
    var paramRenderer = function (instance, td, row, col, prop, value, cellProperties) {
        var isVariable = Boolean(value) && value[0] === "$";
        // Set default cell properties
        cellProperties.source = ["true", "false"];
        cellProperties.type = paramType === "boolean" ? "autocomplete" : "text";
        if (isVariable) {
            cellProperties.className.push("htLeft");
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.backgroundColor = COLORS[paramType + "Var"];
            if (Object.keys(globalVariables).includes(value)) {
                td.style.fontWeight = "bold";
                $(td).append("<i class='fa fa-globe' style='float: right;'></i>");
            }
        } else {
            if (!value) {
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
            if (column < 2) {
                cellProperties.readOnly = true;
                cellProperties.renderer = experimentTableHeaderRenderer;
            } else {
                cellProperties.type = "dropdown";
                cellProperties.source = [""].concat(removeNull(eventTables.map(function (eventTable, idx) {
                    var devices = eventTypeDataAll[eventTypes[idx]].devices;
                    var deviceCompatible = devices.includes(experimentTableData[row][1]) || devices[0] === "all";
                    return deviceCompatible ? eventTable.getDataAtCol(0) : null;
                }).flat()).sort());
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
            eventTable.setDataAtCell(row, 0, generateEventID(eventType), "Misc.InsertEventID");
        }
    });
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

// Get the variable list element for a given channel and parameter type
var getVariableList = function (channel, paramType) {
    return $(".variables[data-channel='" + channel + "']").find(".variable-list[data-type=" + paramType + "]");
}

// Sort a list alphabetically in HTML
var alphabetSort = function (arr) {
    arr.html(arr.children().sort(function (a, b) {
        return ($(a).text().toUpperCase()).localeCompare($(b).text().toUpperCase());
    }));
    // Remove empty list items
    arr.children().filter(function () {
        return $(this).text() === "";
    }).remove();
}

var isVariable = function (value) {
    return Boolean(value) && value[0] === "$";
}

// Get the variables associated with an event
var getEventVariables = function (eventID) {
    var eventType = getEventType(eventID);
    var eventTable = eventTables[eventTypes.indexOf(eventType)];
    var row = eventTable.getDataAtCol(0).indexOf(eventID);
    var eventVariables = {};
    eventTable.getDataAtRow(row).slice(1).map(function (value, idx) {
        var col = idx + 1;
        if (isVariable(value)) {
            eventVariables[value] = getParamTypeAtCell(eventTable, row, col);
        }
    });
    return eventVariables;
}

var getVariableData = function () {
    var variableData = {"global": {}};
    channels.forEach(function (channel) {
        variableData[channel] = {};
    });
    $(".variable").each(function () {
        var channel = $(this).data("channel");
        var variableName = $(this).data("name");
        var value = $(this).data("value");
        if (value) {
            variableData[channel][variableName] = value;
        }
    });
    return variableData;
}

var updateVariables = function () {
    var variableData = getVariableData();
    $(".variable-list").empty();
    var experimentTableData = experimentTable.getData();
    Object.keys(globalVariables).forEach(function (globalVariableName) {
        var variableExists = eventTables.filter(function (eventTable) {
            return eventTable.getData().flat().includes(globalVariableName);
        }).length > 0;
        if (variableExists) {
            var paramType = globalVariables[globalVariableName];
            var variableList = getVariableList("global", paramType);
            var value = Object.keys(variableData["global"]).includes(globalVariableName) ? variableData["global"][globalVariableName] : "";
            variableList.append(generateVariableHTML(globalVariableName, "global", paramType, value));
        } else {
            delete globalVariables[globalVariableName];
        }
    });
    experimentTableData.forEach(function (rowData) {
        var channel = rowData[0];
        var channelVariables = getChannelVariables(rowData);
        Object.keys(channelVariables).sort().forEach(function (variableName) {
            if (!Object.keys(globalVariables).includes(variableName)) {
                var paramType = channelVariables[variableName];
                var variableList = getVariableList(channel, paramType);
                var value = Object.keys(variableData[channel]).includes(variableName) ? variableData[channel][variableName] : "";
                variableList.append(generateVariableHTML(variableName, channel, paramType, value));
            }
        });
    });
}

var getChannelVariables = function (experimentTableRowData) {
    var channelVariables = {};
    var channelEventIDs = [...new Set(removeNull(experimentTableRowData.slice(2)))];
    channelEventIDs.forEach(function (eventID) {
        channelVariables = Object.assign({}, channelVariables, getEventVariables(eventID));
    });
    return channelVariables;
}

// Add any new variables after changes in event tables
var addAfterChangeHook = function (eventTable) {
    eventTable.addHook("afterChange", function (changes, source) {
        // If source of change is a form of cell editing...
        if (EDIT_SOURCES.includes(source)) {
            updateVariables();
        }
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

$("#channel-filter").on("change", function () {
    var channel = $(this).val();
    $("#variables-local .variables").hide();
    if (channel) {
        $(".variables[data-channel='" + channel + "']").show();
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
        eventTableDataAll.push({
            eventType: eventTypes[idx],
            data: eventTableData
        });
    });
    var experimentTableData = experimentTable.getData();
    var variableDefaults = {};
    $( ".variable" ).each(function( index ) {
      var varName =  $( this ).find(".variable-name").text();
      var varValue = $( this ).find(".variable-input").val()
      var varChannel = $(this).attr("data-channel");
      variableDefaults[varChannel] = {}
      variableDefaults[varChannel]["$" + varName] = [varValue];
    });

    var jsonExport = {
        data: {
            eventData: eventTableDataAll,
            defaults: variableDefaults,
            logic: experimentTableData,
            variableData: getVariableData()
        }
    };
    var fileName = $("#loaded-experiment-name").html() === "No Experiment Loaded" ? prompt("Input file name") : $("#loaded-experiment-name").html();
    Sijax.request("save_json", [jsonExport, fileName]);
});

$(document).on("change", ".variable-input", function () {
    var variableInputElement = $(this);
    var variableElement = $(this).parent().parent();
    var value = variableInputElement.val();
    var paramType = variableElement.data("type");
    generateParamValidator(paramType)(value, function (valid) {
        if (valid) {
            variableInputElement.css("border-color", "black");
            variableElement.data("value", value);
        } else {
            variableInputElement.css("border-color", "red");
        }
    });
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
    return Object.keys(eventTypeDataAll).filter(function (eventType) {
        return eventTypeDataAll[eventType].abbreviation === abbr;
    })[0];
}

// Update experiment table renderer on display mode change
$("#exp-table-display-mode").on("change", function () {
    experimentTable.render();
});

// Define hot keys
$(document).on("keydown", function (e) {
    // ctrl + s = save experiment
    if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "s")) {
        $("#save-exp").trigger("click");
        e.preventDefault();
    // ctrl + g = toggle whether selected cells are global variables
    } else if ((e.metaKey || e.ctrlKey) && (String.fromCharCode(e.which).toLowerCase() === "g")) {
        eventTables.forEach(function (eventTable) {
            toggleSelectedCellsAreGlobal(eventTable);
        });
        e.preventDefault();
    // escape = unselect variable
    } else if (e.which === 27) {
        if (selectedVariable) {
            selectedVariable = "";
            $(".variable").removeClass("selected");
            experimentTable.render();
            renderEventTables();
        }
    }
});

$(document).on("click", ".variable", function () {
    $(".variable").removeClass("selected");
    $(this).addClass("selected");
    selectedVariable = $(this).data("name");
    experimentTable.render();
    renderEventTables();
});

$(document).on("click", ".submenu-item", function () {
   $(this).parent().parent().parent().data("value", $(this).val());
});