import net from 'net';

const host = '3.39.47.126';
const port = 5432;

console.log(`Connecting to ${host}:${port}...`);

const socket = new net.Socket();

socket.connect(port, host, () => {
  console.log('Connected successfully via net module!');
  socket.end();
});

socket.on('error', (err) => {
  console.error('Connection failed:', err);
});

socket.on('close', () => {
  console.log('Connection closed');
});
