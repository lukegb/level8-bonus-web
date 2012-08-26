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
    var use = req.accepts('html, json');
    if (use == "json") {
      // just for you :)
      res.send(200, round);
    } else {
      // state should be one of:
      // completed, started or waiting
      res.render('round_view_' + round.status, {
        round: round,
        minCapturer: round.participants[0]
      });
    }
  });
};

exports.goToRunning = function(req, res) {
  // find a running event
  db.rounds.find({$or: [{status: "running"}, {status: "waiting"}]}).sort({added: -1}).toArray(function(err, resu) {
    if (err || !resu) {
      console.log(err);
      return res.send(500);
    } else if (!resu.length || resu.length === 0) {
      return res.redirect('/');
    }
    res.redirect('/' + resu[0]._id);
  });
};

exports.add = function(req, res) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  var storeObj = req.body;
  storeObj.added = new Date();
  if (storeObj.status == "started" || storeObj.status == "completed")
    storeObj.started = new Date();
  if (storeObj.status == "completed")
    storeObj.completed = new Date();

  // done :P
  db.rounds.insert(storeObj, {safe: true}, function(err, resu) {
    if (err) {
      res.send(500, {error: err});
    }
    res.set('Location', '/' + resu[0]['_id']).send(201);
  });
};

exports.update = function(req, res, sse) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  // fetch current data
  fetch_or_404(req.params.round_id, res, function(round) {

    var storeObj = req.body;
    var updatedStatus = false;
    if (round.status !== storeObj.status) {
      if (storeObj.status == "started" || storeObj.status == "completed")
        storeObj.started = new Date();
      if (storeObj.status == "completed")
        storeObj.completed = new Date();
      updatedStatus = true;
    }

    db.rounds.update({_id: new mongo.ObjectId(req.params.round_id)}, {"$set": storeObj}, {safe:true}, function(err, resu) {
      if (err) {
        res.send(500, {error: err});
      }
      if (!resu) {
        res.send(404);
      }
      console.log(resu);
      console.log(resu[0]);
      console.log(resu[0]._id);
      var resum = resu[0];
      if (updatedStatus)
        sse.publish(resum._id, {"event":"new_status"}); // this triggers a refresh anyway
      else
        sse.publish(resum._id, {"event":"update_participants", "new": resu.participants});
      res.send(204);
    });
    
  });
};

exports.overwrite = function(req, res, sse) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  var storeObj = req.body;
  storeObj['_id'] = new mongo.ObjectId(req.params.round_id);
  storeObj.added = new Date();
  if (storeObj.status == "started" || storeObj.status == "completed")
    storeObj.started = new Date();
  if (storeObj.status == "completed")
    storeObj.completed = new Date();

  db.rounds.update({_id: new mongo.ObjectId(req.params.round_id)}, storeObj, {safe:true, upsert:true}, function(err, resu) {
    if (err) {
      res.send(500, {error: err});
    }
    if (!resu) {
      res.send(404);
    }
    var resum = resu[0];
    sse.publish(resum._id, {"event":"update_participants", "new": resum.participants});
    res.send(204);
  });
};

exports.register_sse = function(req, res, sse) {
  fetch_or_404(req.params.round_id, res, function(round) {
    return sse.register(round._id, req, res);
  });
};

exports.trigger_update = function(req, res, sse) {
  // fetch from DB or 404
  fetch_or_404(req.params.round_id, res, function(round) {
    // okay, cool
    if (req.param('event') == 'update_participants')
      sse.publish(round._id, {"event": "update_participants", "new": round.participants}, function(num) {
        res.send(200, 'sent to ' + num);
      });
    else
      sse.publish(round._id, {"event": "new_status"}, function(num) {
        res.send(200, 'sent to ' + num);
      });
  });
};

exports.db = db; // err...