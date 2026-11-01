import "./common.js?v=871ff52039";
import { $, h, pageData, reducedMotion, SITE } from "../site.js?v=871ff52039";
import { progress } from "../progress.js?v=871ff52039";
import { loadCourse, nextDay } from "../resume.js?v=871ff52039";

// ---------- hero: a recorded trace replayed with the yellow pointer
const trace = pageData("hero-trace");
const codeEl = $("#demo-code");
const lines = trace.code.split("\n");
codeEl.replaceChildren(...lines.map((l, i) => h("div", { class: "demo-line", "data-n": i + 1 }, h("span", { class: "demo-num" }, i + 1), h("span", {}, l || " "))));
let step = 0;
function show() {
  const s = trace.steps[step];
  codeEl.querySelectorAll(".demo-line").forEach((el) => {
    const n = +el.dataset.n;
    el.classList.toggle("is-next", n === s.line);
  });
  const vars = $("#demo-vars");
  vars.replaceChildren(...s.vars.map(([k, v, changed]) => h("div", { class: "demo-var" + (changed ? " is-new" : "") }, h("span", {}, k), h("code", {}, v))));
  $("#demo-out").textContent = s.out || " ";
}
show();
if (!reducedMotion()) {
  setInterval(() => { step = (step + 1) % trace.steps.length; show(); }, 1100);
} else {
  step = trace.steps.length - 1; show();
}

// ---------- road
loadCourse().then((course) => {
  const road = $("#road");
  for (const p of course.phases) {
    const weeks = course.weeks.filter((w) => w.phase === p.id);
    const first = weeks[0].week, last = weeks[weeks.length - 1].week;
    road.append(h("li", {}, h("div", { class: "road-weeks" }, `Weeks ${first}–${last}`), h("div", {}, h("strong", {}, p.title), h("p", {}, p.summary))));
  }
  // ---------- continue button and today panel
  const flat = course.weeks.flatMap((w) => w.days.map((d) => ({ ...d, week: w.week })));
  const done = flat.filter((d) => progress.get("day:" + d.id));
  const last = progress.get("last:day");
  const go = $("#continue");
  if (done.length || last) {
    const target = nextDay(course);
    if (target) { go.textContent = `Continue: Week ${target.week}, Day ${target.day}`; go.href = `days/${target.id}.html`; }
    $("#today").hidden = false;
    const hours = done.length * 3;
    $("#today-text").textContent = `${done.length} of ${flat.length} days complete (about ${hours} hours of practice). Streak: ${progress.streak()} day${progress.streak() === 1 ? "" : "s"}.`;
    const due = progress.all("srs:").filter(([, v]) => v.due <= Date.now()).length;
    $("#review-text").textContent = due ? `${due} card${due === 1 ? "" : "s"} ready for review. It takes about ${Math.max(2, Math.round(due * 0.5))} minutes.` : "Nothing due right now. Cards come back as you finish quizzes.";
    $("#review-go").textContent = due ? "Start review" : "Practise anyway";
    // heatmap: 26 weeks
    const heat = $("#heat");
    const act = new Map(progress.all("act:").map(([k, v]) => [k.slice(4), v.pts]));
    const d0 = new Date(); d0.setDate(d0.getDate() - 7 * 26 + 1);
    for (let i = 0; i < 7 * 26; i++) {
      const d = new Date(d0); d.setDate(d0.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const pts = act.get(k) || 0;
      heat.append(h("span", { class: "heat-cell", "data-l": pts === 0 ? 0 : pts < 10 ? 1 : pts < 40 ? 2 : 3, title: `${k}: ${pts} points` }));
    }
  }
});
