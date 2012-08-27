

var staticPage = function(jadefile, title) {
  return (function(jf, t) {
    return function(req, res) {
      res.render(jf, {page: jf, title: 'Lvl8 Scoreboard: ' + t});
    };
  })(jadefile, title);
};

exports.rules = staticPage('rules', 'Rules of the Game');
exports.about = staticPage('about', 'About Us, and About this Game');