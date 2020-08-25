// List of defined event types
// Undefined event types will be displayed as text
var defined_events = [
    "sine",
    "saw",
    "square",
    "triangle",
    "pulse",
    "constant",
    "points",
    "ramp",
    "step",
    "exponential",
    "log",
    "chirp",
    "Gaussian",
    "Lorentzian",
    "step_triangle"
];

$(document).ready(function () {
    // Initialize tabs
    $("#main-tabs").tabs({
        activate: function(event, ui) {
            var old_tab_id = ui.oldTab.children().attr("id");
            var new_tab_id = ui.newTab.children().attr("id");
            if (new_tab_id === "visualizer-tab" && old_tab_id !== "visualizer-tab") {
                1+1;
                // Glitch -- in process of fixing
            }
        }
    });
    // Initialize buttons
    $("#json-options button").button();
    $("#remove-json, #view-code").button("disable");
    $("#ev-select").select2({
        placeholder: "None",
        disabled: true
    });
    $("#ch-select").select2({
        placeholder: "None",
        disabled: true
    });
    $("#json-select").select2({
        placeholder: {
            id: "none",
            text: "None"
        },
        allowClear: "true"
    });
    $("#json-select").val(null).trigger("change");
    // Initialize block info dialog
    $("#block-info").dialog({
        autoOpen: false,
        close: function (event, ui) {
            $(".block").removeClass("selected");
        }
    });
    // Initialize code view dialog
    $("#code-dialog").dialog({
        autoOpen: false,
        width: 500,
        height: 500
    });
    // Initialize channel sortable
    $("#channel-label-container").sortable({
        containment: "#channel-label-container",
        stop: function (event, ui) {
            var channel = $("#" + ui.item.data("chid"));
            var old_index = $(".channel:visible").index(channel);
            var new_index = $(".channel-label:visible").index(ui.item);
            if (new_index < old_index) {
                channel.insertBefore($(".channel:visible").eq(new_index));
            } else {
                channel.insertAfter($(".channel:visible").eq(new_index));
            }
        }
    });
});

$("#ev-select").on("change", function () {
    var selected_events = $("#ev-select").select2("data").map(function (event) {
        return event.id;
    });
    $(".channel").show();
    $(".channel-label").show();
    $(".block").show();
    $(".event-title").show();
    if (selected_events.length > 0) {
        $(".event-title").each(function () {
            if (!selected_events.includes($(this).text())) {
                $(this).hide();
            }
        });
        $(".block").each(function () {
            if (!selected_events.includes($(this).data("event"))) {
                $(this).hide();
            }
        });
        $(".channel").each(function () {
            if ($(this).find(".block:visible").not(".empty").length === 0) {
                $(this).hide();
                $("#" + $(this).data("labelid")).hide();
            }
        });
    }
    $("#ch-select").trigger("change");
});

$("#ch-select").on("change", function () {
    var selected_channels = $("#ch-select").select2("data").map(function (ch) {
        return ch.id;
    });
    $(".channel").show();
    $(".channel-label").show();
    if (selected_channels.length > 0) {
        $(".channel").each(function () {
            var chid = this.id;
            if (!selected_channels.includes(chid)) {
                $(this).hide();
                $("#" + $(this).data("labelid")).hide();
            }
        });
    }
});

function select_json(selected_json_id) {
    $("#channel-container, #channel-label-container").empty();
    $(".channel-label-container").children().remove();
    $("#json-code").empty();
    $("#json-select option").removeClass("selected");
    $("#remove-json, #view-code").button("enable");
    $("#ev-select, #ch-select").prop("disabled", false);
    $("#json-select").find("[value=" + selected_json_id + "]").addClass("selected");
    sjxComet.request("show_signals", [selected_json_id]);
}

$("#json-select").on("select2:select", function (e) {
    var selected_json_id = e.params.data.id;
    select_json(selected_json_id);
});

$("#json-select").on("select2:clear", function () {
    $("#channel-container, #channel-label-container").empty();
    select_none();
});

// Display block info on double click
$(document).on("dblclick", ".block", function () {
    if (!$(this).hasClass("empty")) {
        $(".block").removeClass("selected");
        $(this).addClass("selected");
        var data = $(this).data("info");
        var info = $("#block-info");
        info.dialog({
            title: data.eventType
        });
        info.empty();
        for (var param in data) {
            if (param === "values") {
                info.append("<tr><td>num pnts</td><td>" + data[param].length + "</td></tr>");
            } else if (!(["eventType", "name", "times"].includes(param) || data[param].toString() === "")) {
                info.append("<tr><td>" + param + "</td><td>" + data[param] + "</td></tr>");
            }
        }
        info.dialog("open");
    }
});

// Turn real frequency into a readable frequency for the signal display
function readable_freq(freq, length) {
    return length * ((freq <= 1) ? 1: Math.floor(Math.max(3, Math.log10(freq) + 1)));
}

