import { handleEventsSocket } from '../controllers/wsController.js';

export const routeWebSocketUpgrade = (request, socket) => {
  const { pathname } = new URL(request.url, 'http://localhost');

  if (pathname === '/ws/events') {
    handleEventsSocket(request, socket);
    return true;
  }

  return false;
};
