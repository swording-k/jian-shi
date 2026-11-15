(function () {
  const p = window.SWORD_OS;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const cats = ["个人产品", "开源贡献", "黑客松", "内容"];

  function about() {
    return `<p class="lede">${esc(p.line)}</p><p>${esc(p.bio)}</p>
      <dl class="facts">
        <div><dt>名字</dt><dd>${esc(p.name)} · ${esc(p.alias)}</dd></div>
        <div><dt>英文</dt><dd>${esc(p.en)}</dd></div>
        <div><dt>学校</dt><dd>${esc(p.school)}</dd></div>
        <div><dt>在做</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>邮箱</dt><dd><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></dd></div>
      </dl>`;
  }

  function notes() {
    return `<div class="notes">${p.notes.map((note) => `<article class="note"><h3>${esc(note.title)}</h3><p>${esc(note.body)}</p></article>`).join("")}</div>`;
  }

  function contact() {
    const links = p.links.map((item) => `<button type="button" class="chip" data-href="${esc(item.href)}" data-title="${esc(item.name)}">${esc(item.name)}</button>`).join("");
    return `<div class="contact">
      <div><p class="lede">社交账号都从这里进 Safari。</p><div class="chips">${links}</div><p class="fine">${esc(p.school)}</p></div>
      <figure><img src="${esc(p.wechatQr)}" alt="微信公众号二维码"><figcaption>微信公众号</figcaption></figure>
    </div>`;
  }

  function thumb(item) {
    if (item.icon) return `<img src="${esc(item.icon)}" alt="">`;
    return `<b class="file-badge">${esc(item.name.slice(0, 1))}</b>`;
  }

  function finderRoot() {
    return `<div class="crumbs">文稿</div><div class="filegrid">${cats.map((cat) => {
      const n = p.projects.filter((item) => item.cat === cat).length;
      return `<button type="button" class="file" data-enter-cat="${esc(cat)}"><i class="folder"></i><b>${esc(cat)}</b><small>${n} 项</small></button>`;
    }).join("")}</div>`;
  }

  function finderCat(cat) {
    const items = p.projects.filter((item) => item.cat === cat);
    return `<div class="crumbs"><button type="button" data-finder-up>文稿</button><span>${esc(cat)}</span></div>
      <div class="filegrid">${items.map((item) => `<button type="button" class="file" data-enter-project="${esc(item.name)}">${thumb(item)}<b>${esc(item.name)}</b><small>${item.links.length} 个链接</small></button>`).join("")}</div>`;
  }

  function finderProject(name) {
    const item = p.projects.find((row) => row.name === name);
    if (!item) return `<p>没有这个项目</p>`;
    return `<div class="crumbs"><button type="button" data-finder-up="${esc(item.cat)}">${esc(item.cat)}</button><span>${esc(item.name)}</span></div>
      <article class="project">
        ${thumb(item)}
        <div><h3>${esc(item.name)}</h3><p>${esc(item.blurb)}</p>
          <div class="chips">${item.links.map((link) => `<button type="button" class="chip" data-href="${esc(link.href)}" data-title="${esc(item.name)}">${esc(link.label)}</button>`).join("")}</div>
        </div>
      </article>`;
  }

  function safariHome() {
    return `<div class="start"><p class="lede">书签</p><ul class="marks">${p.bookmarks.map((item) => `
      <li><button type="button" data-href="${esc(item.href)}" data-title="${esc(item.name)}"><b>${esc(item.name)}</b><span>${esc(item.note)}</span></button></li>`).join("")}</ul></div>`;
  }


  function directory() {
    return [
      { id: "me", name: p.name, role: p.alias + " · " + p.role, blurb: p.bio, email: p.email, call: true },
      ...p.links.map((item, index) => ({
        id: "link-" + index,
        name: item.name,
        role: "账号",
        blurb: item.href,
        href: item.href,
        email: item.href.startsWith("mailto:") ? p.email : ""
      }))
    ];
  }

  function contacts() {
    const rows = directory();
    return `<div class="addr"><aside>${rows.map((row, i) => `<button type="button" data-person="${esc(row.id)}" class="${i === 0 ? "on" : ""}"><b>${esc(row.name.slice(0, 1))}</b><span>${esc(row.name)}</span></button>`).join("")}</aside><div class="addr-card" data-card></div></div>`;
  }

  function personCard(id) {
    const row = directory().find((item) => item.id === id) || directory()[0];
    const actions = [
      row.call ? `<button type="button" data-call="${esc(row.name)}">打电话</button>` : "",
      row.email ? `<button type="button" data-compose-to="${esc(row.email)}">发邮件</button>` : "",
      row.href && !row.href.startsWith("mailto:") ? `<button type="button" data-href="${esc(row.href)}" data-title="${esc(row.name)}">在 Safari 打开</button>` : ""
    ].join("");
    return `<div class="who"><div class="orb">${esc(row.name.slice(0, 1))}</div><h3>${esc(row.name)}</h3><p>${esc(row.role)}</p><p class="fine">${esc(row.blurb)}</p><div class="chips">${actions}</div>${row.id === "me" ? `<figure><img src="${esc(p.wechatQr)}" alt="微信公众号二维码"><figcaption>微信公众号</figcaption></figure>` : ""}</div>`;
  }

  function mail() {
    return `<div class="mailapp"><aside><button type="button" data-box="in" class="on">收件箱</button><button type="button" data-box="sent">已发送</button><button type="button" data-compose>写邮件</button></aside><div class="mail-list" data-mail-list></div><div class="mail-main"><form class="compose" data-compose-form hidden><label>收件人<input name="to" value="${esc(p.email)}"></label><label>主题<input name="subject"></label><textarea name="body" placeholder="写点什么"></textarea><button type="submit">发送</button></form><article data-mail-read></article></div></div>`;
  }

  function phone() {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    return `<div class="dialer"><div class="call-screen" data-call-screen hidden><div class="orb">剑</div><h3 data-call-name>${esc(p.name)}</h3><p data-call-status>正在呼叫…</p><p data-call-time></p><div class="call-actions"><button type="button" data-mute>静音</button><button type="button" class="hang" data-hang>挂断</button></div></div><div data-keypad><p class="lede">电话</p><div class="keys">${keys.map((key) => `<button type="button" data-key="${key}">${key}</button>`).join("")}</div><p data-digits></p><button type="button" class="call-go" data-call="${esc(p.name)}">呼叫 ${esc(p.name)}</button></div></div>`;
  }

  window.SwordViews = { about, notes, contact, contacts, personCard, mail, phone, safariHome, finderRoot, finderCat, finderProject, esc, cats, directory };
})();
