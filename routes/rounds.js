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
    if (req.get('Content-Type') == 'application/json') {
      // just for you :)
      res.send(200, round);
    } else {
      res.render('round_view', {
        round: round,
        minCapturer: round.participants[0]
      });
    }
  });
};

exports.add = function(req, res) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  var storeObj = req.body;
  storeObj.started = new Date();
  // done :P
  db.rounds.insert(storeObj, {safe: true}, function(err, resu) {
    if (err) {
      res.send(500, {error: err});
    }
    res.set('Location', '/' + resu['_id']).send(201);
  });
};

exports.update = function(req, res) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  var storeObj = req.body;
  db.rounds.update({_id: new mongo.ObjectId(req.params.round_id)}, {"$set": storeObj}, {safe:true}, function(err, resu) {
    if (err) {
      res.send(500, {error: err});
    }
    if (!resu) {
      res.send(404);
    }
    res.send(204);
  });
};

exports.overwrite = function(req, res) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  var storeObj = req.body;
  storeObj['_id'] = new mongo.ObjectId(req.params.round_id);
  db.rounds.update({_id: new mongo.ObjectId(req.params.round_id)}, storeObj, {safe:true, upsert:true}, function(err, resu) {
    if (err) {
      res.send(500, {error: err});
    }
    if (!resu) {
      res.send(404);
    }
    res.send(204);
  });
};

exports.db = db; // err...