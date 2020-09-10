// Initialize visualization window
var visualize_window;

$(document).ready(function () {
    // Initialize tabs
    $("#main-tabs").tabs();
    $("#translator-tabs").tabs();
    // Initialize buttons
    $("#json-options button").button();
    $("#remove-json, #view-code").button("disable");
    // Initialize json select
    $("#json-select").select2({
        placeholder: {
            id: "none",
            text: "None"
        },
        allowClear: "true"
    });
    $("#json-select").val(null).trigger("change");
    // Initialize code view dialog
    $("#code-dialog").dialog({
        autoOpen: false,
        width: 500,
        height: 500
    });
});

$("#json-select").on("select2:select", function (e) {
    var selected_json_id = e.params.data.id;
    $("#channel-container, #channel-label-container, #event-names").empty();
    $(".channel-label-container").children().remove();
    $("#json-code").empty();
    $("#json-select option").removeClass("selected");
    $("#remove-json, #view-code").button("enable");
    $("#json-select").find("[value=" + selected_json_id + "]").addClass("selected");
    Sijax.request("update_vis", [selected_json_id]);
});

$("#json-select").on("select2:clear", function () {
    $("#channel-container, #channel-label-container").empty();
    select_none();
});

// Remove a JSON file
$("#remove-json").on("click", function () {
    var selected_json = $("#json-select").find(".selected");
    if (selected_json.val() !== "none") {
        selected_json.remove();
        select_none();
    }
    $("#channel-container, #channel-label-container").empty();
    Sijax.request("remove_json", [selected_json.val()]);
});

// View code for current JSON
$("#view-code").on("click", function () {
    var dialog = $("#code-dialog");
    dialog.dialog({
        "title": $("#json-select").children("option:selected").text()
    });
    dialog.dialog("open");
});

// Remove options if no JSON is selected.
function select_none() {
    $("#remove-json, #view-code").button("disable");
    Sijax.request("update_vis", ["none"]);
}

function refresh_json_options() {
    $("#json-select").val(null).trigger("change");
}

$("#visualize").on("click", function () {
    var window_settings = "toolbar=yes,scrollbars=yes,resizable=yes,top=100,left=100,width=1000,height=400";
    visualize_window = window.open("/visualize", "visualize", window_settings);
});

$(window).on("unload", function () {
    if (visualize_window) {
        visualize_window.close();
    }
});

var code_mirror = CodeMirror(document.getElementById("code-editor"), {
  value: "x = 2\n",
  mode:  "python"
});
