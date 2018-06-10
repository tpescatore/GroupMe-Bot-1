var groupme = require("groupme");
var fs = require("fs");
var util = require("./util");

var config = JSON.parse(fs.readFileSync("config.json")); 

var wolfram = require("wolfram-alpha").createClient(config.WA_key);

var reactions = {};

function init_reactions() {
	var obj;
	var data = fs.readFileSync("data.json", {flag: "a+"});

	// Load data.json, using empty object if it's empty
	if (data.length == 0) {
		obj = {};
	}
	else {
		try {
			obj = JSON.parse(data);
		}
		catch (e) {
			console.log("Error parsing data.json");
			return;
		}
	}

	for (var i in reactions) {
		if (reactions[i].init) {
			reactions[i].init(obj);
		}
	}
}

reactions.dadjoke = {
	// Check for any occurrence of "I'm ____"
	re1: /(?:^|\s)(?:i[‘’`']?m|i am)\s+(\w+)(?:\W)?/i, // Match a single word
	re: /(?:^|\s)(?:i[‘’`']?m|i am) +([^.,?!:;\n]+?)\s*(?:\.|,|\?|!|:|;|\n|$)/i, // Match an entire phrase
	match: null,
	prob: 0.2,
	init: function(data) {
		if (data.dadness) {
			this.prob = data.dadness;
		}
	},
	check: function(msg) {
		this.match = this.re.exec(msg.text);
		return this.match && Math.random() < this.prob;
	},
	reply: function(msg) {
		var name = this.match[1];
		// Specific message for a specific user
		if (msg.user_id == "23766274") {
			var joke = "Hi " + name + ", I'm da\uD83C\uDD71\uFE0F!";
		}
		else {
			var joke = "Hi " + name + ", I'm dad!";
		}
		groupme.Stateless.Bots.post("", msg.bot_id, joke, {}, function(err, res) {
			if (err) {
				console.log(err.statusCode, err.statusMessage);
			}
		});
	}
}

reactions.dadness = {
	re: /!dadness\s*(.*)?/i,
	match: null,
	check: function(msg) {
		this.match = this.re.exec(msg.text);
		return this.match;
	},
	reply: function(msg) {
		var response;
		var val = this.match[1] && parseFloat(this.match[1]);
		if (val < 0 || val > 1) {
			val = undefined;
		}
		if (val) {
			reactions.dadjoke.prob = val;
			util.store_data("dadness", val);
			response = "Dadness level set to " + 100 * val + "%.";
		}
		else {
			if (this.match[1]) {
				response = "Error: dadness level must be between 0 and 1.";
			}
			else {
				response = "Dadness level: " + 100 * reactions.dadjoke.prob + "%.";
			}
		}
		
		groupme.Stateless.Bots.post("", msg.bot_id, response, {}, function(err, res) {
			if (err) {
				console.log(err.statusCode, err.statusMessage);
			}
		});
	}
}

reactions.factorial = {
	// Check for any occurrence of a number followed by exclamation mark(s)
	re: /((?:\d|,|\.)+)(!+)(?:[^!]|$)/,
	match: null,
	// Find the evaluated factorial in the Wolfram Alpha response
	getResults: function(body) {
		var result = null;
		if (body && body[0] && body[0].subpods && body[0].subpods[0] && body[0].subpods[0].text) {
			var input = /(?:\(|^)([\d.]+)/.exec(body[0].subpods[0].text)[1];
			for (var i = body.length-1; i >= 0; i--) {
				if (body[i].title == "Power of 10 representation" ||
					body[i].title == "Decimal approximation" ||
					body[i].title == "Result") {
					result = body[i].subpods[0].text;
					break;
				}
			}
		}
		if (result == null) {
			if (input == null) {
				return ["that", "a THICC number"];
			}
			else {
				return [input, "a THICC number"];
			}
		}
		return [input, result];
	},
	check: function(msg) {
		this.match = this.re.exec(msg.text);
		return this.match;
	},
	reply: function(msg) {
		var n = this.match[1];
		var facts = this.match[2];

		// Make sure there's actually a number, not just commas and periods
		if (!/[0-9]/.test(n)) {
			return;
		}
		n = n.split(",").join("");

		// If there are multiple decimal points, pick the first one and discard all others
		var dot = n.indexOf(".");
		if (dot > -1) {
			var beforeDot = n.slice(0, dot);
			var afterDot = n.slice(dot, n.length).split(".").join("");
			n = beforeDot + "." + afterDot;
		}
		
		// Format factorial as a Wolfram Alpha input.
		// Multi-factorials (e.g. 5!!) are evaluated as (5*4*3*2*1)! rather than as 5*3*1
		var input_str = "(".repeat(facts.length-1) + n + "!" + ")!".repeat(facts.length-1);

		// Send Wolfram Alpha API request
		var self = this;
		wolfram.queryCb(input_str, function(err, body) { 
			if (err) {
				console.log(err);
			}
			else {
				var result = self.getResults(body);
				console.log(result);
				var msg_str = result[0] + (result[0] == "that" ? "" : facts) + " = " + result[1];
				groupme.Stateless.Bots.post("", msg.bot_id, msg_str, {}, function(err, res) {
					if (err) {
						console.log(err.statusCode, err.statusMessage);
					}
				});
			}
		});
	}
}

init_reactions();
module.exports = reactions;
