
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {title: 'Lvl8 Scoreboard'});
};

exports.rounds = require('./rounds.js');