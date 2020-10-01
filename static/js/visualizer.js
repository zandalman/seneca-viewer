// List of defined event types
// Undefined event types will be displayed as text
var DEFINED_EVENTS = [
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

// Dictionary of default parameter values
var DEFAULTS = {
    amplitude: 1,
    frequency: 100,
    value: 1,
    start_frequency: 1,
    end_frequency: 100,
    steps: 5,
    times: [0, 1, 2, 3, 3.5, 4],
    values: [0, 1, 0, 0.5, -1.5, 0],
    rectified: "false",
    width: 0.2,
    center: 0.5,
    rising: 0.001,
    falling: 0.001,
    std: 0.2,
    VCC: 5,
    VOH: 2.7,
    VIH: 2,
    VIL: 0.8,
    VOL: 0.4
};

// Dictionary of units
var UNITS = {
    amplitude: "V",
    frequency: "Hz",
    value: "V",
    start_frequency: "Hz",
    end_frequency: "Hz",
    width: "s",
    center: "s",
    rising: "s",
    falling: "s",
    std: "s",
    VCC: "V",
    VOH: "V",
    VIH: "V",
    VIL: "V",
    VOL: "V",
    delay: "s"
};

// List of event parameters to not display
HIDE_PARAMS = [
    "len",
    "eventType",
    "group",
    "alias"
];

// Initialize trace color
var color = "red";

$(document).ready(function () {
    // Initialize event filter
    $("#grp-filter").select2({
        placeholder: "None",
        disabled: true
    });
    // Initialize channel filter
    $("#ch-filter").select2({
        placeholder: "None",
        disabled: true
    });
    $(".select2-container").css("width", "90%");
});

// Stream updates to selected JSON from main page
sjxComet.request("update");

$("#test").on("click", function () {
    sjxComet.request("test");
});

function disable_filters() {
    $("#ch-filter, #grp-filter").prop("disabled", true);
}

function enable_filters() {
    $("#ch-filter, #grp-filter").prop("disabled", false);
}

function set_color(stage0, stage1, stage2) {
    if (stage0) {
        color = "red";
    } else if (stage1) {
        color = "yellow";
    } else if (stage2) {
        color = "limegreen";
    }
}

// Turn real frequency into a readable frequency for the signal display
function readable_freq(freq, length) {
    return length * ((freq <= 1) ? 1: Math.floor(Math.max(3, Math.log10(freq) + 1)));
}

// Initialize a block
function init_block(block, data) {
    block.data("info", data);
    block.find("canvas").width(data.len * 100);
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
function init_plot_func(block, canvas, color) {
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
        canvas.ctx.strokeStyle = color;
        canvas.ctx.lineWidth = 3;
        canvas.ctx.stroke();
    }
    return plot;
}

function insert_defaults(data) {
    Object.keys(data).forEach(function(key) {
        if (Object.keys(DEFAULTS).includes(key) && (typeof data[key]) === "string") {
            data[key] = DEFAULTS[key];
        }
    });
    return data;
}

// Initialize a plotting function
function init_func (data) {
    data = insert_defaults(data);
    function func(x) {
        var res = 0;
        var amp_sign, value_sign, height_sign, dist_center;
        switch (data.eventType) {
            case "sine":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, data.len);
                res = amp_sign * Math.sin(2 * Math.PI * x);
                break;
            case "saw":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, data.len);
                res = amp_sign * 2 * (x - Math.floor(x)) - 1;
                break;
            case "square":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, data.len);
                res = amp_sign * 2 * (2 * Math.floor(x) - Math.floor(2 * x)) + 1;
                break;
            case "triangle":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, data.len);
                res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                break;
            case "constant":
                res = Math.sign(data.value);
                break;
            case "chirp":
                var start_freq = readable_freq(data.start_frequency, data.len);
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
                var freq = readable_freq(data.frequency, data.len);
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
                x = x * readable_freq(data.frequency, data.len);
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
function create_block(data, ch_id, ch_label_id, event_id) {
    var channel_ids = $("#channel-container").children().map(function() {
        return this.id;
    }).get();
    var channel = $("#" + ch_id);
    var channel_label = $("#" + ch_label_id);
    var block = $("#" + event_id);
    init_block(block, data);
    var canvas = init_canvas(block);
    if (DEFINED_EVENTS.includes(data.eventType)) {
        var plot = init_plot_func(block, canvas, color);
        var func = init_func(data);
        plot(func, [0, 1, -1.2, 1.2]);
    } else if (data.eventType === "TTL") {
        canvas.ctx.beginPath();
        [data.VCC, data.VOH, data.VIH, data.VOL, data.VIL].forEach(function (level, index) {
            canvas.ctx.moveTo(0, (1 - level / data.VCC) * canvas.height);
            canvas.ctx.lineTo(canvas.width, (1 - level / data.VCC) * canvas.height);
        });
        canvas.ctx.strokeStyle = color;
        canvas.ctx.lineWidth = 2;
        canvas.ctx.setLineDash([5, 5]);
        canvas.ctx.stroke();
    } else {
        canvas.ctx.font="20px Arial";
        canvas.ctx.fillStyle = color;
        canvas.ctx.textAlign = "center";
        canvas.ctx.fillText(data.eventType, canvas.width / 2, canvas.height / 2);
    }
}

