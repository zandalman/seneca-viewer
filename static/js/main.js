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
    $("button").button();
    $("#remove-json").button("disable");
    $("#json").selectmenu({
        change: function (event, ui) {
            $("#channel-container, #channel-label-container").empty();
            $(".channel-label-container").children().remove();
            if (ui.item.value === "none") {
                $("#remove-json").button("disable");
            } else {
                $("#remove-json").button("enable");
                Sijax.request("show_signals", [ui.item.value]);
            }
        }
    });
    $("#channels").selectableScroll({
        scrollSnapX: 5,
        scrollAmount: 25,
        filter: ".channel",
        distance: 5,
        stop: function(event, ui) {
            if ($(".channel.ui-selected").length === 0) {
                $("#selected-channels").html("None");
            } else {
                $("#selected-channels").empty();
                $(".channel.ui-selected").each(function () {
                    $("#selected-channels").append(this.id + " ");
                });
            }
        }
    });
    $("#block-info").dialog({
        autoOpen: false,
        close: function (event, ui) {
            $(".block").removeClass("selected");
        }
    });
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

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        $(".ui-selected").removeClass("ui-selected");
        $("#selected-channels").text("None");
    }
});

$(document).on("dblclick", ".block", function () {
    $(".block").removeClass("selected");
    $(this).addClass("selected");
    var data = $(this).data("info");
    var time = $(this).data("time");
    var info = $("#block-info");
    info.dialog({
        title: data.name + " (" + data.eventType + ")"
    });
    info.html("<tr><td>time</td><td>" + time + "</td></tr>");
    for (var param in data) {
        if (param === "values") {
            info.append("<tr><td>num pnts</td><td>" + data[param].length + "</td></tr>");
        } else if (!(["eventType", "name", "time", "times", "channel"].includes(param) || data[param].toString() === "")) {
            info.append("<tr><td>" + param + "</td><td>" + data[param] + "</td></tr>");
        }
    }
    info.dialog("open");
});

function readable_freq(freq, time) {
    return (freq * time <= 1) ? 1: Math.floor(Math.max(3, Math.log10(freq * time) + 1));
}

function inc_block_cnt(channel) {
    var channel_label = $("#" + channel.data("labelid"));
    var block_cnt = channel_label.find(".block-cnt");
    block_cnt.text(parseInt(block_cnt.text()) + 1);
}

function get_channel(channel) {
    var channel_ids = $("#channel-container").children().map(function() {
        return this.id;
    }).get();
    if (!channel_ids.includes(channel)) {
        var labelid = "label-" + channel;
        $("#channel-container").append("<div class='channel' id='" + channel + "'></div>");
        $("#" + channel).data({
            "labelid": labelid,
            "time": 0
        });
        $("#channel-label-container").append("<div class='channel-label' id='" + labelid + "'><br/>" + channel + "<br/>blocks: <span class='block-cnt'>0</span></p></div>")
        $("#" + labelid).data("chid", channel);
    };
    return $("#" + channel);
}

function init_block(channel, data, time, length) {
    var new_block_id = channel.attr("id") + "block" + channel.children().length;
    channel.append("<div class='block' id='" + new_block_id + "'><canvas></canvas></div>");
    var block = $("#" + new_block_id);
    block.data({
        "info": data,
        "time": time
    });
    block.find("canvas").width(length * 100);
    channel.data("time", channel.data("time") + time);
    return block;
}

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

