import crypto from 'crypto';

import logger from '../logger.js';

const EVENT_CLIENTS = new Set();
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const encodeFrame = (payload) => {
  const data = Buffer.from(payload);
  const length = data.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), data]);
  }

  if (length < 65_536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, data]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, data]);
};

const acceptKey = (key) =>
  crypto
    .createHash('sha1')
    .update(`${key}${WS_GUID}`)
    .digest('base64');

const closeClient = (socket) => {
  EVENT_CLIENTS.delete(socket);
  socket.destroy();
};

export const handleEventsSocket = (request, socket) => {
  const key = request.headers['sec-websocket-key'];
  if (!key) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`,
      '\r\n',
    ].join('\r\n'),
  );

  EVENT_CLIENTS.add(socket);
  logger.info('WebSocket client connected to ws/events');

  socket.on('data', (data) => {
    const opcode = data[0] & 0x0f;
    if (opcode === 0x8) {
      closeClient(socket);
    }
  });
  socket.on('close', () => EVENT_CLIENTS.delete(socket));
  socket.on('error', () => EVENT_CLIENTS.delete(socket));
};

export const broadcastEventCreated = (event) => {
  const message = encodeFrame(JSON.stringify({ type: 'event.created', event }));

  for (const client of EVENT_CLIENTS) {
    if (client.destroyed) {
      EVENT_CLIENTS.delete(client);
      continue;
    }

    client.write(message, (error) => {
      if (error) {
        logger.error(`WebSocket broadcast failed: ${error.message}`);
        closeClient(client);
      }
    });
  }
};

