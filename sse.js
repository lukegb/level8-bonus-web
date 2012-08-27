/*** SSE ***/

var clients = {};

var Client = function(req, res) {
	var that = this;

	this.req = req;
	this.res = res;
	this.isAlive = true;
	this.onDisconnect = function() { /* noop */ };

	this.messageCount = 0;

	// set up
	req.socket.setTimeout(Infinity);

	req.on('close', function() {
		that.onDisconnect();
	});

	// write header
	res.writeHead(200, {
		'Content-type': 'text/event-stream',
		'Connection': 'keep-alive',
		'Cache-Control': 'no-cache'
	});
	res.write('\n');
};

Client.prototype.publishString = function(m) {
	var nm = m.replace("\n", "\ndata: ");

	this.res.write("delay: 1000\n");
	this.res.write("id: " + (this.messageCount++) + "\n");
	this.res.write("data: " + nm + "\n\n");
	this.res.end(); // need to end on heroku

	console.log(" -- Done sending message to client");
	// done
};

Client.prototype.publish = function(message) {
	this.publishString(JSON.stringify(message));
};

exports.publish = function(key, message, callback) {
	console.log("Publishing message to", key, " - ", message);
	var k = key.toString();
	var scope = {messagesSent: 0};
	if (!clients[key])
		if (callback)
			return callback(0);
		else
			return;
	clients[key].forEach(function(client) {
		client.publish(message);
		scope.messagesSent++;
	}, scope);
	if (callback)
		callback(scope.messagesSent);
};

exports.register = function(key, req, res) {
	var k = key.toString();
	var client = new Client(req, res);
	client.onDisconnect = (function(nk) {
		return function() {
			var c = clients[nk];
			for (var i in c) {
				if (c[i] == client) {
					c.splice(i, 1);
					break;
				}
			}
		};
	})(k);
	if (!clients[k])
		clients[k] = [];
	clients[k].push(client);
};