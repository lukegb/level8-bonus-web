var $ = require('jquery'),
	jadeify = require('jadeify');

var closeRow = function(eD) {
	return eD.removeClass("open").find("td div").slideUp("fast", function() {
		$(this).parent().parent().addClass("hidden");
	});
};

var openRow = function(eD) {
	eD.removeClass("hidden").addClass("open").find("td div").slideDown("fast");
};

var setupPlateTectonics = function() {
	$(".extraData").addClass("hidden").removeClass("js-hidden").find("td div").hide();
	$(".resultsRow").click(function() {
		var $this = $(this);
		var eD = $this.next(".extraData");
		if (eD.hasClass("hidden")) {
			// unhide
			document.location.hash = $this.attr("data-participant");
			$(".open").each(function(k, v) {
				closeRow($(v));
			});
			openRow(eD);
		} else {
			document.location.hash = "_";
			closeRow(eD);
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
	}

	var amRoundPage = ($(".roundHeader").length > 0);
	var thisRoundId = "";
	if (amRoundPage) {
		thisRoundId = $(".roundHeader").attr("data-round-id");
	}
	var sse = new EventSource(document.location.pathname + "/sse");
	sse.addEventListener('message', function(e) {
		if (e.origin !== document.location.origin)
			return console.log("Origin mismatch:", e.origin, document.location.origin);
		var d = JSON.parse(e.data);

		if (d.event == 'update_participants' && amRoundPage && d.id == thisRoundId) {
			if (!$("#roundTable").length) return (document.location = document.location);
			var $q = jadeify('includes/round_table.jade', {participants: d.new});
			var $rT = $("#roundTable");
			$rT.empty();
			$q.appendTo($rT);
			setupPlateTectonics();
			// done :)
		} else if (d.event == 'new_status' && amRoundPage && d.id == thisRoundId) {
			// reload the page :P
			document.location = document.location;
		} else if (d.event == 'new_round') {
			// reload the page :P
			document.location = document.location;
		}
	});
});