$(function() {
	$(".extraData").addClass("hidden").find("td div").hide();
	$(".resultsRow").click(function() {
		var $this = $(this);
		var eD = $this.next(".extraData");
		if (eD.hasClass("hidden")) {
			// unhide
			eD.removeClass("hidden").find("td div").slideDown("fast");
			window.location.hash = $this.attr("data-participant");
		} else {
			window.location.hash = "";
			eD.find("td div").slideUp("fast", function() {
				$(this).parent().parent().addClass("hidden");
			});
		}
	});
});