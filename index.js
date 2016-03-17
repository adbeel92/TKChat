/* 
  Module dependencies:

  - Express
  - Http (to run Express)
  - Body parser (to parse JSON requests)
  - Underscore (because it's cool)
  - Socket.IO(Note: we need a web server to attach Socket.IO to)

  It is a common practice to name the variables after the module name.
  Ex: http is the "http" module, express is the "express" module, etc.
  The only exception is Underscore, where we use, conveniently, an 
  underscore. Oh, and "socket.io" is simply called io. Seriously, the 
  rest should be named after its module name.

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

// app.use(express.static("public", __dirname + "/public"));
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());


/* Handle routes */

//GET method to show the main view
app.get('/', function(request, response) {
  response.render("index");
  // response.status(200).json({message: "express is cool"});
});

//POST method to create a chat message
app.post("/message", function(request, response) {

  //The request body expects a param named "message"
  var message = request.body.message;

  //If the message is empty or wasn't sent it's a bad request
  if(_.isUndefined(message) || _.isEmpty(message.trim())) {
    return response.status(400).json({ error: "Message is invalid" });
  }

  //We also expect the sender's name with the message
  var name = request.body.name;

  //Let our chatroom know there was a new message
  io.sockets.emit("incomingMessage", { message: message, name: name });

  //Looks good, let the client know
  response.status(200).json({ message: "Message received" });

});


/* Socket.IO events */

io.on("connection", function(socket){

  /*
    When a new user connects to our server, we expect an event called "newUser"
    and then we'll emit an event called "newConnection" with a list of all 
    participants to all connected clients
  */
  socket.on("newUser", function(data) {
    participants.push({id: data.id, name: data.name});
    io.sockets.emit("newConnection", {participants: participants});
  });

  /*
    When a user changes his name, we are expecting an event called "nameChange" 
    and then we'll emit an event called "nameChanged" to all participants with
    the id and new name of the user who emitted the original message
  */
  socket.on("nameChange", function(data) {
    try {
      _.findWhere(participants, {id: socket.client.id}).name = data.name;
      io.sockets.emit("nameChanged", {id: data.id, name: data.name});
    } catch (error) {
      console.log("Error while name was changing");
    }
  });

  /* 
    When a client disconnects from the server, the event "disconnect" is automatically 
    captured by the server. It will then emit an event called "userDisconnected" to 
    all participants with the id of the client that disconnected
  */
  socket.on("disconnect", function() {
    participants = _.without(participants,_.findWhere(participants, { id: socket.client.id }));
    io.sockets.emit("userDisconnected", { id: socket.client.id, sender: "system" });
  });

});


http.listen(app.get("port"), function() {
  console.log("Server up and running. Go to http://HOST:" + app.get("port"));
});
