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
    lock.style.transform = "";
    phone.classList.add("is-unlocked");
  }
  document.querySelector("#unlock-btn").addEventListener("click", unlock);
  lock.addEventListener("pointerdown", (e) => {
    if (phone.classList.contains("is-unlocked")) return;
    if (e.target.closest("button") && e.target.id !== "unlock-btn") return;
    lock.setPointerCapture(e.pointerId);
    const start = e.clientY;
    lock.classList.add("dragging");
    const move = (ev) => {
      const dy = Math.max(0, start - ev.clientY);
      lock.style.transform = `translateY(${-dy}px)`;
    };
    const end = (ev) => {
      lock.removeEventListener("pointermove", move);
      lock.removeEventListener("pointerup", end);
      lock.removeEventListener("pointercancel", end);
      lock.classList.remove("dragging");
      const dy = start - ev.clientY;
      if (dy > 64) unlock();
      else lock.style.transform = "";
    };
    lock.addEventListener("pointermove", move);
    lock.addEventListener("pointerup", end);
    lock.addEventListener("pointercancel", end);
  });

  function rows(items) {
    return `<div class="glist">${items.join("")}</div>`;
  }
  function row(attrs, title, meta, lead) {
    return `<button type="button" class="grow" ${attrs}><span class="lead">${lead}</span><span class="col"><b class="fn">${title}</b><span class="fmeta">${meta}</span></span><span class="chev">›</span></button>`;
  }
  function finderHtml() {
    if (spot.project) {
      const item = p.projects.find((row) => row.name === spot.project);
      const links = item.links.map((link) => row(`data-href="${link.href}" data-title="${item.name}"`, link.label, link.href.replace(/^https?:\/\//, ""), "链")).join("");
      return `<p class="lede">${item.blurb}</p>${rows([row('data-finder-up', "返回", item.cat, "返"), links])}`;
    }
    if (spot.cat) {
      const items = p.projects.filter((row) => row.cat === spot.cat).map((item) => row(`data-enter-project="${item.name}"`, item.name, `${item.links.length} 个链接`, item.name.slice(0, 1)));
      return rows([row("data-finder-up", "全部文稿", "返回", "返"), ...items]);
    }
    const cats = ["个人产品", "开源贡献", "黑客松", "内容"];
    return `` + rows(cats.map((cat) => {
      const n = p.projects.filter((item) => item.cat === cat).length;
      return row(`data-enter-cat="${cat}"`, cat, `${n} 项`, "文");
    }));
  }
  function phoneHtml() {
    const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];
    return `<div class="dialer" data-keypad><p class="digits" data-digits></p><div class="keys">${keys.map((key) => `<button type="button" data-key="${key}">${key}</button>`).join("")}</div><button type="button" class="call-go" data-call="${p.name}">呼叫 ${p.name}</button></div>
      <div class="call-screen" data-call-screen hidden>
        <div class="call-orb">${p.name.slice(0,1)}<i></i><i></i><i></i></div>
        <h2 data-call-name>${p.name}</h2>
        <p class="status-text" data-call-status>正在呼叫…</p>
        <p class="timer" data-call-time></p>
        <div class="call-tools"><button type="button" data-mute><span class="ci">静</span>静音</button></div>
        <button type="button" class="call-hang" data-hang aria-label="挂断">↓</button>
      </div>`;
  }
  function bodyFor(id) {
    if (id === "notes") return `` + rows(p.notes.map((note) => `<div class="grow"><span class="col"><b class="fn">${note.title}</b><span class="fmeta">${note.body}</span></span></div>`));
    if (id === "works") return finderHtml();
    if (id === "safari") return `` + rows(p.bookmarks.map((item) => row(`data-href="${item.href}" data-title="${item.name}"`, item.name, item.note, "网")));
    if (id === "contact") return `` + rows([
      row('data-person="me"', p.name, p.role, p.name.slice(0,1)),
      ...p.links.map((item, i) => row(`data-person="link-${i}"`, item.name, "账号", item.name.slice(0,1)))
    ]) + `<div data-card></div>`;
    if (id === "mail") return `<div class="mail-list"><button type="button" class="mail-row" data-mail="0"><b>欢迎来到这台手机</b><span>系统 · 刚刚</span></button></div><article class="mail-read"><h2>欢迎来到这台手机</h2><p>这不是一条往下滚的个人网站。作品在访达里，打电话会接通你自己录的那段声音。</p></article>`;
    if (id === "phone") return phoneHtml();
    return `<div class="term"><pre>${log.join("\n")}</pre><form><span class="prompt">%</span><input aria-label="命令" autocomplete="off"></form></div>`;
  }

  function screenFor(id) {
    let scr = screens.querySelector(`[data-app="${id}"]`);
    if (scr) return scr;
    scr = document.createElement("section");
    scr.className = "scr" + (id === "phone" ? " phone-app" : id === "term" ? " term-app" : "");
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
      const who = views.directory().find((item) => item.id === person.dataset.person);
      if (card && who) {
        card.innerHTML = `<div class="glist" style="margin-top:16px"><div class="grow"><span class="col"><b class="fn">${who.name}</b><span class="fmeta">${who.role}</span></span></div></div><div class="chips" style="padding:16px">${who.call ? `<button type="button" class="call-go" data-call="${who.name}">打电话</button>` : ""}${who.email ? `<button type="button" data-compose-to="${who.email}">发邮件</button>` : ""}${who.href && !who.href.startsWith("mailto:") ? `<button type="button" data-href="${who.href}" data-title="${who.name}">打开</button>` : ""}</div><p class="lede">${who.blurb}</p>`;
      }
      return;
    }
    const key = e.target.closest("[data-key]");
    if (key) {
      const out = key.closest(".dialer").querySelector("[data-digits]");
      out.textContent = (out.textContent + key.dataset.key).slice(-16);
      return;
    }
    const mute = e.target.closest("[data-mute]");
    if (mute) { mute.classList.toggle("on"); return; }
    const href = e.target.closest("[data-href]");
    if (href) {
      const url = href.dataset.href;
      if (url.startsWith("mailto:")) { location.href = url; return; }
      open("safari", "Safari");
      const body = screens.querySelector(`[data-app="safari"] .scr-body`);
      body.classList.add("fill");
      body.innerHTML = `<div class="browser-view"><div class="browser-bar"><div class="url">${url}</div></div><iframe title="页面" src="${url}"></iframe></div>`;
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

  const zone = document.querySelector("#gesture-zone");
  zone.addEventListener("pointerdown", (e) => {
    zone.setPointerCapture(e.pointerId);
    const start = e.clientY;
    const end = (ev) => {
      zone.removeEventListener("pointerup", end);
      zone.removeEventListener("pointercancel", end);
      const dy = start - ev.clientY;
      if (dy < 28) return;
      if (!phone.classList.contains("is-unlocked")) unlock();
      else closeTop();
    };
    zone.addEventListener("pointerup", end);
    zone.addEventListener("pointercancel", end);
  });

  function startCall(name) {
    open("phone", "电话");
    const root = screens.querySelector(`[data-app="phone"]`);
    const screen = root.querySelector("[data-call-screen]");
    const keypad = root.querySelector("[data-keypad]");
    if (!screen) return;
    root.appendChild(screen);
    screen.hidden = false;
    screen.classList.add("show");
    screen.classList.remove("connected", "ended");
    if (keypad) keypad.hidden = true;
    root.querySelector("[data-call-name]").textContent = name;
    const status = root.querySelector("[data-call-status]");
    status.textContent = "正在呼叫…";
    callRun += 1;
    const run = callRun;
    const audio = new Audio("audio/" + encodeURIComponent("学海路") + ".m4a");
    audio.setAttribute("playsinline", "");
    audio.preload = "auto";
    callClip = audio;
    const begin = () => {
      if (run !== callRun) return;
      status.textContent = "通话中";
      screen.classList.add("connected");
      audio.play().then(() => {
        if (!callClock) {
          let seconds = 0;
          const time = root.querySelector("[data-call-time]");
          callClock = setInterval(() => {
            seconds += 1;
            if (time) time.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
          }, 1000);
        }
      }).catch(() => { status.textContent = "点一下屏幕出声"; });
    };
    audio.addEventListener("ended", () => { if (run === callRun) hangUp(); });
    screen.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-hang], [data-mute]")) return;
      if (status.textContent === "点一下屏幕出声") begin();
    });
    setTimeout(begin, 700);
  }
  function hangUp() {
    callRun += 1;
    if (callClip) { callClip.pause(); callClip = null; }
    if (callClock) clearInterval(callClock);
    const status = screens.querySelector("[data-call-status]");
    if (status) status.textContent = "已挂断";
    const screen = screens.querySelector("[data-call-screen]");
    if (screen) { screen.classList.add("ended"); screen.classList.remove("show"); }
    setTimeout(() => {
      if (!screen) return;
      screen.hidden = true;
      screen.classList.remove("show");
      const keypad = screens.querySelector("[data-keypad]");
      if (keypad) keypad.hidden = false;
    }, 700);
  }
})();
