import { monitor } from "@colyseus/monitor";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import express from "express";

import { MyRoom } from "./rooms/MyRoom";

const port = parseInt(process.env.PORT, 10) || 3001;
const app = express();
app.get("/", (req, res) => {
  res.send("Server ready!");
});

app.use("/colyseus", monitor());

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: app.listen(port),
  }),
});

gameServer.define("my_room", MyRoom);

console.log(`[GameServer] Listening on Port: ${port}`);