// Increment block count
function inc_block_cnt(channel) {
    var channel_label = $("#" + channel.data("labelid"));
    var block_cnt = channel_label.find(".block-cnt");
    block_cnt.text(parseInt(block_cnt.text()) + 1);
}

// Initialize a channel
function init_channel(channel_name) {
    var labelid = "label-" + channel_name;
    $("#channel-container").append("<div class='channel' id='" + channel_name + "'></div>");
    var channel = $("#" + channel_name);
    channel.data("labelid", labelid);
    $("#channel-label-container").append("<div class='channel-label' id='" + labelid + "'><br/>" + channel_name + "<br/>blocks: <span class='block-cnt'>0</span></p></div>")
    $("#" + labelid).data("chid", channel_name);
    return channel;
}

// Initialize a block
function init_block(channel, data, length, event_name) {
    var new_block_id = channel.attr("id") + "block" + channel.children().length;
    channel.append("<div class='block' id='" + new_block_id + "'><canvas></canvas></div>");
    var block = $("#" + new_block_id);
    block.data({
        "info": data,
        "event": event_name
    });
    block.find("canvas").width(length * 100);
    return block;
}

// Initialize a canvas
function init_canvas(block) {
    var canvas = block.find("canvas")[0];
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    canvas.width = rect.width;
    canvas.height = rect.height;
    return {
        width: canvas.width,
        height: canvas.height,
        ctx: ctx
    };
}

// Initialize a canvas plotting function
function init_plot_func(block, canvas) {
    function plot(func, range) {
        var scaled_width = (canvas.width / (range[1] - range[0]));
        var scaled_height = (canvas.height / (range[3] - range[2]));
        canvas.ctx.beginPath();
        for (var x = 0; x < canvas.width; x = x + 0.01) {
            var scaled_x = (x / scaled_width) - range[0];
            var scaled_y = func(scaled_x);
            var y = canvas.height - (scaled_y - range[2]) * scaled_height;
            if (x === 0) {
                canvas.ctx.moveTo(x, y);
                block.data("start", scaled_y);
            } else if (x === canvas.width - 1) {
                canvas.ctx.lineTo(x, y);
                block.data("end", scaled_y);
            } else {
                canvas.ctx.lineTo(x, y);
            }
        }
        canvas.ctx.strokeStyle = "limegreen";
        canvas.ctx.lineWidth = 3;
        canvas.ctx.stroke();
    }
    return plot;
}

// Initialize a plotting function
function init_func (data, length) {
    function func(x) {
        var res = 0;
        var amp_sign, value_sign, height_sign, dist_center;
        switch (data.eventType) {
            case "sine":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, length);
                res = amp_sign * Math.sin(2 * Math.PI * x);
                break;
            case "saw":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, length);
                res = amp_sign * 2 * (x - Math.floor(x)) - 1;
                break;
            case "square":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, length);
                res = amp_sign * 2 * (2 * Math.floor(x) - Math.floor(2 * x)) + 1;
                break;
            case "triangle":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, length);
                res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                break;
            case "constant":
                res = Math.sign(data.value);
                break;
            case "chirp":
                var start_freq = readable_freq(data.start_frequency, length);
                var end_freq = Math.max(data.end_frequency / start_freq, 30) * start_freq;
                var chirpiness;
                if (data.chirp_type === "exponential") {
                    chirpiness = end_freq / start_freq;
                    res = Math.sin(2 * Math.PI * start_freq * (Math.pow(chirpiness, x) - 1) / Math.log(chirpiness));
                } else if (data.chirp_type === "linear") {
                    chirpiness = end_freq - start_freq;
                    res = Math.sin(2 * Math.PI * (chirpiness / 2 * Math.pow(x, 2) + start_freq * x));
                }
                break;
            case "ramp":
                value_sign = Math.sign(data.value);
                if (x > 0.2) {
                    res = (x < 0.8) ? value_sign * (x - 0.2) / (0.6) : value_sign;
                }
                break;
            case "step":
                value_sign = Math.sign(data.value);
                if (x > 0.2) {
                    res = (x < 0.8) ? value_sign * ((x - 0.2) / (0.6) - ((x - 0.2) / (0.6)) % (1 / data.steps)) : value_sign;
                }
                break;
            case "pulse":
                amp_sign = Math.sign(data.amplitude);
                var freq = readable_freq(data.frequency, length);
                var rising = data.rising * data.frequency / freq;
                var width = data.width * data.frequency / freq;
                var falling = data.falling * data.frequency / freq;
                x = x % (1 / freq);
                if (x < rising) {
                    res = amp_sign * x / rising;
                } else if (x < rising + width) {
                    res = amp_sign;
                } else if (x < rising + width + falling) {
                    res = amp_sign * (1 - (x - rising - width) / falling);
                }
                break;
            case "points":
                var max_value = Math.max(...data.values.map(function (value) {
                    return Math.abs(value)
                }));
                var times = data.times.map(function (t) {
                    return t / Math.max(...data.times);
                });
                var values = data.values.map(function (value) {
                    return value / max_value
                });
                var last_pnt_time = x <= Math.min(...times) ? 0 : Math.max.apply(Math, times.filter(function (y) {
                    return y <= x
                }));
                var next_pnt_time = x >= Math.max(...times) ? 1 : Math.min.apply(Math, times.filter(function (y) {
                    return y > x
                }));
                var last_pnt_value = x <= Math.min(...times) ? 0 : values[times.indexOf(last_pnt_time)];
                var next_pnt_value = x >= Math.max(...times) ? 0 : values[times.indexOf(next_pnt_time)];
                res = (next_pnt_value - last_pnt_value) / (next_pnt_time - last_pnt_time) * (x - last_pnt_time) + last_pnt_value;
                break;
            case "exponential":
                value_sign = Math.sign(data.value);
                res = value_sign * Math.pow(Math.E, -data.decay * x);
                break;
            case "log":
                res = Math.log10(x + 1) / Math.log10(2);
                break;
            case "Lorentzian":
                height_sign = Math.sign(data.height);
                var gamma = data.width / 2;
                dist_center = data.center;
                res = height_sign * Math.pow(gamma, 2) / (Math.pow(x - dist_center, 2) + Math.pow(gamma, 2));
                break;
            case "Gaussian":
                height_sign = Math.sign(data.height);
                dist_center = data.center;
                res = height_sign * Math.pow(Math.E, -1 / 2 * Math.pow((x - dist_center) / data.std, 2));
                break;
            case "step_triangle":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, length);
                res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                res = res - res % (2 / data.steps);
                break;
            case "none":
                res = 2; // larger than y-bounds
                break;
            default:
                res = 0;
        }
        switch (data.rectified) {
            case "half":
                res = (res < 0) ? 0 : res;
                break;
            case "full":
                res = Math.abs(res);
                break;
            default:
                break;
        }
        return res;
    }
    return func;
}

