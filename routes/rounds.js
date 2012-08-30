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
  var requestFormat = "html";
  if (req.params.round_id.indexOf('.') !== -1) {
    var dotPos = req.params.round_id.indexOf('.');
    requestFormat = req.params.round_id.substring(dotPos + 1);
    req.params.round_id = req.params.round_id.substring(0, dotPos);
  }
  fetch_or_404(req.params.round_id, res, function(round) {
    var use = req.accepts('html, json');
    if (use == "json" || requestFormat == "json") {
      // just for you :)
      if (round.status !== "completed")
        delete round.flag; // ehe, no.
      res.send(200, round);
    } else {
      // state should be one of:
      // completed, started or waiting
      res.render('round_view_' + round.status, {
        page: 'rounds',
        round: round,
        minCapturer: round.participants[0]
      });
    }
  });
};

exports.go_to = function(where) {
  var what_thing = {};
  if (where == 'running') {
    what_thing = {$or: [{status: "running"}, {status: "waiting"}]};
  }
  return (function(search_obj) {
    return function(req, res) {
      // find a running event
      db.rounds.find(search_obj).sort({added: -1}).toArray(function(err, resu) {
        if (err || !resu) {
          console.log(err);
          return res.send(500);
        } else if (!resu.length || resu.length === 0) {
          return res.redirect('/');
        }
        res.redirect('/' + resu[0]._id);
      });
    };
  })(what_thing);
};

exports.add = function(req, res, sse) {
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

  // set all current to done
  db.rounds.update({}, {"$set": {status: "completed"}}, {safe:true, multi:true}, function() {
    // done :P
    db.rounds.insert(storeObj, {safe: true}, function(err, resu) {
      if (err) {
        res.send(500, {error: err});
      }
      res.set('Location', '/' + resu[0]['_id']).send(201);
      sse.publish("global", {"event": "new_round"});
    });
  });
};

var inferTimings = function(storeObj) {

  var chunkCount = storeObj.chunks || 4;
  storeObj.chunks = chunkCount;

  // infer times for each participant
  for (var p_id in storeObj.participants) {
    var participant = storeObj.participants[p_id];
    if (participant.chunkTimes.length != chunkCount)
      continue; // no time
    var totalTime = 0;
    for (var i in participant.chunkTimes) {
      totalTime += participant.chunkTimes[i];
    }
    storeObj.participants[p_id].time = totalTime;
  }

  return storeObj;

};

exports.update = function(req, res, sse) {
  // verify secret
  if (!req.get('x-secret') || req.get('x-secret') != req.app.get('secret')) {
    return res.send(403);
  }

  // fetch current data
  fetch_or_404(req.params.round_id, res, function(round) {

    var storeObj = req.body;
    var storeObjId = new mongo.ObjectId(req.params.round_id);
    var updatedStatus = false;
    if (round.status !== storeObj.status) {
      if (storeObj.status == "started" || storeObj.status == "completed") {
        storeObj.started = new Date();
      }
      if (storeObj.status == "completed") {
        storeObj.completed = new Date();
      }
      updatedStatus = true;
    }

    if (storeObj.participants.length === 0) { // delete empty rounds
      db.rounds.remove({_id: storeObjId});
      return res.send(204);
    }

    storeObj = inferTimings(storeObj);

    db.rounds.update({_id: storeObjId}, {"$set": storeObj}, {safe:true}, function(err, num_updated) {
      if (err) {
        res.send(500, {error: err});
      }
      if (num_updated === 0) {
        res.send(404);
      }
      if (updatedStatus)
        sse.publish(req.params.round_id, {"event":"new_status"}); // this triggers a refresh anyway
      else
        sse.publish(req.params.round_id, {"event":"update_participants", "new": storeObj.participants});
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
  if (storeObj.status == "started" || storeObj.status == "completed") {
    storeObj.started = new Date();
  }
  if (storeObj.status == "completed") {
    storeObj.completed = new Date();
  }

  // infer times for each participant
  storeObj = inferTimings(storeObj);

  if (storeObj.participants.length === 0) { // delete empty rounds
    db.rounds.remove({_id: storeObjId});
    return res.send(204);
  }

  db.rounds.update({_id: new mongo.ObjectId(req.params.round_id)}, storeObj, {safe:true, upsert:true}, function(err, num_updated) {
    if (err) {
      res.send(500, {error: err});
    }
    if (num_updated === 0) {
      res.send(404);
    }
    sse.publish(req.params.round_id, {"event":"new_status"}); // assume the worst
    res.send(204);
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

exports.force_recalculations = function(req, res) {
  if (!req.param('secret') || req.param('secret') != req.app.get('secret'))
    return res.send(403);

  // grab all of them
  var calculated = 0;
  var updated = 0;
  res.writeHead(200, {
    'Content-type': 'text/plain',
    'Cache-Control': 'no-cache'
  });
  db.rounds.find().forEach(function(err, doc) {
    if (err) {
      res.write("ERR - " + err + "\n");
      return console.log(err);
    }

    if (!doc) return;

    res.write("Working on " + doc._id + ": ");

    // fix flag caps
    doc = inferTimings(doc);

    // now update status
    var t = doc.started ? doc.started.getTime() : 0;
    var tn = new Date().getTime();
    var td = tn - t;
    if (td > 1000 * 60 * 10) { // more than ten minutes
      doc.status = "completed";
    }

    res.write("...updating.\n");

    db.rounds.update({_id: doc._id}, doc, {safe:true}, function(err, upd) {
      res.write("Updating " + doc._id + ": ");
      if (err) {
        res.write("ERR - " + err + "\n");
        return console.log(err);
      }

      res.write("updated " + upd + " document(s).\n");
    });
  });
  setTimeout(function() {
    res.end("...done!");
  }, 10000);
};

exports.db = db; // err...
