// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

require('dotenv').config({ path: '../config.env' });
const AI_PORT = process.env.AI_PORT || 8001;
const AI_URL = `http://localhost:${AI_PORT}/analyze`;

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('frame', async (data) => {
    try {
      // forward to AI service
      const resp = await axios.post(AI_URL, { image_b64: data.image });
      const result = resp.data;

      // forward back to client
      socket.emit('analysis', result);

      // timestamp for logs
      const timestamp = new Date().toISOString();

      // log suspicious events
      if (result.look_away) {
        const log = `${timestamp} - socket:${socket.id} - LOOK_AWAY\n`;
        fs.appendFileSync('suspicious.log', log);
      }

      // ✅ log emotions as well
      if (result.emotion && result.emotion !== "unknown") {
        const log = `${timestamp} - socket:${socket.id} - EMOTION: ${result.emotion}\n`;
        fs.appendFileSync('suspicious.log', log);
      }

    } catch (err) {
      console.error('Error from AI service:', err.response?.data || err.message || err);
      socket.emit('analysis', err.response?.data || { error: err.message || "Unknown error" });
    }
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