// Create a new block
function create_block(data, length, event_name) {
    var channel_ids = $("#channel-container").children().map(function() {
        return this.id;
    }).get();
    var channel;
    if (channel_ids.includes(data.name)) {
        channel = $("#" + data.name);
    } else {
        channel = init_channel(data.name);
    }
    inc_block_cnt(channel);
    var block = init_block(channel, data, length, event_name);
    var canvas = init_canvas(block);
    if (defined_events.includes(data.eventType)) {
        var plot = init_plot_func(block, canvas);
        var func = init_func(data, length);
        plot(func, [0, 1, -1.2, 1.2]);
    } else if (data.eventType === "none") {
        block.addClass("empty");
    } else if (data.eventType === "TTL") {
        canvas.ctx.beginPath();
        [data.VCC, data.VOH, data.VIH, data.VOL, data.VIL].forEach(function (level, index) {
            canvas.ctx.moveTo(0, (1 - level / data.VCC) * canvas.height);
            canvas.ctx.lineTo(canvas.width, (1 - level / data.VCC) * canvas.height);
        });
        canvas.ctx.strokeStyle = "limegreen";
        canvas.ctx.lineWidth = 2;
        canvas.ctx.setLineDash([5, 5]);
        canvas.ctx.stroke();
    } else {
        canvas.ctx.font="20px Arial";
        canvas.ctx.fillStyle = "limegreen";
        canvas.ctx.textAlign = "center";
        canvas.ctx.fillText(data.eventType, canvas.width / 2, canvas.height / 2);
    }
}

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

// Link scrolling between event names and signals
$("#event-names").on("scroll", function () {
    $("#channel-container").scrollLeft($(this).scrollLeft());
});

$("#channel-container").on("scroll", function () {
    $("#event-names").scrollLeft($(this).scrollLeft());
});

// Add a new event
function add_event(name, length) {
    $("#event-names").append("<div class='event-title' style='width: " + (100 * length - 2) + "px'><br>" + name + "</div>");
    $("#ev-select").append("<option val='" + name + "'>" + name + "</option>");
}

// Toggle fullscreen mode
$("#fullscreen").on("click", function () {
    if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    ) {
        $("#signals").css("max-height", "270px");
        if (document.exitFullscreen) {
            document.exitFullscreen();
            $(this).text("fullscreen");
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
            $(this).text("fullscreen");
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
            $(this).text("fullscreen");
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
            $(this).text("fullscreen");
        }
    } else {
        $("#signals").css("max-height", "none");
        element = $("#channels").get(0);
        if (element.requestFullscreen) {
            element.requestFullscreen();
            $(this).text("fullscreen_exit");
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
            $(this).text("fullscreen_exit");
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            $(this).text("fullscreen_exit");
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
            $(this).text("fullscreen_exit");
        }
    }
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
    var selects = $("#ev-select, #ch-select");
    $("#remove-json, #view-code").button("disable");
    selects.empty();
    $("#event-names").empty();
    selects.prop("disabled", true);
}

function refresh_json_options() {
    $("#json-select").val(null).trigger("change");
}

