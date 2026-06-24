
$(document).ready(function () {
    $("#cr56f_1toeslf").attr("placeholder", "in mm");
    $("#cr56f_1toesrf").attr("placeholder", "in mm");
    $("#cr56f_1toeslf").on("change", function() {
        var left = $("#cr56f_1toeslf").val()
        $("#cr56f_1toesrf").val() = left;
        alert($("#cr56f_1toesrf").val());
        alert($(left));
    });
});
