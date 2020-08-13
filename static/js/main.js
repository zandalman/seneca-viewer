var MQ = MathQuill.getInterface(2);
var func = "";
var CALC_CONST = {
    e: Math.E,
    pi: Math.PI
};
var CALC_NUMARGS = [
  [/^(\^|\*|\/|\+|\-)$/, 2],
  [/^(floor|ceil|(sin|cos|tan|sec|csc|cot)h?)$/, 1]
];

$(document).ready(function () {
    $("#block-container").sortable();
    $("button").button();
    $("#block-type").selectmenu({
        change: function (event, ui) {
            if (ui.item.value === "func") {
                $("#func-enter").show();
            } else {
                $("#func-enter").hide();
            }
        }
    });
    $("#func-enter").hide();
});

var Calc = function(expr, infix) {
    this.valid = true;
    this.expr = expr;
    if (!infix) {
        this.expr = this.latexToInfix(expr);
    }
    var OpPrecedence = function(op) {
        if (typeof op == "undefined") return 0;
        return op.match(/^(floor|ceil|(sin|cos|tan|sec|csc|cot)h?)$/) ? 10: (op === "^") ? 9: (op === "*" || op === "/") ? 8: (op === "+" || op === "-") ? 7: 0;
    }
    var OpAssociativity = function(op) {
        return op.match(/^(floor|ceil|(sin|cos|tan|sec|csc|cot)h?)$/) ? "R" : "L";
    }
    var numArgs = function(op) {
        for (var i = 0; i < CALC_NUMARGS.length; i++) {
            if (CALC_NUMARGS[i][0].test(op)) return CALC_NUMARGS[i][1];
        }
        return false;
    }
    this.rpn_expr = [];
    var rpn_expr = this.rpn_expr;
    this.expr = this.expr.replace(/\s+/g, "");
    // This regex matches any valid token in a user supplied expression (e.g. an operator, a constant, or a variable)
    var in_tokens = this.expr.match(/(\^|\*|\/|\+|\-|\(|\)|[a-zA-Z0-9\.]+)/gi);
    var op_stack = [];
    in_tokens.forEach(function(token) {
        if (/^[a-zA-Z]$/.test(token)) {
            if (CALC_CONST.hasOwnProperty(token)) {
                // Constant
                rpn_expr.push(["num", CALC_CONST[token]]);
            } else {
                // Variable
                rpn_expr.push(["var", token]);
            }
        } else {
            var numVal = parseFloat(token);
            if (!isNaN(numVal)) {
                // Number
                rpn_expr.push(["num", numVal]);
            } else if (token === ")") {
                // Pop tokens off op_stack onto the rpn_expr until we reach a match
                while (op_stack[op_stack.length - 1] !== "(") {
                    rpn_expr.push([numArgs(op_stack[op_stack.length - 1]), op_stack.pop()]);
                    if (op_stack.length === 0) {
                        this.valid = false;
                        return;
                    }
                }
                op_stack.pop();
            } else if (token === "(") {
                op_stack.push(token);
            } else {
                // Operator
                var tokPrec = OpPrecedence(token),
                    headPrec = OpPrecedence(op_stack[op_stack.length - 1]);
                while ((OpAssociativity(token) === "L" && tokPrec <= headPrec) || (OpAssociativity(token) === "R" && tokPrec < headPrec)) {
                    rpn_expr.push([numArgs(op_stack[op_stack.length - 1]), op_stack.pop()]);
                    if (op_stack.length === 0) break;
                    headPrec = OpPrecedence(op_stack[op_stack.length - 1]);
                }
                op_stack.push(token);
            }
        }
    });
    // Push all remaining operators onto the final expression
    while (op_stack.length > 0) {
        var popped = op_stack.pop();
        if (popped === ")") {
            this.valid = false;
            break;
        }
        rpn_expr.push([numArgs(popped), popped]);
    }
}

