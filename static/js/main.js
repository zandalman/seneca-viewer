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
  ["ch1", "", "", "", ""],
  ["ch2", "", "", "", ""],
  ["ch3", "", "", "", ""]
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

$(".colorpicker").on("input", function () {
    hot.render();
});