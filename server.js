// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const {getHash} = require('./signature-verification')
var http = require('http').Server(app)
var io = require('socket.io')(http)

http.listen(process.env.PORT, function(){
  console.log('listening on:', process.env.PORT);
});

io.on('connection', function(socket){
  console.log('user connected');
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

const options = {
  type: 'application/json'
}
app.use(bodyParser.raw(options));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Listen for incoming webhooks.
app.post("/webhooks", upload.array(), function (request, response, next) {

  const headers = request.headers
  const wistiaSignature = headers['x-wistia-signature']
  console.log("wistia signature: ", wistiaSignature)
  
  const requestBody = request.body
  const computedHash = getHash(requestBody)
  console.log("The computed hash is: ", computedHash)
  
  
  // Verify that the webhooks are legit, using the secret key
  if (wistiaSignature === computedHash) {
    console.log("Signature looks good!")
    
    const events = JSON.parse(requestBody).events
    // There can be multiple events. They're always in an array even if there's only one.
    // https://wistia.com/doc/webhooks#request_body
    for (var i = 0, numberOfEvents = events.length; i < numberOfEvents; i++) {
      const payload = events[i].payload
      console.log(payload)
      // send this event payload to the client side with socket.io
      io.emit('event', payload)
    }

    // Be sure to send a 200 OK response, to let Wistia know that all is well. 
    // Otherwise, Wistia will continue sending webhooks your way a few unnecessary times
    response.sendStatus(200) 
    
  } else {
    console.log("Signature doesn't match. Ruh-roh.")
  }
});