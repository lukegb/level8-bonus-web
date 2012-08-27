/*** SSE ***/

var clients = [];

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
		that.onDisconnect(that);
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

	this.res.write("delay: 200\n");
	this.res.write("id: " + (this.messageCount++) + "\n");
	this.res.write("data: " + nm + "\n\n");
	this.res.end();

	console.log(" -- Done sending message to client");
	// done
};

Client.prototype.publish = function(message) {
	this.publishString(JSON.stringify(message));
};

exports.publish = function(key, message, callback) {
	console.log("Publishing message to", key, " - ", message);
	var k = key.toString();
	message.id = k;
	var scope = {messagesSent: 0};
	if (!clients)
		if (callback)
			return callback(0);
		else
			return;
	clients.forEach(function(client) {
		client.publish(message);
		scope.messagesSent++;
	}, scope);
	if (callback)
		callback(scope.messagesSent);
};

exports.register = function(key, req, res) {
	// we ignore the key now
	var client = new Client(req, res);
	client.onDisconnect = function(me) {
		for (var i in clients) {
			if (clients[i] == me) {
				clients.splice(i, 1);
				break;
			}
		}
	};
	if (!clients)
		clients = [];
	clients.push(client);
};