/* eslint-disable @typescript-eslint/no-var-requires */
const express = require("express");
const webSocket = require("ws");
const https = require("https");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const server = https.createServer(
  {
    key: fs.readFileSync("localhost+2-key.pem"),
    cert: fs.readFileSync("localhost+2.pem"),
  },
  app
);

const wss = new webSocket.WebSocketServer({ server });

const clients = {};

wss.on("connection", ws => {
  console.log("Client connected ");

  ws.on("message", message => {
    let data;
    try {
      data = JSON.parse(message);

      const { type, name, offer, answer, candidate, target } = data;

      if (type === "register") {
        if (clients[name]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `${name} already exists`,
            })
          );
        } else {
          clients[name] = ws; // Register client
          ws.name = name; // Attach name to WebSocket obj
          ws.send(
            JSON.stringify({
              type: "register",
              success: true,
              message: `${name} registered`,
            })
          );
          console.log(`Registered client ${name}`);
        }
      } else {
        if (!clients[target]) {
          console.log(`Target client ${target} not found. `);

          clients[name].send(
            JSON.stringify({
              type: "error",
              message: `Target client ${target} not found`,
            })
          );
        } else {
          if (type === "offer") {
            if (clients[target]) {
              clients[target].send(JSON.stringify({ type, offer, name }));
              console.log(`Offer from ${name} sent to ${target}`);
            }
          } else if (type === "answer") {
            if (clients[target]) {
              clients[target].send(JSON.stringify({ type, answer, name }));
              console.log(`Answer from ${name} sent to ${target}`);
            }
          } else if (type === "candidate") {
            if (clients[target]) {
              clients[target].send(JSON.stringify({ type, candidate, name }));
              console.log(`Candidate from ${name} sent to ${target}`);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  ws.on("close", () => {
    console.log(`Client ${ws.name} disconnected`);
    delete clients[ws.name]; // Remove client from the list
  });
});

server.listen(PORT, () => {
  console.log(`Server listening at ${PORT}`);
});
