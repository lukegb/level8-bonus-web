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
			window.location.hash = "_";
			eD.find("td div").slideUp("fast", function() {
				$(this).parent().parent().addClass("hidden");
			});
		}
	});

	if (window.location.hash.length > 1) {
		var h = window.location.hash.substring(1);
		$(".participant-" + encodeURIComponent(h)).removeClass("hidden").find("td div").show();
		console.log(h);
	}
});