Calc.prototype.eval = function(x) {
    var stack = [], rpn_expr = this.rpn_expr;
    rpn_expr.forEach(function(token) {
        if (typeof token[0] == "string") {
            switch (token[0]) {
                case "var":
                    // Variable
                    stack.push(x);
                    break;
                case "num":
                    // Number
                    stack.push(token[1]);
                    break;
            }
        } else {
            // Operator
            var numArgs = token[0];
            var args = [];
            do {
                args.unshift(stack.pop());
            } while (args.length < numArgs);
            switch (token[1]) {
                case "*":
                    stack.push(args[0] * args[1]);
                    break;
                case "/":
                    stack.push(args[0] / args[1]);
                    break;
                case "+":
                    stack.push(args[0] + args[1]);
                    break;
                case "-":
                    stack.push(args[0] - args[1]);
                    break;
                case "^":
                    stack.push(Math.pow(args[0], args[1]));
                    break;
                case "sin":
                    stack.push(Math.sin(args[0]));
                    break;
                case "cos":
                    stack.push(Math.cos(args[0]));
                    break;
                case "tan":
                    stack.push(Math.tan(args[0]));
                    break;
                case "sec":
                    stack.push(1 / Math.cos(args[0]));
                    break;
                case "csc":
                    stack.push(1 / Math.sin(args[0]));
                    break;
                case "cot":
                    stack.push(1 / Math.tan(args[0]));
                    break;
                case "sinh":
                    stack.push(0.5 * (Math.pow(Math.E, args[0]) - Math.pow(Math.E, -args[0])));
                    break;
                case "cosh":
                    stack.push(0.5 * (Math.pow(Math.E, args[0]) + Math.pow(Math.E, -args[0])));
                    break;
                case "tanh":
                    stack.push((Math.pow(Math.E, 2*args[0]) - 1) / (Math.pow(Math.E, 2*args[0]) + 1));
                    break;
                case "sech":
                    stack.push(2 / (Math.pow(Math.E, args[0]) + Math.pow(Math.E, -args[0])));
                    break;
                case "csch":
                    stack.push(2 / (Math.pow(Math.E, args[0]) - Math.pow(Math.E, -args[0])));
                    break;
                case "coth":
                    stack.push((Math.pow(Math.E, 2*args[0]) + 1) / (Math.pow(Math.E, 2*args[0]) - 1));
                    break;
                case "floor":
                    stack.push(Math.floor(args[0]));
                    break;
                case "ceil":
                    stack.push(Math.ceil(args[0]));
                    break;
                default:
                    return false;
            }
        }
    });
    return stack.pop();
};

Calc.prototype.latexToInfix = function(latex) {
    var infix = latex;
    infix = infix
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/($2)") // fractions
    .replace(/\\left\(/g, "(") // open parenthesis
    .replace(/\\right\)/g, ")") // close parenthesis
    .replace(/[^\(](floor|ceil|(sin|cos|tan|sec|csc|cot)h?)\(([^\(\)]+)\)[^\)]/g, "($&)") // functions
    .replace(/([^(floor|ceil|(sin|cos|tan|sec|csc|cot)h?|\+|\-|\*|\/)])\(/g, "$1*(")
    .replace(/\)([\w])/g, ")*$1")
    .replace(/([0-9])([A-Za-z])/g, "$1*$2")
  ;
  return infix;
};

var calc = new Calc("0");
var func_span = document.getElementById("func");
var func_math_field = MQ.MathField(func_span, {
    handlers: {
        edit: function() {
            calc = new Calc(func_math_field.latex());
        }
    }
});

$("#new_block").on("click", function () {
    var block_type = $("#block-type").children("option:selected").val();
    create_block(block_type);
});

function create_block(block_type) {
    var new_block_id = "block" + $(".block").length;
    var ymax = 1.2;
    var ymin = -1.2;
    $("#block-container").append("<canvas class='block' id='" + new_block_id + "'></canvas>");
    var canvas = $("#" + new_block_id)[0],
        ctx = canvas.getContext("2d"),
        width = canvas.width,
        height = canvas.height,
        plot = function plot(fn, range) {
            var widthScale = (width / (range[1] - range[0])),
                heightScale = (height / (range[3] - range[2])),
                first = true;
            ctx.beginPath();
            for (var x = 0; x < width; x++) {
                var xFnVal = (x / widthScale) - range[0],
                    yGVal = (fn(xFnVal) - range[2]) * heightScale;
                yGVal = height - yGVal;
                if (first) {
                    ctx.moveTo(x, yGVal);
                    first = false;
                } else {
                    ctx.lineTo(x, yGVal);
                }
            }
            ctx.strokeStyle = "limegreen";
            ctx.lineWidth = 3;
            ctx.stroke();
        };
    plot (function (x) {
        switch(block_type) {
            case "sine":
                return Math.sin(2 * Math.PI * x);
                break;
            case "saw":
                return 2 * (x - 0.5) - 2 * Math.floor(x - 0.5) - 1;
                break;
            case "square":
                return Math.pow(-1, Math.floor(x));
                break;
            case "tri":
                return Math.abs((x++ % 2) - 1);
                break;
            case "pulse":
                return (0.4 < x && x < 0.6) ? 1: 0;
                break;
            case "func":
                return calc.eval(x);
                break;
            default:
                return 0;
        }
    }, [0, 4, ymin, ymax]);
}
