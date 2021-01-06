$(document).ready(function () {
    // Initialize tabs
    $("#main-tabs").tabs();
});

var code_mirror = CodeMirror(document.getElementById("code-editor"), {
  value: "x = 2\n",
  mode:  "python"
});
