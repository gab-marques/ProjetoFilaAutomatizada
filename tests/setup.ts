import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.test') });

// Polyfill minimal WebSocket for Node 20 environment in Vitest
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    readyState = 1;
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
  // @ts-expect-error polyfill
  globalThis.WebSocket = MockWebSocket;
}
