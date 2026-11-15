(function () {
  const root = document.querySelector("[data-presence]");
  const layer = document.querySelector(".cursors");
  const label = document.querySelector("[data-presence-label]");
  if (!root || !layer || !label) return;

  const params = new URLSearchParams(location.search);
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const url = params.get("ws") || (local ? `ws://${location.hostname}:8787` : "");
  const palette = ["#e2b657", "#8fb9a8", "#d7c4aa", "#c9846a", "#9bb7d4", "#d4a5c3"];
  let me = JSON.parse(sessionStorage.getItem("sword-os-me") || "null");
  if (!me) {
    const n = Math.random().toString(16).slice(2, 6);
    me = { id: crypto.randomUUID(), name: "剑客 " + n, color: palette[n.charCodeAt(0) % palette.length] };
    sessionStorage.setItem("sword-os-me", JSON.stringify(me));
  }
  const nodes = new Map();
  let socket = null;
  let last = 0;

  function setLabel(text) { label.textContent = text; }

  function render(peers) {
    const others = (peers || []).filter((peer) => peer.id !== me.id && peer.x != null);
    const seen = new Set();
    others.forEach((peer) => {
      seen.add(peer.id);
      let node = nodes.get(peer.id);
      if (!node) {
        node = document.createElement("div");
        node.className = "cursor";
        node.innerHTML = "<i></i><b></b>";
        layer.append(node);
        nodes.set(peer.id, node);
      }
      node.style.setProperty("--c", peer.color);
      node.style.left = (peer.x * 100) + "%";
      node.style.top = (peer.y * 100) + "%";
      node.querySelector("b").textContent = peer.name;
    });
    nodes.forEach((node, id) => {
      if (!seen.has(id)) { node.remove(); nodes.delete(id); }
    });
    const count = (peers || []).length;
    setLabel(socket && socket.readyState === 1 ? count + " 人在这间屋子" : "实时通道没连上");
  }

  function send(payload) {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(payload));
  }

  let leaving = false;
  function connect() {
    if (!url || leaving) { if (!url) setLabel("静态页，没有实时通道"); return; }
    if (socket && socket.readyState < 2) socket.close();
    socket = new WebSocket(url);
    socket.addEventListener("open", () => send({ t: "hello", ...me }));
    socket.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === "state") render(msg.peers);
    });
    socket.addEventListener("close", () => {
      if (leaving) return;
      setLabel("实时通道断了");
      setTimeout(connect, 1500);
    });
  }
  setInterval(() => send({ t: "ping" }), 2000);
  window.addEventListener("pagehide", () => {
    leaving = true;
    send({ t: "bye" });
  });

  root.addEventListener("pointermove", (ev) => {
    const now = Date.now();
    if (now - last < 40) return;
    last = now;
    const box = root.getBoundingClientRect();
    send({ t: "move", x: (ev.clientX - box.left) / box.width, y: (ev.clientY - box.top) / box.height });
  });
  connect();
})();
