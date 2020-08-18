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
        autoOpen: false
    });
});

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        $(".ui-selected").removeClass("ui-selected");
        $("#selected-channels").text("None");
    }
});

$(document).on("dblclick", ".block", function () {
    var block_data = $(this).data("info");
    var block_time = $(this).data("time");
    var block_info = $("#block-info");
    block_info.dialog({
        title: block_data.name + " (" + block_data.eventType + ")"
    });
    block_info.html("<tr><td>time</td><td>" + block_time + "</td></tr>");
    for (var param in block_data) {
        if (param === "values") {
            $("#block-info").append("<tr><td>num pnts</td><td>" + block_data[param].length + "</td></tr>");
        } else if (!(["eventType", "name", "time", "times", "channel"].includes(param) || block_data[param].toString() === "")) {
            $("#block-info").append("<tr><td>" + param + "</td><td>" + block_data[param] + "</td></tr>");
        }
    }
    block_info.dialog("open");
});

function readable_freq(freq, block_time) {
    return (freq * block_time <= 1) ? 1: Math.floor(Math.max(3, Math.log10(freq * block_time) + 1));
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
    };
    return $("#" + channel);
}

function create_block(block_data, block_time) {
    var channel = get_channel(block_data.channel);
    inc_block_cnt(channel);
    var new_block_id = channel.attr("id") + "block" + channel.children().length;
    channel.append("<div class='block' id='" + new_block_id + "'><canvas></canvas></div>");
    $("#" + new_block_id).data({
        "info": block_data,
        "time": block_time
    });
    channel.data("time", channel.data("time") + block_time);
    var canvas = $("#" + new_block_id + " canvas")[0];
    var ctx = canvas.getContext("2d");
    $("#" + new_block_id + " canvas").width((1 + Math.log10(block_time) / (1 + Math.log10(block_time))) * 200);
    var width = canvas.width;
    var height = canvas.height;
    function plot(fn, range) {
        var widthScale = (width / (range[1] - range[0]));
        var heightScale = (height / (range[3] - range[2]));
        ctx.beginPath();
        for (var x = 0; x < width; x++) {
            var xFnVal = (x / widthScale) - range[0]
            var yGVal = height - (fn(xFnVal) - range[2]) * heightScale;
            if (x === 0) {
                ctx.moveTo(x, yGVal);
                $("#" + new_block_id).data("start", fn(xFnVal));
            } else if (x === width - 1) {
                ctx.lineTo(x, yGVal);
                $("#" + new_block_id).data("end", fn(xFnVal));
            } else {
                ctx.lineTo(x, yGVal);
            }
        }
        ctx.strokeStyle = "limegreen";
        ctx.lineWidth = 3;
        ctx.stroke();
    };
    if (defined_events.includes(block_data.eventType)) {
        plot(function (x) {
            var res = 0;
            var amp_sign, value_sign, height_sign, dist_center;
            switch (block_data.eventType) {
                case "sine":
                    amp_sign = Math.sign(block_data.amplitude);
                    x = x * readable_freq(block_data.frequency, block_time);
                    res = amp_sign * Math.sin(2 * Math.PI * x);
                    break;
                case "saw":
                    amp_sign = Math.sign(block_data.amplitude);
                    x = x * readable_freq(block_data.frequency, block_time);
                    res = amp_sign * 2 * (x - Math.floor(x)) - 1;
                    break;
                case "square":
                    amp_sign = Math.sign(block_data.amplitude);
                    x = x * readable_freq(block_data.frequency, block_time);
                    res = amp_sign * 2 * (2 * Math.floor(x) - Math.floor(2 * x)) + 1;
                    break;
                case "triangle":
                    amp_sign = Math.sign(block_data.amplitude);
                    x = x * readable_freq(block_data.frequency, block_time);
                    res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                    break;
                case "constant":
                    res = Math.sign(block_data.value);
                    break;
                case "function":
                    break;
                case "chirp":
                    var start_freq = readable_freq(block_data.start_frequency, block_time);
                    var end_freq = Math.max(block_data.end_frequency / start_freq, 30) * start_freq;
                    var chirpiness;
                    if (block_data.chirp_type === "exponential") {
                        chirpiness = Math.pow(end_freq / start_freq, 1 / block_time);
                            res = Math.sin(2 * Math.PI * start_freq * (Math.pow(chirpiness, x) - 1) / Math.log(chirpiness));
                        } else if (block_data.chirp_type === "linear") {
                            chirpiness = (end_freq - start_freq) / block_time;
                            res = Math.sin(2 * Math.PI * (chirpiness / 2 * Math.pow(x, 2) + start_freq * x));
                        }
                    break;
                case "ramp":
                    value_sign = Math.sign(block_data.value);
                    if (x > 0.2 * block_time) {
                        res = (x < 0.8 * block_time) ? value_sign * (x - 0.2 * block_time) / (0.6 * block_time): value_sign;
                    }
                    break;
                case "step":
                    value_sign = Math.sign(block_data.value);
                    if (x > 0.2 * block_time) {
                        res = (x < 0.8 * block_time) ? value_sign * ((x - 0.2 * block_time) / (0.6 * block_time) - ((x - 0.2 * block_time) / (0.6 * block_time)) % (1 / block_data.steps)): value_sign;
                    }
                    break;
                case "pulse":
                    amp_sign = Math.sign(block_data.amplitude);
                    var freq = readable_freq(block_data.frequency, block_time);
                    var rising = block_data.rising * block_data.frequency / (block_time * freq);
                    var width = block_data.width * block_data.frequency / (block_time * freq);
                    var falling = block_data.falling * block_data.frequency / (block_time * freq);
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
                    var max_value = Math.max(...block_data.values.map(function(value){return Math.abs(value)}));
                    var times = block_data.times.map(function(time){return time / block_time});
                    var values = block_data.values.map(function(value){return value / max_value});
                    var last_pnt_time = x <= Math.min(...times) ? 0: Math.max.apply(Math, times.filter(function(y){return y <= x}));
                    var next_pnt_time = x >= Math.max(...times) ? 1: Math.min.apply(Math, times.filter(function(y){return y > x}));
                    var last_pnt_value = x <= Math.min(...times) ? 0: values[times.indexOf(last_pnt_time)];
                    var next_pnt_value = x >= Math.max(...times) ? 0: values[times.indexOf(next_pnt_time)];
                    res = (next_pnt_value - last_pnt_value) / (next_pnt_time - last_pnt_time) * (x - last_pnt_time) + last_pnt_value;
                    break;
                case "exponential":
                    value_sign = Math.sign(block_data.value);
                    res = value_sign * Math.pow(Math.E, -block_data.decay * x * block_time);
                    break;
                case "log":
                    res = Math.log1p(x * block_time) / Math.log1p(block_time);
                    break;
                case "Lorentzian":
                    height_sign = Math.sign(block_data.height);
                    var gamma = block_data.width / 2;
                    dist_center = block_data.center / block_time;
                    res = height_sign * Math.pow(gamma, 2) / (Math.pow(x - dist_center, 2) + Math.pow(gamma, 2));
                    break;
                case "Gaussian":
                    height_sign = Math.sign(block_data.height);
                    dist_center = block_data.center / block_time;
                    res = height_sign * Math.pow(Math.E, -1/2 * Math.pow((x - dist_center) / block_data.std, 2));
                    break;
                case "step_triangle":
                    amp_sign = Math.sign(block_data.amplitude);
                    x = x * readable_freq(block_data.frequency, block_time);
                    res = amp_sign * 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * x));
                    res = res - res % (2 / block_data.steps);
                    break;
                default:
                    res = 0;
            }
            switch (block_data.rectified) {
                case "half":
                    res = (res < 0) ? 0: res;
                    break;
                case "full":
                    res = Math.abs(res);
                    break;
                default:
                    break;
            }
            return res;
        }, [0, 1, -1.2, 1.2]);
    } else {
        ctx.font="30px Arial";
        ctx.fillStyle = "limegreen";
        ctx.textAlign = "center";
        ctx.fillText(block_data.eventType, width / 2, height / 2);
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