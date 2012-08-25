
/*
 * GET 
 */
var mongo = require('mongojs');

var db = mongo.connect(process.env.MONGO_URI.replace('mongodb://', ''), ['rounds']);

var fetch_by_id = function(id, callback) {
  // check valid object ID
  var roundObjectId;
  try {
    roundObjectId = mongo.ObjectId(id);
  } catch (Exception) {
    return callback(false);
  }
  db.rounds.findOne({_id: roundObjectId}, function(err, res) {
    if (err || !res) {
      if (err) console.log("Err in fetching MongoDB data:", err);
      return callback(false);
    }
    return callback(res);
  });
};

var fetch_or_404 = function(id, res, callback) {
  fetch_by_id(id, function(round) {
    if (!round) {
      res.send(404);
      return;
    }
    callback(round);
  });
};

exports.view = function(req, res){
  // fetch from DB or 404
  fetch_or_404(req.params.round_id, res, function(round) {
    
    res.render('round_view', {
      round: round,
      minCapturer: round.participants[0]
    });
  });
};

exports.db = db; // err...