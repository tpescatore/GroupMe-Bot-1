# GroupMe Bot

This is a bot for GroupMe which performs several functions:
- Dad jokes: Responds "Hi ___, I'm dad!" whenever a user sends a message in the format "I'm ____".
  - This was getting annoying, so the chance of the bot sending this response can be adjusted with the command "!dadness <number between 0 and 1>".
- Factorials: Responds with the evaluated factorial (using the Wolfram Alpha API) whenever a user sends a message containing a number followed by one or more exclamation marks.
- Alexa: Responds with a link to the requested YouTube video (using the YouTube API) whenever a user sends a message in the format "Alexa, play ___".
- More to come...

# Running the Bot

GroupMe bots work by defining a callback URL, which GroupMe POSTs data to each time a message is sent in the group. So, this bot should be hosted on a server associated with a domain name or a static IP address. Once you have the server set up, follow these steps:
1. Install dependencies
   * Node.js v4 or higher
   * NPM
   * MongoDB
2. Install Node.js dependencies
   * Enter `npm install` in the bot's main directory.
3. Configuration
   * Copy `config.js.example` to `config.js`.
   * Enter your API keys and other info.
4. Run bot
   * Enter `node index.js` to start the bot.
   * You can use PM2 to start the bot on reboots and keep it running.
5. Nginx reverse proxy (optional)
   * If you don't want to open the port the bot is running on, you can use Nginx to proxy it to port 80.
   * [This guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04) explains the process well.

# Usage

To add the bot to your own group chat, follow these steps:
1. Go to the [GroupMe bot dashboard](https://dev.groupme.com/bots) and click *Create Bot*.
2. Enter the group and the bot name, and click *Submit*.
3. Copy the Bot ID of the newly created bot.
4. Click *Edit* on the bot and enter the callback url in the following format: `<your server domain name or IP>?bot_id=<your Bot ID>`
5. Click *Submit* and the bot should now be working.
