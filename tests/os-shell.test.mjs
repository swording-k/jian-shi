import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

test("sword os pages are original and carry Killian's profile", async () => {
  const desktop = await readFile(new URL("../desktop.html", import.meta.url), "utf8");
  const phone = await readFile(new URL("../phone.html", import.meta.url), "utf8");
  const profile = await readFile(new URL("../profile.js", import.meta.url), "utf8");
  for (const text of [desktop, phone, profile]) {
    assert.equal(/dsxzai|小灶|大师的AI/.test(text), false);
  }
  assert.match(profile, /杨锟/);
  assert.match(profile, /swordingk@gmail.com/);
  assert.match(desktop, /desk.css/);
  assert.match(phone, /phone.css/);
});

test("presence server shares cursors between two visitors", async () => {
  const child = spawn(process.execPath, ["presence-server.mjs"], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const port = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("no port")), 4000);
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      const match = /PRESENCE (\d+)/.exec(buf);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    child.on("exit", (code) => reject(new Error("server exited " + code + " " + buf)));
  });
  try {
    const a = new WebSocket("ws://127.0.0.1:" + port);
    const b = new WebSocket("ws://127.0.0.1:" + port);
    await Promise.all([opened(a), opened(b)]);
    const seen = waitState(b);
    a.send(JSON.stringify({ t: "hello", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "甲", color: "#e2b657" }));
    b.send(JSON.stringify({ t: "hello", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "乙", color: "#8fb9a8" }));
    a.send(JSON.stringify({ t: "move", x: 0.25, y: 0.5 }));
    const state = await seen;
    const peer = state.peers.find((item) => item.name === "甲");
    assert.equal(peer.x, 0.25);
    assert.equal(peer.y, 0.5);
    assert.equal(state.peers.length, 2);
  } finally {
    child.kill();
  }
});

function opened(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

function waitState(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no state")), 3000);
    socket.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === "state" && msg.peers.some((peer) => peer.x === 0.25)) {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
}
