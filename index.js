var express = require("express");
var SSE = require("sse-emitter");
const bodyParser = require("body-parser");
var r = require("rethinkdbdash")();

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

// create helper middleware so we can reuse server-sent events
const useServerSentEventsMiddleware = (req, res, next) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  // only if you want anyone to access this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const sendEventStreamData = (event, data) => {
    const sseFormattedResponse = `'event: ${event}\ndata: ${JSON.stringify(
      data
    )}\n\n`;
    res.write(sseFormattedResponse);
  };

  // we are attaching sendEventStreamData to res, so we can use it later
  Object.assign(res, {
    sendEventStreamData,
  });

  next();
};

const streamRandomNumbers = (req, res) => {
  // We are sending anyone who connects to /stream-random-numbers
  // a random number that's encapsulated in an object
  let interval = setInterval(function generateAndSendRandomNumber() {
    const data = {
      value: Math.random(),
    };

    res.sendEventStreamData(data);
  }, 1000);

  // close
  res.on("close", () => {
    clearInterval(interval);
    res.end();
  });
};
const sendEvent = function (error, result) {
  if (error) throw error;
};
const streamErrors = (req, res) => {
  r.table("errors")
    .changes()
    .run()
    .then(function (result) {
      result.each(function (err, row) {
        if (err) throw err;

        //console.log(data);
        res.sendEventStreamData("update", row);
        res.on("close", () => {
          res.end();
        });
      });
    });
};
app.get(
  "/stream-random-numbers",
  useServerSentEventsMiddleware,
  streamRandomNumbers
);

app.get("/errors", useServerSentEventsMiddleware, streamErrors);

app.get("/channel/:id", sse.bind());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/pubilc/index.html"));
});

app.post("/trigger-sse", (req, res) => {
  //webhookEmitter.emit("onhook", req.body);
  r.table("errors")
    .insert(req.body)
    .run()
    .then((result) => {
      res.json({ success: true, message: result });
    });
});

app.listen(5000);

webhookEmitter.on("onhook", function (data) {
  sse.emit("/channel/1", data);
});
