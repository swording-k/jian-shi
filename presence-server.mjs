import net from "node:net";
import crypto from "node:crypto";

const MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const peers = new Map();
let timer = null;

function encode(text) {
  const payload = Buffer.from(text);
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x81;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x81;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}

function snapshot() {
  return JSON.stringify({
    t: "state",
    peers: [...peers.values()].map(({ id, name, color, x, y }) => ({ id, name, color, x, y }))
  });
}

function broadcast() {
  timer = null;
  const frame = encode(snapshot());
  for (const peer of peers.values()) {
    if (peer.socket.writable) peer.socket.write(frame);
  }
}

function schedule() {
  if (!timer) timer = setTimeout(broadcast, 30);
}

function safe(msg, socket) {
  if (!msg || typeof msg !== "object") return null;
  const id = typeof msg.id === "string" && /^[0-9a-f-]{36}$/i.test(msg.id) ? msg.id : null;
  if (msg.t === "hello") {
    const name = String(msg.name || "剑客").slice(0, 16);
    const color = /^#[0-9a-fA-F]{6}$/.test(msg.color || "") ? msg.color : "#e2b657";
    if (!id) return null;
    return { t: "hello", id, name, color, socket };
  }
  if (msg.t === "move") {
    const x = Number(msg.x);
    const y = Number(msg.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { t: "move", x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), socket };
  }
  return null;
}

function onText(socket, text) {
  let msg;
  try { msg = JSON.parse(text); } catch { return; }
  if (msg.t === "bye") {
    for (const [id, item] of peers) if (item.socket === socket) peers.delete(id);
    schedule();
    return;
  }
  if (msg.t === "ping") {
    const item = [...peers.values()].find((row) => row.socket === socket);
    if (item) item.seen = Date.now();
    return;
  }
  const peer = [...peers.values()].find((item) => item.socket === socket);
  const next = safe(peer ? { ...msg, id: peer.id } : msg, socket);
  if (!next) return;
  if (next.t === "hello") {
    const prev = peers.get(next.id);
    if (prev && prev.socket !== socket) {
      prev.socket.__replaced = true;
      prev.socket.destroy();
    }
    peers.set(next.id, { id: next.id, name: next.name, color: next.color, x: null, y: null, socket, seen: Date.now() });
    schedule();
    return;
  }
  if (peer) {
    peer.x = next.x;
    peer.y = next.y;
    peer.seen = Date.now();
    schedule();
  }
}

function frames(socket, buf, onFrame) {
  while (buf.length >= 2) {
    const opcode = buf[0] & 0x0f;
    let len = buf[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buf.length < 4) return buf;
      len = buf.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (buf.length < 10) return buf;
      len = Number(buf.readBigUInt64BE(2));
      offset = 10;
    }
    if (len > 100000) { socket.destroy(); return Buffer.alloc(0); }
    const masked = (buf[1] & 0x80) !== 0;
    if (buf.length < offset + (masked ? 4 : 0) + len) return buf;
    const mask = masked ? buf.subarray(offset, offset + 4) : null;
    if (masked) offset += 4;
    const payload = Buffer.from(buf.subarray(offset, offset + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    buf = buf.subarray(offset + len);
    if (opcode === 0x8) { socket.end(); return buf; }
    if (opcode === 0x9) {
      const pong = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);
      socket.write(pong);
    } else if (opcode === 0x1) onFrame(payload.toString());
  }
  return buf;
}

const server = net.createServer((socket) => {
  let buf = Buffer.alloc(0);
  let open = false;
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (!open) {
      const end = buf.indexOf("\r\n\r\n");
      if (end < 0) return;
      const head = buf.subarray(0, end).toString();
      buf = buf.subarray(end + 4);
      const key = /Sec-WebSocket-Key:\s*(.+)/i.exec(head)?.[1]?.trim();
      if (!key || !/Upgrade:\s*websocket/i.test(head)) {
        socket.end("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nsword-os presence\n");
        return;
      }
      const accept = crypto.createHash("sha1").update(key + MAGIC).digest("base64");
      socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
      open = true;
    }
    buf = frames(socket, buf, (text) => onText(socket, text));
  });
  const drop = () => {
    if (socket.__replaced) return;
    for (const [id, peer] of peers) if (peer.socket === socket) peers.delete(id);
    schedule();
  };
  socket.on("close", drop);
  socket.on("error", drop);
});

const port = Number(process.env.PORT || 8787);
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, peer] of peers) {
    if (now - (peer.seen || 0) > 4500) {
      peers.delete(id);
      changed = true;
    }
  }
  if (changed) schedule();
}, 1000);

server.listen(port, "127.0.0.1", () => {
  console.log("PRESENCE " + server.address().port);
});
