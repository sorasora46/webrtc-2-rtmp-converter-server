const express = require('express');
const { spawn } = require('child_process');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// const host = "192.168.1.6";
// const host = "0.0.0.0";
const host = "localhost";
const port = 4550;
const rtmpUrl = 'rtmp://94.100.26.141/live/test';
const localRtmp = 'rtmp://localhost/live/test';

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

function spawnFFMPEG(url) {
  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',
    '-fflags', '+nobuffer',
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

io.on('connection', (socket) => {
  console.log('Client connected');

  let ffmpeg = spawnFFMPEG(localRtmp);
  if (ffmpeg) {
    console.log('ffmpeg process created');
  }

  // Handling binary messages
  socket.on('stream', (message) => {
    if (Buffer.isBuffer(message)) {
      ffmpeg.stdin.write(message);
    } else {
      console.error('Received non-binary message');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    ffmpeg.stdin.end();
    ffmpeg.stdin = null;
  });

  socket.on('error', (error) => {
    console.error(`Socket.IO error: ${error.message}`);
    ffmpeg.stdin.end();
    ffmpeg.stdin = null;
  });
});
