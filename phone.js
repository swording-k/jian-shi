(function () {
  const p = window.SWORD_OS;
  const views = window.SwordViews;
  const icon = window.SwordIcon;
  const apps = [["works", "访达"], ["safari", "Safari"], ["notes", "备忘录"], ["term", "终端"], ["contact", "信息"]];
  const lock = document.querySelector(".lock");
  const home = document.querySelector(".home");
  const sheet = document.querySelector(".sheet");
  const grid = document.querySelector(".grid");
  const dock = document.querySelector(".dock");
  const log = ["killian@iphone ~ % help"];
  let termWired = false;

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

  apps.forEach(([id, title]) => {
    for (const box of [grid, dock]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = `${icon(id)}<span>${title}</span>`;
      btn.addEventListener("click", () => open(id, title));
      box.append(btn);
    }
  });

  const spot = { cat: "", project: "" };
  function finderHtml() {
    if (spot.project) return views.finderProject(spot.project);
    if (spot.cat) return views.finderCat(spot.cat);
    return views.finderRoot();
  }
  function bodyFor(id) {
    if (id === "notes") return views.notes() + views.about();
    if (id === "works") return `<div data-finder-pane>${finderHtml()}</div>`;
    if (id === "safari") return views.safariHome();
    if (id === "contact") return views.contact();
    return `<div class="term"><pre>${log.join("\n")}</pre><form><input aria-label="命令" autocomplete="off"><button type="submit">运行</button></form></div>`;
  }

  function open(id, title) {
    document.querySelector(".sheet-head h1").textContent = title;
    const body = document.querySelector(".sheet-body");
    body.innerHTML = bodyFor(id);
    sheet.classList.remove("hidden");
    if (id === "term" && !termWired) {
      termWired = true;
      body.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = e.target.querySelector("input");
        const raw = input.value.trim();
        input.value = "";
        if (!raw) return;
        log.push("killian@iphone ~ % " + raw);
        const [cmd, ...rest] = raw.split(/\s+/);
        const reply = {
          help: "help  whoami  projects  contact  clear",
          whoami: `${p.name} / ${p.en}\n${p.role}`,
          projects: p.projects.map((item) => item.name).join("\n"),
          contact: p.email,
          clear: ""
        }[cmd];
        if (cmd === "clear") log.length = 0;
        else log.push(reply || "未知命令");
        open("term", "终端");
      });
    }
  }

  document.querySelector(".sheet-head button").addEventListener("click", () => sheet.classList.add("hidden"));
  let startY = 0;
  lock.addEventListener("pointerdown", (e) => { startY = e.clientY; });
  lock.addEventListener("pointerup", (e) => {
    if (startY - e.clientY > 40) {
      lock.classList.add("hidden");
      home.classList.remove("hidden");
    }
  });
})();

  document.querySelector(".sheet-body").addEventListener("click", (e) => {
    const cat = e.target.closest("[data-enter-cat]");
    if (cat) { spot.cat = cat.dataset.enterCat; spot.project = ""; open("works", "访达"); return; }
    const project = e.target.closest("[data-enter-project]");
    if (project) { spot.project = project.dataset.enterProject; open("works", "访达"); return; }
    const up = e.target.closest("[data-finder-up]");
    if (up) { if (spot.project) spot.project = ""; else spot.cat = ""; open("works", "访达"); return; }
    const href = e.target.closest("[data-href]");
    if (!href) return;
    const url = href.dataset.href;
    if (url.startsWith("mailto:")) { window.location.href = url; return; }
    document.querySelector(".sheet-head h1").textContent = "Safari";
    document.querySelector(".sheet-body").innerHTML = `<div class="browser"><div class="url">${url}</div><iframe title="Safari" src="${url}"></iframe></div>`;
    sheet.classList.remove("hidden");
  });
