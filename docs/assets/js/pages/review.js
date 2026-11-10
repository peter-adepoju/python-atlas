import "./common.js?v=b54d8b61c9";
import { $, h, SITE } from "../site.js?v=b54d8b61c9";
import { progress } from "../progress.js?v=b54d8b61c9";
import { renderQuestion } from "../quiz.js?v=b54d8b61c9";

const cards = await (await fetch(SITE.root + "assets/data/cards.json")).json();
const byId = new Map(cards.map((c) => [c.id, c]));
const DAY = 864e5;

function dueList() {
  return progress.all("srs:").map(([k, v]) => ({ id: k.slice(4), ...v }))
    .filter((c) => byId.has(c.id) && c.due <= Date.now()).sort((a, b) => a.due - b.due);
}
function extraList() {
  // Cards from days the learner has finished, for practice when nothing is due.
  const doneDays = new Set(progress.all("day:").map(([k]) => k.slice(4)));
  const pool = cards.filter((c) => doneDays.has(c.day) || progress.get("srs:" + c.id));
  return pool.sort(() => Math.random() - 0.5).slice(0, 10).map((c) => ({ id: c.id, ...(progress.get("srs:" + c.id) || { interval: 1, ease: 2.5, reps: 0 }) }));
}

/** A simple SM-2-style scheduler: right answers push a card further out, wrong ones bring it back tomorrow. */
function schedule(card, ok) {
  let { interval = 1, ease = 2.5, reps = 0 } = card;
  if (ok) { reps += 1; interval = reps === 1 ? 2 : reps === 2 ? 5 : Math.round(interval * ease); ease = Math.min(3, ease + 0.05); }
  else { reps = 0; interval = 1; ease = Math.max(1.3, ease - 0.2); }
  progress.set("srs:" + card.id, { interval, ease, reps, due: Date.now() + interval * DAY });
  return interval;
}

let queue = dueList();
let practice = false;
let right = 0, seen = 0;

function stats() {
  const all = progress.all("srs:");
  const week = all.filter(([, v]) => v.due <= Date.now() + 7 * DAY).length;
  $("#review-stats").replaceChildren(h("div", { class: "stats" },
    h("div", {}, h("strong", {}, dueList().length), h("span", {}, "due now")),
    h("div", {}, h("strong", {}, week), h("span", {}, "due this week")),
    h("div", {}, h("strong", {}, all.length), h("span", {}, "cards collected")),
    h("div", {}, h("strong", {}, seen ? `${right}/${seen}` : "-"), h("span", {}, "right this session"))));
}

function next() {
  stats();
  const box = $("#review-card"), actions = $("#review-actions");
  actions.replaceChildren();
  if (!queue.length) {
    box.replaceChildren(h("div", { class: "panel" },
      h("p", {}, seen ? `Done: ${right} of ${seen} right. Cards you missed will come back tomorrow.` : progress.all("srs:").length
        ? "Nothing is due right now. Well done, come back tomorrow."
        : "You have no cards yet. Every quiz you finish adds its questions here."),
      !practice && extraList().length ? h("button", { class: "btn btn-step", type: "button", onclick: () => { practice = true; queue = extraList(); next(); } }, "Practise 10 random cards") : ""));
    return;
  }
  const card = queue.shift();
  const q = byId.get(card.id);
  const [dayId] = card.id.split("-");
  const w = +dayId.slice(1, 4), d = +dayId.slice(5);
  box.replaceChildren(h("p", { class: "muted" }, "From ", h("a", { href: `days/${dayId}.html` }, `Week ${w}, Day ${d}`), practice ? " (practice: doesn't change your schedule unless you miss it)" : ""),
    h("div", { class: "panel" }, renderQuestion(q, {
      onAnswer: (ok) => {
        seen++; if (ok) right++;
        if (!practice || !ok) {
          const days = schedule(card, ok);
          actions.replaceChildren(h("p", { class: "muted" }, ok ? `Next time you'll see this in ${days} days.` : "This one comes back tomorrow."));
        }
        progress.activity(1);
        actions.append(h("button", { class: "btn btn-run", type: "button", onclick: next }, queue.length ? "Next card" : "Finish"));
        stats();
      },
    })));
}
next();
