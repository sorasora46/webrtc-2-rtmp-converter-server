const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const app = express();
// const host = "192.168.1.6";
const host = "localhost";
const port = 3000;

const server = app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const rtmpUrl = `rtmp://${host}/live/test`;
  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-f', 'flv',
    rtmpUrl
  ]);

  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      ffmpeg.stdin.write(message)
    } else {
      console.error('Received non-binary message');
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    ffmpeg.stdin.end();
    ffmpeg.stdin = null;
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
    ffmpeg.stdin.end();
    ffmpeg.stdin = null;
  });

  ffmpeg.on('error', (error) => {
    console.error(`ffmpeg error: ${error.message}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
  });

});
