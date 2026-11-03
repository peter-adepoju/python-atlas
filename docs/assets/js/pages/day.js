import "./common.js?v=7343aa5d1b";
import { $, $$, h, pageData, toast } from "../site.js?v=7343aa5d1b";
import { mountConsoles } from "../console.js?v=7343aa5d1b";
import { mountQuizzes, mountParsons } from "../quiz.js?v=7343aa5d1b";
import { mountWidgets } from "../widgets/index.js?v=7343aa5d1b";
import { progress, saveNow } from "../progress.js?v=7343aa5d1b";
import { ensure } from "../runtime.js?v=7343aa5d1b";

const data = pageData("day-data");

function start() {
  mountConsoles();
  mountQuizzes();
  mountParsons();
  mountWidgets();
  // Start Python in the background so the first Run is quick.
  setTimeout(() => ensure().catch(() => {}), 400);
  progress.set("last:day", { id: data.id });

  // Highlight the section being read in the outline.
  const links = $$(".rail-toc a");
  const heads = links.map((a) => document.getElementById(a.dataset.sec)).filter(Boolean);
  // Phones: a slim bar under the header shows where you are, and opens the outline as a sheet.
  const barWhere = h("span", { class: "lb-where" }, `Week ${data.week}, Day ${data.day}`);
  const barFill = h("span", { class: "lb-fill" });
  const toggleToc = (open) => {
    document.body.classList.toggle("toc-open", open);
    lessonBar.setAttribute("aria-expanded", String(open));
  };
  const lessonBar = h("button", { type: "button", class: "lesson-bar", "aria-expanded": "false", onclick: () => toggleToc(!document.body.classList.contains("toc-open")) },
    h("span", { class: "lb-ico", html: '<svg viewBox="0 0 24 24" width="18" height="18" class="ico" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>' }),
    barWhere, h("span", { class: "lb-more" }, "Contents"), h("span", { class: "lb-track" }, barFill));
  const backdrop = h("div", { class: "toc-backdrop", onclick: () => toggleToc(false) });
  const rail = $(".day-rail");
  rail.prepend(h("div", { class: "sheet-grip toc-grip", "aria-hidden": "true" }));
  $(".day").prepend(lessonBar);
  document.body.append(backdrop);
  links.forEach((a) => a.addEventListener("click", () => toggleToc(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") toggleToc(false); });

  const onScroll = () => {
    let cur = heads[0];
    for (const hd of heads) if (hd.getBoundingClientRect().top < 140) cur = hd;
    links.forEach((a) => a.classList.toggle("is-here", cur && a.dataset.sec === cur.id));
    const here = links.find((a) => cur && a.dataset.sec === cur.id);
    barWhere.textContent = here && window.scrollY > 300 ? here.textContent : `Week ${data.week}, Day ${data.day}`;
    if (cur && window.scrollY > 300 && cur.id !== lastSec) {
      lastSec = cur.id;
      clearTimeout(posTimer);
      posTimer = setTimeout(() => progress.set("pos:" + data.id, { sec: cur.id, at: Date.now() }), 1500);
    }
  };
  let lastSec = (progress.get("pos:" + data.id) || {}).sec;
  let posTimer = null;
  welcomeBack(heads, links);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const meter = () => {
    const ex = data.exercises;
    const solved = ex.filter((x) => (progress.get("ex:" + x.id) || {}).solved).length;
    const pct = ex.length ? Math.round((solved / ex.length) * 100) : 0;
    $("#day-meter").style.width = pct + "%";
    barFill.style.width = pct + "%";
    $("#day-meter-label").textContent = `${solved} of ${ex.length} exercises solved`;
    // A section is done when all exercises inside it are solved.
    heads.forEach((hd, i) => {
      const end = heads[i + 1];
      const inSec = $$(".pc-exercise").filter((p) => (hd.compareDocumentPosition(p) & 4) && (!end || (end.compareDocumentPosition(p) & 2)));
      const done = inSec.length && inSec.every((p) => (progress.get("ex:" + p.dataset.id) || {}).solved);
      links[i] && links[i].classList.toggle("is-done", !!done);
    });
    const btn = $("#mark-done");
    if (progress.get("day:" + data.id)) { btn.textContent = "Day complete ✓"; btn.classList.add("is-done"); }
  };
  meter();
  progress.subscribe(meter);

  const saveBtn = $("#save-progress");
  if (saveBtn) saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    const where = await saveNow().catch(() => "device");
    saveBtn.disabled = false;
    toast(where === "account"
      ? "Progress saved to your account. Come back any time and carry on from here."
      : progress.user()
        ? "Progress saved on this device. It will reach your account when you're back online."
        : "Progress saved on this device. Come back any time and carry on from here. Sign in to keep it on every device.", "ok");
  });

  $("#mark-done").addEventListener("click", () => {
    const ex = data.exercises;
    const solved = ex.filter((x) => (progress.get("ex:" + x.id) || {}).solved).length;
    if (solved < Math.ceil(ex.length * 0.7) && !confirm(`You've solved ${solved} of ${ex.length} exercises. Practice is where the learning happens. Mark the day complete anyway?`)) return;
    progress.set("day:" + data.id, { done: true, at: Date.now() });
    progress.activity(5);
    toast("Day complete. See you tomorrow. Rest counts too.", "ok");
  });
}

// Coming back to a lesson part-way through: say what's done and offer to carry on.
function welcomeBack(heads, links) {
  if (progress.get("day:" + data.id)) return;
  const ex = data.exercises;
  const solved = ex.filter((x) => (progress.get("ex:" + x.id) || {}).solved).length;
  const pos = progress.get("pos:" + data.id);
  if (!solved && !pos) return;
  const solvedIds = new Set(ex.filter((x) => (progress.get("ex:" + x.id) || {}).solved).map((x) => x.id));
  const nextEx = ex.find((x) => !solvedIds.has(x.id));
  const nextEl = nextEx && document.querySelector(`.pc-exercise[data-id="${CSS.escape(nextEx.id)}"]`);
  const secEl = pos && document.getElementById(pos.sec);
  const secName = secEl && (links.find((a) => a.dataset.sec === pos.sec) || {}).textContent;
  const go = (target) => () => { box.remove(); target.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const actions = [];
  if (nextEl && solved) actions.push(h("button", { type: "button", class: "btn btn-run", onclick: go(nextEl) }, `Continue with "${nextEx.title}"`));
  if (secEl && secName) actions.push(h("button", { type: "button", class: solved ? "btn btn-quiet" : "btn btn-run", onclick: go(secEl) }, `Go back to "${secName}"`));
  if (!actions.length) return;
  actions.push(h("button", { type: "button", class: "btn btn-quiet", onclick: () => box.remove() }, "Start from the top"));
  const said = solved
    ? `Welcome back. You've solved ${solved} of ${ex.length} exercises today, and everything you typed is still here.`
    : "Welcome back. Everything you did here last time is still saved.";
  const box = h("div", { class: "welcome-back", role: "status" }, h("p", {}, said), h("div", { class: "wb-actions" }, ...actions));
  $(".day-body").prepend(box);
}

if (window.CodeMirror) start();
else addEventListener("load", start);