function reset() {
    $("#channel-container, #channel-label-container, #group-label-container, #ch-filter, #grp-filter").empty();
}

function insert_channel_info(ch_label_id, info, ch_name) {
    $("#" + ch_label_id).data("info", info);
    $("#" + ch_label_id).data("ch_name", ch_name);
}

// Filter out unselected events
function filter_groups() {
    var selected_groups = $("#grp-filter").select2("val");
    if (selected_groups.length > 0) {
        $(".block, .group-label").each(function () {
            if ($(this).hasClass("block")) {
                var group = $(this).data("info").group;
            } else {
                var group = $(this).data("group");
            }
            if (!selected_groups.includes(group)) {
                $(this).addClass("hidden");
            }
        });
        $(".channel").each(function () {
            if ($(this).find(".block").not(".hidden").length === 0) {
                $(this).addClass("hidden");
                $("#" + $(this).data("lid")).addClass("hidden");
            }
        });
    }
}

// Filter out unselected channels
function filter_channels() {
    var selected_channels = $("#ch-filter").select2("val");
    if (selected_channels.length > 0) {
        $(".channel").each(function () {
            var ch_id = this.id;
            if (!selected_channels.includes(ch_id)) {
                $(this).addClass("hidden");
                $("#" + $(this).data("lid")).addClass("hidden");
            }
        });
    }
}

$("#grp-filter").on("change", function () {
    $(".channel, .channel-label, .block, .group-label").removeClass("hidden");
    filter_groups();
    filter_channels();
    $("#block-info").dialog("close");
});

$("#ch-filter").on("change", function () {
    $(".channel, .channel-label").removeClass("hidden");
    filter_channels();
    filter_groups();
});

// Display block info on click
$(document).on("click", ".block", function () {
    $(".block, .channel-label, .group-label").removeClass("selected");
    $(this).addClass("selected");
    var params = $(this).data("info");
    var params_table = $("#params");
    $("#caption").html("event: " + params.eventType);
    params_table.empty();
    for (var param in params) {
        if (!HIDE_PARAMS.includes(param)) {
            var unit = Object.keys(UNITS).includes(param) ? " " + UNITS[param]: "";
            if (typeof params[param] === "object") {
                params_table.append("<tr><td class='redbold'>" + param + "</td><td class='redbold'>" + params[param].length + unit + "</td></tr>");
            } else if (typeof params[param] === "number" && Math.abs(Math.log10(params[param])) > 3) {
                params_table.append("<tr><td>" + param + "</td><td>" + params[param].toExponential(2) + unit + "</td></tr>");
            } else {
                params_table.append("<tr><td>" + param + "</td><td>" + params[param] + unit + "</td></tr>");
            }
        }
    }
});

// Display channel info on click
$(document).on("click", ".channel-label", function () {
    $(".block, .channel-label, .group-label").removeClass("selected");
    $(this).addClass("selected");
    var params = $(this).data("info");
    var params_table = $("#params");
    $("#caption").html("channel: " + $(this).data("ch_name"));
    params_table.empty();
    var num_blocks = $("#" + $(this).data("chid") + " .block").length;
    params_table.append("<tr><td>blocks</td><td>" + num_blocks + "</td></tr>");
    for (var param in params) {
        params_table.append("<tr><td>" + param + "</td><td>" + params[param] + "</td></tr>");
    }
});

// Display channel info on click
$(document).on("click", ".group-label", function () {
    $(".block, .channel-label, .group-label").removeClass("selected");
    $(this).addClass("selected");
    var params_table = $("#params");
    var group_name = $(this).data("group");
    $("#caption").html("group: " + group_name);
    params_table.empty();
    var num_blocks = $(".block").filter(function () {
        return $(this).data("info").group === group_name;
    }).length;
    params_table.append("<tr><td>blocks</td><td>" + num_blocks + "</td></tr>");
});

