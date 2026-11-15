(function () {
  const p = window.SWORD_OS;
  const views = window.SwordViews;
  const icon = window.SwordIcon;
  const apps = [
    ["phone", "电话"], ["safari", "Safari"], ["works", "访达"], ["mail", "邮件"],
    ["notes", "备忘录"], ["contact", "通讯录"], ["term", "终端"]
  ];
  const dockIds = ["phone", "safari", "contact", "mail"];
  const phone = document.querySelector(".phone");
  const lock = document.querySelector(".lockscreen");
  const grid = document.querySelector("#grid");
  const dock = document.querySelector("#dockbar");
  const screens = document.querySelector("#screens");
  const log = ["killian@iphone ~ % help"];
  const spot = { cat: "", project: "" };
  let callRun = 0;
  let callClip = null;
  let callClock = null;

  function paintTime() {
    const now = new Date();
    document.querySelectorAll("[data-time]").forEach((node) => {
      node.textContent = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).format(now);
    });
    const date = document.querySelector("[data-date]");
    if (date) date.textContent = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai", month: "long", day: "numeric", weekday: "long"
    }).format(now);
  }
  paintTime();
  setInterval(paintTime, 10000);

  function button(id, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "app-btn";
    btn.innerHTML = `${icon(id)}<span>${title}</span>`;
    btn.addEventListener("click", () => open(id, title, btn));
    return btn;
  }
  apps.forEach(([id, title]) => grid.append(button(id, title)));
  dockIds.forEach((id) => {
    const title = apps.find((row) => row[0] === id)[1];
    dock.append(button(id, title));
  });

  function unlock() {
    lock.classList.add("out");
    phone.classList.add("is-unlocked");
  }
  document.querySelector("#unlock-btn").addEventListener("click", unlock);
  let startY = 0;
  lock.addEventListener("pointerdown", (e) => { startY = e.clientY; });
  lock.addEventListener("pointerup", (e) => { if (startY - e.clientY > 40) unlock(); });

  function finderHtml() {
    if (spot.project) return views.finderProject(spot.project);
    if (spot.cat) return views.finderCat(spot.cat);
    return views.finderRoot();
  }
  function bodyFor(id) {
    if (id === "notes") return `<h2 class="big-title">备忘录</h2>${views.notes()}${views.about()}`;
    if (id === "works") return `<h2 class="big-title">访达</h2><div data-finder-pane>${finderHtml()}</div>`;
    if (id === "safari") return `<h2 class="big-title">Safari</h2>${views.safariHome()}`;
    if (id === "contact") return `<h2 class="big-title">通讯录</h2>${views.contacts()}<div data-card>${views.personCard("me")}</div>`;
    if (id === "mail") return `<h2 class="big-title">邮件</h2>${views.mail()}`;
    if (id === "phone") return views.phone();
    return `<h2 class="big-title">终端</h2><div class="term"><pre>${log.join("\n")}</pre><form><input aria-label="命令" autocomplete="off"><button type="submit">运行</button></form></div>`;
  }

  function screenFor(id) {
    let scr = screens.querySelector(`[data-app="${id}"]`);
    if (scr) return scr;
    scr = document.createElement("section");
    scr.className = "scr";
    scr.dataset.app = id;
    scr.innerHTML = `<header class="nav"><button type="button" class="back" data-back><span class="chev">‹</span>主屏幕</button><b class="ttl"></b><span></span></header><div class="scr-body"></div>`;
    screens.append(scr);
    return scr;
  }

  function open(id, title, origin) {
    const scr = screenFor(id);
    scr.querySelector(".ttl").textContent = title;
    scr.querySelector(".scr-body").innerHTML = bodyFor(id);
    if (origin) {
      const r = origin.getBoundingClientRect();
      const box = phone.getBoundingClientRect();
      scr.style.setProperty("--launch-x", (r.left - box.left) + "px");
      scr.style.setProperty("--launch-y", (r.top - box.top) + "px");
      scr.classList.add("zoom", "prelaunch");
    }
    scr.classList.add("open");
    requestAnimationFrame(() => scr.classList.remove("prelaunch"));
    phone.classList.toggle("is-ink", id === "notes" || id === "mail" || id === "contact" || id === "works");
  }

  function closeTop() {
    const openScreens = [...screens.querySelectorAll(".scr.open")];
    const top = openScreens[openScreens.length - 1];
    if (!top) return;
    top.classList.remove("open");
    if (!screens.querySelector(".scr.open")) phone.classList.remove("is-ink");
  }

  screens.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { closeTop(); return; }
    const cat = e.target.closest("[data-enter-cat]");
    if (cat) { spot.cat = cat.dataset.enterCat; spot.project = ""; open("works", "访达"); return; }
    const project = e.target.closest("[data-enter-project]");
    if (project) { spot.project = project.dataset.enterProject; open("works", "访达"); return; }
    const up = e.target.closest("[data-finder-up]");
    if (up) { if (spot.project) spot.project = ""; else spot.cat = ""; open("works", "访达"); return; }
    const person = e.target.closest("[data-person]");
    if (person) {
      const card = screens.querySelector(`[data-app="contact"] [data-card]`);
      if (card) card.innerHTML = views.personCard(person.dataset.person);
      return;
    }
    const href = e.target.closest("[data-href]");
    if (href) {
      const url = href.dataset.href;
      if (url.startsWith("mailto:")) { location.href = url; return; }
      open("safari", "Safari");
      const body = screens.querySelector(`[data-app="safari"] .scr-body`);
      body.innerHTML = `<div class="browser"><div class="url">${url}</div><iframe title="Safari" src="${url}"></iframe></div>`;
      return;
    }
    const call = e.target.closest("[data-call]");
    if (call) startCall(call.dataset.call);
    if (e.target.closest("[data-hang]")) hangUp();
  });

  screens.addEventListener("submit", (e) => {
    const form = e.target;
    if (form.matches(".term form")) {
      e.preventDefault();
      const input = form.querySelector("input");
      const raw = input.value.trim();
      input.value = "";
      if (!raw) return;
      log.push("killian@iphone ~ % " + raw);
      const cmd = raw.split(/\s+/)[0];
      const reply = {
        help: "help  whoami  projects  contact  clear",
        whoami: `${p.name} / ${p.en}\n${p.role}`,
        projects: p.projects.map((item) => item.name).join("\n"),
        contact: p.email
      }[cmd];
      if (cmd === "clear") log.length = 0;
      else log.push(reply || "未知命令");
      open("term", "终端");
    }
  });

  let startBar = 0;
  document.querySelector("#gesture-zone").addEventListener("pointerdown", (e) => { startBar = e.clientY; });
  document.querySelector("#gesture-zone").addEventListener("pointerup", (e) => {
    if (startBar - e.clientY > 24) closeTop();
  });

  function startCall(name) {
    open("phone", "电话");
    const root = screens.querySelector(`[data-app="phone"]`);
    const screen = root.querySelector("[data-call-screen]");
    const keypad = root.querySelector("[data-keypad]");
    if (!screen) return;
    screen.hidden = false;
    if (keypad) keypad.hidden = true;
    root.querySelector("[data-call-name]").textContent = name;
    const status = root.querySelector("[data-call-status]");
    status.textContent = "正在呼叫…";
    callRun += 1;
    const run = callRun;
    setTimeout(() => {
      if (run !== callRun) return;
      status.textContent = "已接通";
      const audio = new Audio("audio/学海路.m4a");
      callClip = audio;
      audio.play().catch(() => { status.textContent = "已接通，还没有录音"; });
      audio.addEventListener("ended", () => { if (run === callRun) hangUp(); });
      let seconds = 0;
      const time = root.querySelector("[data-call-time]");
      callClock = setInterval(() => {
        seconds += 1;
        time.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
      }, 1000);
    }, 1600);
  }
  function hangUp() {
    callRun += 1;
    if (callClip) { callClip.pause(); callClip = null; }
    if (callClock) clearInterval(callClock);
    const status = screens.querySelector("[data-call-status]");
    if (status) status.textContent = "已挂断";
  }
})();
