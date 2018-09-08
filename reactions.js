var groupme = require("groupme");

var config = require("./config")

var wolfram = require("wolfram-alpha").createClient(config.WA_key);

var google = require("googleapis").google;
var youtube = google.youtube({version: "v3", auth: config.google_key});

var MongoClient = require("mongodb").MongoClient;
var mongo_url = "mongodb://localhost:27017/";
var db_name = "groupme";

var reactions = {};

reactions.dadjoke = {
	// Check for any occurrence of "I'm ____"
	re1: /(?:^|\s)(?:i[‘’`']?m|i am)\s+(\w+)(?:\W)?/i, // Match a single word
	re: /(?:^|\s)(?:i[‘’`']?m|i am) +([^.,?!:;\n]+?)\s*(?:\.|,|\?|!|:|;|\n|$)/i, // Match an entire phrase
	match: null,
	check: function(msg) {
		this.match = this.re.exec(msg.text);
		return this.match;
	},
	reply: function(msg) {
        self = this;
        reactions.dadness.get_from_db(msg, function(err, res) {
            var dadness = (res && res.dadness != undefined) ? res.dadness : 1;
            var rand = Math.random();
            if (rand > dadness) {
                return;
            }
            
            var name = self.match[1];
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
        var val = parseFloat(this.match[1]);
        if (val < 0 || val > 1) {
            val = NaN;
        }
        if (!isNaN(val)) {
            this.store_to_db(msg, val, function(err, res) {
                if (err) {
                    response = "Error setting dadness level.";
                }
                else {
                    response = "Dadness level set to " + 100 * val + "%.";
                }
                groupme.Stateless.Bots.post("", msg.bot_id, response, {}, function(err, res) {
                    if (err) {
                        console.log(err.statusCode, err.statusMessage);
                    }
                });       
            });
        }
        else {
            if (this.match[1]) {
                response = "Error: dadness level must be between 0 and 1.";
                groupme.Stateless.Bots.post("", msg.bot_id, response, {}, function(err, res) {
                    if (err) {
                        console.log(err.statusCode, err.statusMessage);
                    }
                });
            }
            else {
                this.get_from_db(msg, function(err, res) {
                    if (err) {
                        response = "Error getting dadness level.";
                    }
                    else {
                        val = (res && res.dadness != undefined) ? res.dadness : 1;
                        response = "Dadness level: " + 100 * val + "%.";
                    }
                    groupme.Stateless.Bots.post("", msg.bot_id, response, {}, function(err, res) {
                        if (err) {
                            console.log(err.statusCode, err.statusMessage);
                        }
                    });
                });
            }
        }
    },
    store_to_db: function(msg, val, callback) {
        MongoClient.connect(mongo_url, {useNewUrlParser: true}, function(err, db) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                throw err;
            }
            var dbo = db.db(db_name);
            var query = {_id: msg.group_id}
            var new_values = {$set: {_id: msg.group_id, dadness: val}};
            dbo.collection("dadness").updateOne(query, new_values, {upsert: true}, function(err, res) {
                if (callback) {
                    callback(err, res);
                }
                if (err) throw err;
                db.close();
            });
        });
    },
    get_from_db: function(msg, callback) {
        MongoClient.connect(mongo_url, {useNewUrlParser: true}, function(err, db) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                throw err;
            }
            var dbo = db.db(db_name);
            dbo.collection("dadness").findOne({_id: msg.group_id}, function(err, res) {
                if (callback) {
                    callback(err, res);
                }
                if (err) throw err;
                db.close();
            });
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

reactions.alexa = {
    re: /.*alexa.*play\s+(.*)/i,
    match: null,
    check: function(msg) {
        this.match = this.re.exec(msg.text);
        return this.match && this.match[1];
    },
    reply: function(msg) {
        youtube.search.list({
            part: "snippet",
            type: "video",
            regionCode: "US",
            maxResults: 1,
            q: this.match[1]
        }, function(err, res) {
            var title, video_id;
            if (err || res.data.items.length == 0) {
                title = "Luis Fonsi - Despacito ft. Daddy Yankee";
                video_id = "kJQP7kiw5Fk";
            }
            else {
                title = res.data.items[0].snippet.title;
                video_id = res.data.items[0].id.videoId;
            }

            response = "NOW PLAYING: " + title + "\nhttps://youtu.be/" + video_id;

            groupme.Stateless.Bots.post("", msg.bot_id, response, {}, function(err, res) {
                if (err) {
                    console.log(err.statusCode, err.statusMessage);
                }
            });
        });
    }
}

module.exports = reactions;
