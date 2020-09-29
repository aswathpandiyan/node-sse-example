var express = require("express");
var SSE = require("sse-emitter");
const bodyParser = require("body-parser");

const EventEmitter = require("events");
class MyEmitter extends EventEmitter {}
const webhookEmitter = new MyEmitter();

var path = require("path");
var sse = new SSE({
  keepAlive: 30000, // in ms, defaults to 10000
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/channel/:id", sse.bind());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/pubilc/index.html"));
});
app.post("/trigger-sse", (req, res) => {
  webhookEmitter.emit("onhook", req.body);
  res.json({ success: true });
});

app.listen(5000);

webhookEmitter.on("onhook", function (data) {
  sse.emit("/channel/1", data);
});
