import "./common.js?v=5b063fa476";
import { $, $$, h, pageData, toast } from "../site.js?v=5b063fa476";
import { mountConsoles } from "../console.js?v=5b063fa476";
import { mountQuizzes, mountParsons } from "../quiz.js?v=5b063fa476";
import { mountWidgets } from "../widgets/index.js?v=5b063fa476";
import { progress } from "../progress.js?v=5b063fa476";
import { ensure } from "../runtime.js?v=5b063fa476";

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
  };
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

  $("#mark-done").addEventListener("click", () => {
    const ex = data.exercises;
    const solved = ex.filter((x) => (progress.get("ex:" + x.id) || {}).solved).length;
    if (solved < Math.ceil(ex.length * 0.7) && !confirm(`You've solved ${solved} of ${ex.length} exercises. Practice is where the learning happens. Mark the day complete anyway?`)) return;
    progress.set("day:" + data.id, { done: true, at: Date.now() });
    progress.activity(5);
    toast("Day complete. See you tomorrow. Rest counts too.", "ok");
  });
}

if (window.CodeMirror) start();
else addEventListener("load", start);
