
/*
 * GET home page.
 */

exports.rounds = require('./rounds.js');
exports.pages = require('./pages.js');

var AT_A_TIME = 35;

exports.index = function(req, res){
  // we need all the rounds
  var c = exports.rounds.db.rounds.find().sort({added: -1});
  exports.rounds.db.rounds.count(function(err, totalCount) {
    var maxPage = Math.ceil(totalCount / AT_A_TIME);
    var page = parseInt(req.query['page'] || "1", 10);
    if (page <= 0 || (totalCount === 0 && page != 1))
      return res.redirect('/');
    else if (page > maxPage && totalCount !== 0)
      return res.redirect('/?page=' + maxPage);

    c = c.limit(AT_A_TIME).skip((page - 1) * AT_A_TIME);

    c.toArray(function(err, resu) {
      var hasNext = true, hasPrev = true;
      if (page == 1) hasPrev = false;
      if (page == maxPage) hasPrev = false;

      for (var i in resu) {
        var round = resu[i];
        round.minCapturer = null;
        for (var p in round.participants) {
          var par = round.participants[p];
          if (!round.minCapturer || par.time < round.minCapturer.time)
            round.minCapturer = par;
        }
      }
      res.render('index', {
        title: 'Lvl8 Scoreboard',
        totalRounds: totalCount,
        pageRounds: resu,
        maxPage: maxPage,
        hasPrev: hasPrev,
        hasNext: hasNext
      });
    });
  });
};