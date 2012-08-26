
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path');

var app = express();


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('secret', process.env.API_SECRET || 'hi');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(function(req, res, next) {
    // date formatter:

    app.locals.dateFormatter = function(roundDate) {
      return roundDate.getUTCDate() + "/" + roundDate.getUTCMonth() + "/" + roundDate.getUTCFullYear() + " " + roundDate.getUTCHours() + ":" + roundDate.getUTCMinutes();
    };

    // load up the list of top-20 races
    var db = routes.rounds.db; // seriously? D:
    var c = db.rounds.find().sort({started: -1}).limit(20);
    c.toArray(function(err, res) {
      if (!err) {
        app.locals.rounds = res;
      } else {
        console.log(err);
      }
      next();
    });
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// -- Index
app.get('/', routes.index);

// -- Rounds
//     -- Make new
app.post('/', routes.rounds.add);

//     -- Fetch
app.get('/:round_id', routes.rounds.view);
//     -- Update existing
app.put('/:round_id', routes.rounds.update);
//     -- Replace existing
app.post('/:round_id', routes.rounds.overwrite);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
