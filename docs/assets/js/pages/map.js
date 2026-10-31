import "./common.js?v=9f26fe5be3";
import { $, h, SITE } from "../site.js?v=9f26fe5be3";
import { progress } from "../progress.js?v=9f26fe5be3";

const course = await (await fetch(SITE.root + "assets/data/course.json")).json();
const built = new Set(course.built);
const all = course.weeks.flatMap((w) => w.days);
const isDone = (d) => !!progress.get("day:" + d.id);
const done = all.filter(isDone).length;
const ready = all.filter((d) => built.has(d.id)).length;
$("#map-summary").replaceChildren(
  h("div", { class: "stats" },
    h("div", {}, h("strong", {}, done), h("span", {}, "days complete")),
    h("div", {}, h("strong", {}, `${Math.round((done / all.length) * 1000) / 10}%`), h("span", {}, "of the course")),
    h("div", {}, h("strong", {}, done * 3), h("span", {}, "hours practised")),
    h("div", {}, h("strong", {}, ready), h("span", {}, "days ready to study"))));

// The "being written" key only appears while some days are still unwritten.
if (ready === all.length) document.querySelector(".mk-soon").parentElement.remove();

// Open the phase the learner is working on (the first one with a day left to do).
const nextDay = all.find((d) => built.has(d.id) && !isDone(d)) || all[0];
const nextWeek = course.weeks.find((w) => w.days.some((d) => d.id === nextDay.id));
const target = location.hash.startsWith("#week-") ? +location.hash.slice(6) : nextWeek.week;

const root = $("#phases");
for (const p of course.phases) {
  const weeks = course.weeks.filter((w) => w.phase === p.id);
  const days = weeks.flatMap((w) => w.days);
  const pDone = days.filter(isDone).length;
  const open = weeks.some((w) => w.week === target) || location.hash === "#phase-" + p.id;
  const list = h("ol", { class: "weeks" });
  for (const w of weeks) {
    const li = h("li", { class: "week" + (w.rest ? " is-rest" : ""), id: "week-" + w.week },
      h("div", { class: "week-t" }, h("span", { class: "week-n" }, `Week ${w.week}`), h("span", {}, w.title),
        w.rest ? "" : h("span", { class: "week-meta" }, `${w.days.length} days · about ${w.days.length * 3} h` + (w.days.some(isDone) ? ` · ${w.days.filter(isDone).length} done` : ""))));
    if (w.rest) { li.append(h("p", { class: "muted week-rest" }, "No lessons. Rest, revisit anything shaky, or build something for fun.")); list.append(li); continue; }
    const row = h("ol", { class: "days" });
    for (const d of w.days) {
      const isReady = built.has(d.id);
      const cls = "day-chip" + (isDone(d) ? " is-done" : isReady ? " is-open" : " is-soon") + (d.forge ? " is-forge" : "");
      const head = h("span", { class: "day-n" }, `Day ${d.day}`, d.forge && d.title !== "Forge" ? h("span", { class: "forge-tag" }, "Forge") : "");
      const inner = [head, h("span", { class: "day-t" }, d.title)];
      row.append(h("li", {}, isReady ? h("a", { class: cls, href: `days/${d.id}.html` }, ...inner) : h("span", { class: cls }, ...inner)));
    }
    li.append(row);
    list.append(li);
  }
  root.append(h("details", { class: "phase", id: "phase-" + p.id, open },
    h("summary", {},
      h("span", { class: "phase-t" }, `Phase ${p.id}: ${p.title}`),
      h("span", { class: "phase-meta" }, `Weeks ${weeks[0].week} to ${weeks[weeks.length - 1].week}`, h("span", {}, `${pDone} of ${days.length} days`))),
    h("p", { class: "muted phase-sum" }, p.summary),
    list));
}
if (location.hash.startsWith("#phase-")) document.querySelector(location.hash)?.scrollIntoView({ block: "start" });
else document.getElementById("week-" + target)?.scrollIntoView({ block: "start" });
if (!location.hash) scrollTo(0, 0);
