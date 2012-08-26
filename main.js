var $ = require('jquery'),
	jadeify = require('jadeify');

var setupPlateTectonics = function() {
	$(".extraData").addClass("hidden").find("td div").hide();
	$(".resultsRow").click(function() {
		var $this = $(this);
		var eD = $this.next(".extraData");
		if (eD.hasClass("hidden")) {
			// unhide
			eD.removeClass("hidden").find("td div").slideDown("fast");
			document.location.hash = $this.attr("data-participant");
		} else {
			document.location.hash = "_";
			eD.find("td div").slideUp("fast", function() {
				$(this).parent().parent().addClass("hidden");
			});
		}
	});

	if (document.location.hash.length > 1) {
		var h = document.location.hash.substring(1);
		$(".participant-" + encodeURIComponent(h)).removeClass("hidden").find("td div").show();
	}
};

$(function() {
	// check that we should run on this page
	if ($("#roundTable").length) {
		setupPlateTectonics();

		// register for SSEs
		var sse = new EventSource(document.location.pathname + "/sse");
		sse.addEventListener('message', function(e) {
			if (e.origin !== document.location.origin)
				return console.log("Origin mismatch:", e.origin, document.location.origin);
			var d = JSON.parse(e.data);

			if (d.event == 'update_participants') {
				var $q = jadeify('includes/round_table.jade', {participants: d.new});
				var $rT = $("#roundTable");
				$rT.empty();
				$q.appendTo($rT);
				setupPlateTectonics();
				// done :)
			} else if (d.event == 'new_status') {
				// reload the page :P
				document.location = document.location;
			}
		});
	}
});