function get_position(block) {
    var pos = 0;
    block.prevAll(":not(.hidden)").each(function () {
        pos += $(this).data("info").len;
    });
    return pos;
}

function find_block(blocks, pos) {
    var block = blocks.not(".hidden").last();
    blocks.each(function () {
        if (get_position($(this)) > pos) {
            block = $(this).prevAll(":not(.hidden):last");
        }
    });
    return block;
}

// add keydown listeners
window.addEventListener("keydown", function (event) {
    var selected = $(".selected");
    if (event.key === "Escape") {
        $(".block, .channel-label, .group-label").removeClass("selected");
        event.preventDefault();
    } else if (event.key === "ArrowDown") {
        if (selected.hasClass("channel-label")) {
            if (selected.nextAll(":not(.hidden):first").length > 0) {
                selected.nextAll(":not(.hidden):first").trigger("click");
            }
        } else if (selected.hasClass("group-label")) {
            var group_name = selected.data("group");
            $(".channel").not(".hidden").first().find(".block").filter(function () {
                return $(this).data("info").group === group_name;
            }).trigger("click");
        } else if (selected.parent().nextAll(":not(.hidden):first").length > 0) {
            var pos = get_position(selected);
            var blocks = selected.parent().nextAll(":not(.hidden):first").find(".block");
            find_block(blocks, pos).trigger("click");
        }
        event.preventDefault();
    } else if (event.key === "ArrowUp") {
        if (selected.hasClass("channel-label")) {
            if (selected.prevAll(":not(.hidden):last").length > 0) {
                selected.prevAll(":not(.hidden):last").trigger("click");
            }
        } else if (selected.hasClass("block")) {
            if (selected.parent().prevAll(":not(.hidden):last").length > 0) {
                var pos = get_position(selected);
                var blocks = $(selected.parent().prevAll(":not(.hidden):last")).find(".block");
                find_block(blocks, pos).trigger("click");
            } else {
                var group_name = selected.data("info").group;
                $(".group-label").filter(function () {
                    return $(this).data("group") === group_name;
                }).trigger("click");
            }
        }
        event.preventDefault();
    } else if (event.key === "ArrowLeft") {
        if (!selected.hasClass("channel-label")) {
            if (selected.prevAll(":not(.hidden):last").length > 0) {
                selected.prevAll(":not(.hidden):last").trigger("click");
            } else if (selected.hasClass("block")) {
                $("#" + selected.parent().data("lid")).trigger("click");
            }
        }
        event.preventDefault();
    } else if (event.key === "ArrowRight") {
        if (selected.hasClass("channel-label")) {
            var blocks = $("#" + selected.data("chid") + " .block");
            if (blocks.length > 0) {
                blocks.first().trigger("click");
            }
        } else {
            if (selected.nextAll(":not(.hidden):first").length > 0) {
                selected.nextAll(":not(.hidden):first").trigger("click");
            }
        }
        event.preventDefault();
    }
});

// Link scrolling between channels and group labels
$("#group-label-container").on("scroll", function () {
    if ($(this).scrollLeft() === 0) {
        $("#group-label-container, #channel-container").removeClass("scrolling");
    } else {
        $("#group-label-container, #channel-container").addClass("scrolling");
    }
    $("#channel-container").scrollLeft($(this).scrollLeft());
});

$("#channel-container").on("scroll", function () {
    if ($(this).scrollLeft() === 0) {
        $("#group-label-container, #channel-container").removeClass("scrolling");
    } else {
        $("#group-label-container, #channel-container").addClass("scrolling");
    }
    $("#group-label-container").scrollLeft($(this).scrollLeft());
});

$(document).on("click", ".up-arrow", function () {
    var channel_label = $(this).parent();
    if (channel_label.index() !== 0) {
        var channel = $("#" + channel_label.data("chid"));
        channel_label.insertBefore(channel_label.prevAll(":not(.hidden):last"));
        channel.insertBefore(channel.prevAll(":not(.hidden):last"));
    }
});

$(document).on("click", ".down-arrow", function () {
    var channel_label = $(this).parent();
    if (channel_label.index() !== $(".channel-label").length) {
        var channel = $("#" + channel_label.data("chid"));
        channel_label.insertAfter(channel_label.nextAll(":not(.hidden):first"));
        channel.insertAfter(channel.nextAll(":not(.hidden):first"));
    }
});
