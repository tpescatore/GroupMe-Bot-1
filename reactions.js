var groupme = require("groupme");
var fs = require("fs");

var config = JSON.parse(fs.readFileSync("config.json")); 

var wolfram = require("wolfram-alpha").createClient(config.WA_key);

var reactions = {};

Object.defineProperty(reactions, "globals", {
	enumerable: false,
	writable: true
});

function load_globals() {
	var data = fs.readFileSync("data.json", {flag: "a+"});

	// Load data.json, using empty object if it's empty
	try {
		reactions.globals = JSON.parse(data);
	}
	catch (e) {
		reactions.globals = {};
		console.log("Error parsing data.json");
	}
}

function add_global(group, key, value) {
	if (!reactions.globals.hasOwnProperty(group)) {
		reactions.globals[group] = {};
	}
	reactions.globals[group][key] = value;

	fs.writeFile("data.json", JSON.stringify(reactions.globals));
}

reactions.dadjoke = {
	// Check for any occurrence of "I'm ____"
	re1: /(?:^|\s)(?:i[‘’`']?m|i am)\s+(\w+)(?:\W)?/i, // Match a single word
	re: /(?:^|\s)(?:i[‘’`']?m|i am) +([^.,?!:;\n]+?)\s*(?:\.|,|\?|!|:|;|\n|$)/i, // Match an entire phrase
	match: null,
	check: function(msg) {
		var prob = reactions.globals[msg.group_id] && reactions.globals[msg.group_id].dadness;
		prob = prob || 1;
		this.match = this.re.exec(msg.text);
		return this.match && Math.random() < prob;
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
			add_global(msg.group_id, "dadness", val);
			response = "Dadness level set to " + 100 * val + "%.";
		}
		else {
			if (this.match[1]) {
				response = "Error: dadness level must be between 0 and 1.";
			}
			else {
				val = reactions.globals[msg.group_id] && reactions.globals[msg.group_id].dadness;
				val = val || 1;
				response = "Dadness level: " + 100 * val + "%.";
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

load_globals();
module.exports = reactions;
