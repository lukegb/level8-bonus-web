
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    sse = require('./sse.js'),
    browserify = require('browserify'),
    jadeify = require('jadeify');

var app = express();

app.configure(function(){
  var bundle = browserify()
    .use(jadeify(__dirname + '/views'))
    .addEntry(__dirname + '/main.js');

  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('secret', process.env.API_SECRET || 'hi');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(bundle);
  app.use(function(req, res, next) {
    // date formatter:

    app.locals.dateFormatter = function(roundDate) {
      var paddedHours = roundDate.getUTCHours().toString();
      if (paddedHours.length < 2)
        paddedHours = "0" + paddedHours;
      var paddedMinutes = roundDate.getUTCMinutes().toString();
      if (paddedMinutes.length < 2)
        paddedMinutes = "0" + paddedMinutes;

      return roundDate.getUTCDate() + "/" + roundDate.getUTCMonth() + "/" + roundDate.getUTCFullYear() + " " + paddedHours + ":" + paddedMinutes;
    };

    // load up the list of top-5 races
    var db = routes.rounds.db; // seriously? D:
    var c = db.rounds.find().sort({added: -1}).limit(5);
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

// -- Rules
app.get('/rules', routes.pages.rules);
// -- About
app.get('/about', routes.pages.about);

// -- Admin
app.get('/admin/force_recalcs', routes.rounds.force_recalculations);

// -- Rounds
//     -- Make new
app.post('/', routes.rounds.add);
//     -- Go to running
app.get('/running', routes.rounds.go_to('running'));
//     -- Go to latest
app.get('/latest', routes.rounds.go_to('latest'));
//     -- Fetch
app.get('/:round_id', routes.rounds.view);
//     -- Update existing
app.put('/:round_id', function(req,res) { return routes.rounds.update(req, res, sse); });
//     -- Replace existing
app.post('/:round_id', function(req,res) { return routes.rounds.overwrite(req, res, sse); });
//     -- SSE
app.get('/:round_id/sse', function(req, res) {
  return routes.rounds.register_sse(req, res, sse);
});
//     -- Testing: FORCE sse
app.get('/:round_id/forcesse', function(req, res) {
  routes.rounds.trigger_update(req, res, sse);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