function init_func (data, time) {
    function func(x) {
        var res = 0;
        var amp_sign, value_sign, height_sign, dist_center;
        switch (data.eventType) {
            case "sine":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, time);
                res = amp_sign * Math.sin(2 * Math.PI * x);
                break;
            case "saw":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, time);
                res = amp_sign * 2 * (x - Math.floor(x)) - 1;
                break;
            case "square":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, time);
                res = amp_sign * 2 * (2 * Math.floor(x) - Math.floor(2 * x)) + 1;
                break;
            case "triangle":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, time);
                res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                break;
            case "constant":
                res = Math.sign(data.value);
                break;
            case "chirp":
                var start_freq = readable_freq(data.start_frequency, time);
                var end_freq = Math.max(data.end_frequency / start_freq, 30) * start_freq;
                var chirpiness;
                if (data.chirp_type === "exponential") {
                    chirpiness = Math.pow(end_freq / start_freq, 1 / time);
                    res = Math.sin(2 * Math.PI * start_freq * (Math.pow(chirpiness, x) - 1) / Math.log(chirpiness));
                } else if (data.chirp_type === "linear") {
                    chirpiness = (end_freq - start_freq) / time;
                    res = Math.sin(2 * Math.PI * (chirpiness / 2 * Math.pow(x, 2) + start_freq * x));
                }
                break;
            case "ramp":
                value_sign = Math.sign(data.value);
                if (x > 0.2 * time) {
                    res = (x < 0.8 * time) ? value_sign * (x - 0.2 * time) / (0.6 * time) : value_sign;
                }
                break;
            case "step":
                value_sign = Math.sign(data.value);
                if (x > 0.2 * time) {
                    res = (x < 0.8 * time) ? value_sign * ((x - 0.2 * time) / (0.6 * time) - ((x - 0.2 * time) / (0.6 * time)) % (1 / data.steps)) : value_sign;
                }
                break;
            case "pulse":
                amp_sign = Math.sign(data.amplitude);
                var freq = readable_freq(data.frequency, time);
                var rising = data.rising * data.frequency / (time * freq);
                var width = data.width * data.frequency / (time * freq);
                var falling = data.falling * data.frequency / (time * freq);
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
                    return t / time
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
                res = value_sign * Math.pow(Math.E, -data.decay * x * time);
                break;
            case "log":
                res = Math.log1p(x * time) / Math.log1p(time);
                break;
            case "Lorentzian":
                height_sign = Math.sign(data.height);
                var gamma = data.width / 2;
                dist_center = data.center / time;
                res = height_sign * Math.pow(gamma, 2) / (Math.pow(x - dist_center, 2) + Math.pow(gamma, 2));
                break;
            case "Gaussian":
                height_sign = Math.sign(data.height);
                dist_center = data.center / time;
                res = height_sign * Math.pow(Math.E, -1 / 2 * Math.pow((x - dist_center) / data.std, 2));
                break;
            case "step_triangle":
                amp_sign = Math.sign(data.amplitude);
                x = x * readable_freq(data.frequency, time);
                res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                res = res - res % (2 / data.steps);
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

function create_block(data, time, length) {
    var channel = get_channel(data.channel);
    inc_block_cnt(channel);
    var block = init_block(channel, data, time, length);
    var canvas = init_canvas(block);
    if (defined_events.includes(data.eventType)) {
        var plot = init_plot_func(block, canvas);
        var func = init_func(data, time);
        plot(func, [0, 1, -1.2, 1.2]);
    } else {
        canvas.ctx.font="20px Arial";
        canvas.ctx.fillStyle = "limegreen";
        canvas.ctx.textAlign = "center";
        canvas.ctx.fillText(data.eventType, canvas.width / 2, canvas.height / 2);
    }
}

$("#remove-json").on("click", function () {
    var selected_json_id = $("#json").children("option:selected").val();
    $("#json").children("option:selected").remove();
    refresh_json_options();
    if ($("#json").children("option:selected").val() === "none") {
        $("#remove-json").button("disable");
    }
    $("#channel-container, #channel-label-container").empty();
    Sijax.request("remove_json", [selected_json_id]);
});

function refresh_json_options() {
    $("#json").selectmenu("refresh");
}

$("#ch-filter").on("input", function() {
    $(".channel").show();
    $(".channel-label").show();
    var filters = $(this).val().split(",");
    $(".channel").each(function () {
        var chid = this.id;
        if (filters.some(function(filter) {return (chid.indexOf(filter) === -1)})) {
            $(this).hide();
            $("#" + $(this).data("labelid")).hide();
        }
    });
});

$("#event-names").on("scroll", function () {
    $("#channel-container").scrollLeft($(this).scrollLeft());
});
$("#channel-container").on("scroll", function () {
    $("#event-names").scrollLeft($(this).scrollLeft());
});
