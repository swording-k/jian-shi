(function () {
  const p = window.SWORD_OS;
  const views = window.SwordViews;
  const icon = window.SwordIcon;
  const apps = {
    works: { title: "访达", body: views.finderRoot },
    safari: { title: "Safari", body: safariShell },
    mail: { title: "邮件", body: views.mail },
    notes: { title: "备忘录", body: views.notes },
    phone: { title: "电话", body: views.phone },
    contact: { title: "通讯录", body: views.contacts },
    term: { title: "终端", body: termBody }
  };
  const order = ["works", "safari", "mail", "phone", "contact", "notes", "term"];
  const socials = [
    ["github", "GitHub", "https://github.com/swording-k"],
    ["x", "X", "https://x.com/swordingk"],
    ["douyin", "抖音", "https://v.douyin.com/VPr9mz7UKg4/"],
    ["wechat", "微信", ""],
    ["mail", "邮件", "mailto:swordingk@gmail.com"],
    ["blog", "博客", "https://baojian-notionnext-blog.vercel.app"]
  ];
  const layer = document.querySelector(".windows");
  const iconBox = document.querySelector(".desk-icons, .icons");
  const dock = document.querySelector(".dock");
  const appname = document.querySelector(".appname");
  let z = 5;
  let drag = null;
  const log = ["输入 help 看看能做什么。"];
  const finderAt = { cat: "", project: "" };
  const browser = { tabs: [], index: -1 };
  const mailState = {
    box: "in",
    open: 0,
    composing: false,
    in: [
      { from: "系统", subject: "欢迎来到这台 Mac", time: "09:41", body: "访达里是作品。通讯录可以给宝剑打一通模拟电话。邮件写完会留在已发送。" },
      { from: "宝剑", subject: "复杂到不能被一句话概括", time: "昨天", body: p.line + "\n\n" + p.bio }
    ],
    sent: []
  };
  let cardId = "me";
  let callRun = 0;
  let callStop = null;
  let callClock = null;


  order.forEach((id, index) => {
    const spec = apps[id];
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.app = id;
    b.innerHTML = `${icon(id)}<span>${spec.title}</span>`;
    b.addEventListener("click", () => openApp(id));
    iconBox.append(b);
    const d = document.createElement("button");
    d.type = "button";
    d.dataset.app = id;
    d.setAttribute("aria-label", spec.title);
    d.innerHTML = icon(id);
    d.addEventListener("click", () => openApp(id));
    dock.append(d);
    if (index === order.length - 1) {
      const sep = document.createElement("i");
      sep.className = "sep";
      dock.append(sep);
      const trash = document.createElement("button");
      trash.type = "button";
      trash.setAttribute("aria-label", "废纸篓");
      trash.innerHTML = icon("trash");
      dock.append(trash);
      socials.forEach(([sid, label, href]) => {
        const s = document.createElement("button");
        s.type = "button";
        s.className = "social";
        s.setAttribute("aria-label", label);
        s.innerHTML = icon(sid);
        s.addEventListener("click", () => {
          if (sid === "wechat") openApp("contact");
          else if (href.startsWith("mailto:")) window.location.href = href;
          else openInSafari(href, label);
        });
        dock.append(s);
      });
    }
  });

  function termBody() {
    return `<div class="term"><pre id="term-log"></pre>
      <form id="term-form"><span class="prompt">killian@mac ~ %</span><input id="term-in" autocomplete="off" spellcheck="false" aria-label="命令"></form></div>`;
  }

  function safariShell() {
    return `<div class="browser">
      <div class="tabbar" data-tabs></div>
      <div class="toolbar">
        <button type="button" data-browser="back" aria-label="返回">‹</button>
        <button type="button" data-browser="fwd" aria-label="前进">›</button>
        <div class="url" data-url-label>起始页 · 书签</div>
      </div>
      <div class="viewport" data-viewport>${views.safariHome()}</div>
    </div>`;
  }

  function winOf(id) { return layer.querySelector(`.win[data-app="${id}"]`); }

  function openApp(id) {
    let win = winOf(id);
    if (!win) win = create(id);
    win.classList.remove("min");
    focus(win);
    markDock();
    if (id === "term") win.querySelector("#term-in")?.focus();
    if (id === "mail") paintMail();
    if (id === "contact") paintCard();
    return win;
  }

  function create(id) {
    const spec = apps[id];
    const sizes = { works: [860, 540], safari: [920, 600], mail: [980, 600], notes: [640, 460], phone: [380, 620], contact: [760, 520], term: [700, 430] };
    const [w, h] = sizes[id];
    const width = Math.min(w, window.innerWidth - 36);
    const height = Math.min(h, window.innerHeight - 110);
    const n = layer.children.length;
    const win = document.createElement("section");
    win.className = "win" + (id === "safari" ? " win-safari" : "");
    win.dataset.app = id;
    win.style.width = width + "px";
    win.style.height = height + "px";
    win.style.left = Math.max(16, (window.innerWidth - width) / 2 - 70 + n * 24) + "px";
    win.style.top = Math.max(12, 28 + n * 20) + "px";
    const inner = spec.body();
    const kind = id === "term" ? " is-term" : id === "works" ? " is-finder" : id === "safari" ? " is-safari" : "";
    const finder = `<div class="finder"><aside><b>个人</b><span class="on">文稿</span></aside><div class="pane" data-finder-pane>${inner}</div></div>`;
    win.innerHTML = `<header class="titlebar"><div class="lights">
        <button type="button" data-act="close" aria-label="关闭"></button>
        <button type="button" data-act="min" aria-label="最小化"></button>
        <button type="button" data-act="max" aria-label="缩放"></button>
      </div><h2>${spec.title}</h2><div></div></header>
      <div class="win-body${kind}">${id === "works" ? finder : inner}</div>
      <i class="grip" data-act="resize"></i>`;
    layer.append(win);
    if (id === "term") paintTerm();
    return win;
  }

  function focus(win) {
    z += 1;
    win.style.zIndex = String(z);
    appname.textContent = win.querySelector("h2").textContent;
  }

  function markDock() {
    if (!layer.querySelector(".win:not(.min)")) appname.textContent = "访达";
    dock.querySelectorAll("button[data-app]").forEach((btn) => {
      const win = winOf(btn.dataset.app);
      btn.dataset.open = win && !win.classList.contains("min") ? "true" : "false";
    });
  }

  function paintFinder() {
    const pane = winOf("works")?.querySelector("[data-finder-pane]");
    if (!pane) return;
    if (finderAt.project) pane.innerHTML = views.finderProject(finderAt.project);
    else if (finderAt.cat) pane.innerHTML = views.finderCat(finderAt.cat);
    else pane.innerHTML = views.finderRoot();
  }

  function paintTerm() {
    const pre = document.getElementById("term-log");
    if (pre) pre.textContent = log.join("\n");
  }

  function say(line) { log.push(line); paintTerm(); }

  function openInSafari(url, title) {
    if (!url) return;
    if (url.startsWith("mailto:")) { window.location.href = url; return; }
    const win = openApp("safari");
    browser.tabs.push({ title: title || url, url, history: [url], at: 0 });
    browser.index = browser.tabs.length - 1;
    paintSafari(win);
  }

  function frameBlocked(url) {
    return /github[.]com|x[.]com|twitter[.]com|douyin[.]com|apple[.]com/.test(url);
  }

  function paintSafari(win) {
    const tabs = win.querySelector("[data-tabs]");
    const label = win.querySelector("[data-url-label]");
    const view = win.querySelector("[data-viewport]");
    if (!tabs || !view) return;
    if (!browser.tabs.length) {
      tabs.innerHTML = `<span class="tab on">起始页</span>`;
      label.textContent = "起始页 · 书签";
      view.innerHTML = views.safariHome();
      return;
    }
    tabs.innerHTML = browser.tabs.map((tab, i) => `<button type="button" class="tab${i === browser.index ? " on" : ""}" data-tab="${i}">${views.esc(tab.title)}</button>`).join("");
    const tab = browser.tabs[browser.index];
    const url = tab.history[tab.at];
    label.textContent = url;
    view.innerHTML = frameBlocked(url)
      ? `<div class="blocked"><b>${views.esc(tab.title)}</b><p>这个地址不让嵌在窗口里，Safari 停在这一页。</p><a href="${views.esc(url)}" target="_blank" rel="noopener">用外面的浏览器打开</a></div>`
      : `<iframe title="${views.esc(tab.title)}" src="${views.esc(url)}"></iframe>`;
  }

  function run(raw) {
    say("killian@mac ~ % " + raw);
    const [cmd, ...rest] = raw.split(/\s+/);
    const arg = rest.join(" ");
    const project = p.projects.find((item) => item.name.toLowerCase() === arg.toLowerCase());
    if (cmd === "help") say("help   ls   open <项目>   links <项目>   clear");
    else if (cmd === "clear") { log.length = 0; paintTerm(); }
    else if (cmd === "whoami") say(`${p.name} / ${p.en}\n${p.role}`);
    else if (cmd === "ls") {
      if (!arg) say(finderAt.cat ? p.projects.filter((item) => item.cat === finderAt.cat).map((item) => item.name).join("\n") : views.cats.join("\n"));
      else say(p.projects.filter((item) => item.cat === arg || item.name === arg).map((item) => item.name).join("\n") || "空的");
    } else if (cmd === "open") {
      if (!project) { say("没有这个项目。先 ls"); return; }
      finderAt.cat = project.cat;
      finderAt.project = project.name;
      openApp("works");
      paintFinder();
      say("打开了 " + project.name);
    } else if (cmd === "links") {
      if (!project) { say("没有这个项目"); return; }
      project.links.forEach((link, i) => say(`${i + 1}. ${link.label}  ${link.href}`));
    } else say("未知命令。试 help");
  }


  function paintCard() {
    const card = winOf("contact")?.querySelector("[data-card]");
    if (!card) return;
    card.innerHTML = views.personCard(cardId);
    winOf("contact").querySelectorAll("[data-person]").forEach((btn) => btn.classList.toggle("on", btn.dataset.person === cardId));
  }

  function paintMail() {
    const win = winOf("mail");
    if (!win) return;
    const list = win.querySelector("[data-mail-list]");
    const read = win.querySelector("[data-mail-read]");
    const form = win.querySelector("[data-compose-form]");
    win.querySelectorAll("[data-box]").forEach((btn) => btn.classList.toggle("on", btn.dataset.box === mailState.box));
    const rows = mailState[mailState.box];
    list.innerHTML = rows.map((row, i) => `<button type="button" data-mail-open="${i}" class="${i === mailState.open ? "on" : ""}"><b>${views.esc(row.subject)}</b><span>${views.esc(row.from)} · ${views.esc(row.time)}</span></button>`).join("") || `<p class="fine">没有邮件</p>`;
    form.hidden = !mailState.composing;
    read.hidden = mailState.composing;
    const row = rows[mailState.open];
    read.innerHTML = row ? `<h3>${views.esc(row.subject)}</h3><p class="fine">${views.esc(row.from)} → ${views.esc(row.to || "我")} · ${views.esc(row.time)}</p><p>${views.esc(row.body)}</p>` : "";
  }

  let callClip = null;
  function stopCallSound() {
    if (callStop) callStop();
    callStop = null;
    if (callClip) { callClip.pause(); callClip.src = ""; callClip = null; }
    if (callClock) clearInterval(callClock);
    callClock = null;
  }


  function playRecording(run, status) {
    const files = ["audio/学海路.m4a", "audio/call.m4a", "audio/call.mp3", "audio/call.wav"];
    let index = 0;
    const audio = new Audio();
    callClip = audio;
    const next = () => {
      if (run !== callRun || index >= files.length) {
        if (run === callRun && index >= files.length) status.textContent = "已接通，还没有录音";
        return;
      }
      audio.src = files[index];
      index += 1;
      audio.play().catch(next);
    };
    audio.addEventListener("ended", () => { if (run === callRun) hangUp(); });
    next();
  }
  function startCall(name) {
    const win = openApp("phone");
    const screen = win.querySelector("[data-call-screen]");
    const keypad = win.querySelector("[data-keypad]");
    screen.hidden = false;
    keypad.hidden = true;
    win.querySelector("[data-call-name]").textContent = name;
    const status = win.querySelector("[data-call-status]");
    const time = win.querySelector("[data-call-time]");
    status.textContent = "正在呼叫…";
    time.textContent = "";
    stopCallSound();
    callRun += 1;
    const run = callRun;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const blink = setInterval(() => { gain.gain.value = gain.gain.value > 0 ? 0 : 0.04; }, 450);
    callStop = () => { clearInterval(blink); osc.stop(); ctx.close(); };
    setTimeout(() => {
      if (run !== callRun) return;
      stopCallSound();
      status.textContent = "已接通";
      let seconds = 0;
      callClock = setInterval(() => {
        seconds += 1;
        const m = String(Math.floor(seconds / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");
        time.textContent = m + ":" + s;
      }, 1000);
      playRecording(run, status);
    }, 2200);
  }

  function hangUp() {
    callRun += 1;
    stopCallSound();
    const win = winOf("phone");
    if (!win) return;
    const status = win.querySelector("[data-call-status]");
    if (status) status.textContent = "已挂断";
    setTimeout(() => {
      const screen = win.querySelector("[data-call-screen]");
      const keypad = win.querySelector("[data-keypad]");
      if (screen) screen.hidden = true;
      if (keypad) keypad.hidden = false;
    }, 700);
  }

  layer.addEventListener("click", (e) => {
    const person = e.target.closest("[data-person]");
    if (person) { cardId = person.dataset.person; paintCard(); return; }
    const call = e.target.closest("[data-call]");
    if (call) { startCall(call.dataset.call); return; }
    if (e.target.closest("[data-hang]")) { hangUp(); return; }
    if (e.target.closest("[data-mute]")) {
      const btn = e.target.closest("[data-mute]");
      btn.classList.toggle("on");
      btn.textContent = btn.classList.contains("on") ? "已静音" : "静音";
      return;
    }
    const key = e.target.closest("[data-key]");
    if (key) {
      const out = key.closest(".dialer").querySelector("[data-digits]");
      out.textContent = (out.textContent + key.dataset.key).slice(-16);
      return;
    }
    const box = e.target.closest("[data-box]");
    if (box) { mailState.box = box.dataset.box; mailState.open = 0; mailState.composing = false; paintMail(); return; }
    if (e.target.closest("[data-compose]")) { mailState.composing = true; openApp("mail"); paintMail(); return; }
    const composeTo = e.target.closest("[data-compose-to]");
    if (composeTo) {
      mailState.composing = true;
      openApp("mail");
      paintMail();
      const input = winOf("mail").querySelector("[name=to]");
      if (input) input.value = composeTo.dataset.composeTo;
      return;
    }
    const mailOpen = e.target.closest("[data-mail-open]");
    if (mailOpen) { mailState.open = Number(mailOpen.dataset.mailOpen); mailState.composing = false; paintMail(); return; }
    const cat = e.target.closest("[data-enter-cat]");
    if (cat) { finderAt.cat = cat.dataset.enterCat; finderAt.project = ""; paintFinder(); return; }
    const project = e.target.closest("[data-enter-project]");
    if (project) { finderAt.project = project.dataset.enterProject; paintFinder(); return; }
    const up = e.target.closest("[data-finder-up]");
    if (up) {
      if (finderAt.project) finderAt.project = "";
      else finderAt.cat = "";
      paintFinder();
      return;
    }
    const href = e.target.closest("[data-href]");
    if (href) { openInSafari(href.dataset.href, href.dataset.title); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) { browser.index = Number(tab.dataset.tab); paintSafari(winOf("safari")); return; }
    const nav = e.target.closest("[data-browser]");
    if (nav && browser.tabs[browser.index]) {
      const current = browser.tabs[browser.index];
      if (nav.dataset.browser === "back" && current.at > 0) current.at -= 1;
      if (nav.dataset.browser === "fwd" && current.at < current.history.length - 1) current.at += 1;
      paintSafari(winOf("safari"));
    }
  });

  layer.addEventListener("pointerdown", (e) => {
    const win = e.target.closest(".win");
    if (!win) return;
    focus(win);
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") { win.remove(); markDock(); return; }
    if (act === "min") { win.classList.add("min"); markDock(); return; }
    if (act === "max") { win.classList.toggle("max"); return; }
    if (e.target.dataset.act === "resize") {
      const rect = win.getBoundingClientRect();
      drag = { type: "resize", win, x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
      return;
    }
    if (!e.target.closest(".titlebar") || e.target.closest("button")) return;
    drag = { type: "move", win, dx: e.clientX - win.offsetLeft, dy: e.clientY - win.offsetTop };
    win.classList.remove("max");
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (drag.type === "move") {
      drag.win.style.left = Math.max(0, e.clientX - drag.dx) + "px";
      drag.win.style.top = Math.max(0, e.clientY - drag.dy) + "px";
    } else {
      drag.win.style.width = Math.max(360, drag.w + e.clientX - drag.x) + "px";
      drag.win.style.height = Math.max(240, drag.h + e.clientY - drag.y) + "px";
    }
  });
  window.addEventListener("pointerup", () => { drag = null; });
  layer.addEventListener("submit", (e) => {
    if (e.target.id === "term-form") e.preventDefault();
    if (!e.target.matches("[data-compose-form]")) return;
    e.preventDefault();
    const data = new FormData(e.target);
    mailState.sent.unshift({
      from: "我",
      to: String(data.get("to") || ""),
      subject: String(data.get("subject") || "(无主题)"),
      time: "刚刚",
      body: String(data.get("body") || "")
    });
    e.target.reset();
    mailState.box = "sent";
    mailState.open = 0;
    mailState.composing = false;
    paintMail();
  });
  layer.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.id !== "term-in") return;
    e.preventDefault();
    const raw = e.target.value.trim();
    e.target.value = "";
    if (raw) run(raw);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.target.id === "term-in") return;
    const top = [...layer.querySelectorAll(".win:not(.min)")].sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0))[0];
    top?.remove();
    markDock();
  });

  const clock = document.querySelector(".clock");
  const tick = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", weekday: "short" }).format(now);
    const time = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    clock.textContent = date + "  " + time;
  };
  tick();
  setInterval(tick, 10000);
  openApp("works");
})();
