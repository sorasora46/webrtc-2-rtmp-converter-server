const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();

const host = "localhost";
const port = 4550;

const server = app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

const wss = new WebSocket.Server({ server });

function spawnFFMPEG() {
    const ffmpeg = spawn('ffmpeg', [
        '-re',               // Read input at native frame rate
        '-i', 'pipe:0',      // Input from stdin
        '-c:v', 'libx264',   // Video codec: libx264
        '-preset', 'veryfast', // Encoding preset for faster conversion
        '-pix_fmt', 'yuv420p', // Pixel format for compatibility
        '-movflags', '+faststart', // Allow fast seeking in output video
        '-f', 'mp4',         // Output format: mp4
        `output_${Date.now()}.mp4` // Unique output file for each stream
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
    let ffmpeg = spawnFFMPEG();

    ws.on('message', (message) => {
        // Handle control messages from the client, such as 'switch_stream'
        if (typeof message === 'string') {
            if (message === 'switch_stream') {
                // Gracefully close current ffmpeg process
                ffmpeg.stdin.end(); // Signal end of input to ffmpeg
                ffmpeg = spawnFFMPEG(); // Spawn a new ffmpeg process for the new stream
                console.log('Stream switched, new ffmpeg process started.');
            } else {
                console.error('Received unknown command');
            }
        } else if (Buffer.isBuffer(message)) {
            // Send video data to ffmpeg if it's binary data
            ffmpeg.stdin.write(message);
        } else {
            console.error('Received non-binary message');
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        ffmpeg.stdin.end(); // End ffmpeg input on client disconnect
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
        ffmpeg.stdin.end();
    });
});
