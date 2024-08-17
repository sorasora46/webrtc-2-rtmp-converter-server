const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const app = express();

// const host = "192.168.1.6";
// const host = "0.0.0.0";
const host = "localhost";
const port = 4550;
const rtmpUrl = 'rtmp://94.100.26.141/live/test';
const localRtmp = 'rtmp://localhost/live/test';

const server = app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

const wss = new WebSocket.Server({ server });

function spawnFFMPEG(url) {
  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',  // Avoid freezing when input is inconsistent
    '-fflags', '+nobuffer',  // Disable buffering to avoid input delay
    url
  ]);

  ffmpeg.on('error', (error) => {
    console.error(`ffmpeg error: ${error.message}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
  });

  return ffmpeg;
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  const ffmpeg = spawnFFMPEG(localRtmp);

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


});
