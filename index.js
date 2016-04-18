/* 
  Module dependencies:

  - Express
  - Http (to run Express)
  - Body parser (to parse JSON requests)
  - Underscore (because it's cool)
  - Socket.IO(Note: we need a web server to attach Socket.IO to)

*/

var express = require("express")
  , app = express()
  , http = require("http").createServer(app)
  , bodyParser = require("body-parser")
  , io = require("socket.io").listen(http)
  , _ = require("underscore");

/* 
  The list of participants in our chatroom.
  The format of each participant will be:
  {
    id: "sessionId",
    name: "participantName"
  }
*/
var participants = [];

app.set("host", (process.env.HOST || "127.0.0.1"));

app.set('port', (process.env.PORT || 5000));

app.set('views', __dirname + '/views');

app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());


/* Handle routes */

//GET method to show the main view
app.get('/', function(request, response) {
  response.render("index");
});

//POST method to create a chat message
app.post("/message", function(request, response) {

  var message = request.body.message;

  if(_.isUndefined(message) || _.isEmpty(message.trim())) {
    return response.status(400).json({ error: "Message is invalid" });
  }

  var name = request.body.name;

  io.sockets.emit("incomingMessage", { message: message, name: name });

  response.status(200).json({ message: "Message received" });

});


/* Socket.IO events */

io.on("connection", function(socket){

  socket.on("newUser", function(data) {
    console.log("EVENT: newUser");
    participants.push({id: data.id, name: data.name});
    io.sockets.emit("newConnection", {participants: participants});
  });

  socket.on("nameChange", function(data) {
    console.log("EVENT: nameChange");
    try {
      _.findWhere(participants, {id: socket.client.id}).name = data.name;
      io.sockets.emit("nameChanged", {id: data.id, name: data.name});
    } catch (error) {
      console.log("Error while name was changing");
    }
  });

  socket.on("disconnect", function() {
    console.log("EVENT: disconnect");
    participants = _.without(participants,_.findWhere(participants, { id: socket.client.id }));
    io.sockets.emit("userDisconnected", { id: socket.client.id, sender: "system" });
  });

});


http.listen(app.get("port"), function() {
  console.log("Server up and running. Go to " + app.get("host") + ":" + app.get("port"));
});
