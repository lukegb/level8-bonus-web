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

	var debugMode = (document.cookie.indexOf("debug=true") !== -1);


	var sse = new EventSource("/sse");
	sse.addEventListener('message', function(e) {
		if (e.origin !== document.location.origin)
			return (debugMode && console.log("Origin mismatch:", e.origin, document.location.origin));
		var d = JSON.parse(e.data);

		if (debugMode && console.log) console.log(d, d.id, amRoundPage, thisRoundId);

		if (d.event == 'update_participants' && amRoundPage && d.id == thisRoundId) {
			if (!$("#roundTable").length) { // this is most likely the waiting page
				if (d.status === "waiting" && d.participants.length === $("ol li").length)
					return; // well, there's no point refreshing - they're probably still on the same page
				return document.location.reload(true);
			}
			var $q = jadeify('includes/round_table.jade', {participants: d.new});
			var $rT = $("#roundTable");
			$rT.empty();
			$q.appendTo($rT);
			setupPlateTectonics();
			// done :)
		} else if (d.event == 'new_status') {
			// reload the page :P
			// we need to reload the page to update the sidebar.
			if (debugMode && console.log) console.log("new_status: reload");
			document.location.reload(true);
		} else if (d.event == 'new_round') {
			// reload the page :P
			if (debugMode && console.log) console.log("new_round: reload");
			document.location.reload(true);
		}
	});
});