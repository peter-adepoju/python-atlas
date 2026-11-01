// Search the whole course: lessons (titles, sections and goals), weeks on the map, and pages.
// Opens with the header's search box, Ctrl K (Cmd K on a Mac) or the / key.
import { h, SITE } from "./site.js?v=588dc67651";
import { progress } from "./progress.js?v=588dc67651";

const PAGES = [
  { k: "page", u: "map.html", t: "Course map", s: ["all 104 weeks, phase by phase"] },
  { k: "page", u: "review.html", t: "Daily review", s: ["quiz cards due today, spaced repetition"] },
  { k: "page", u: "playground.html", t: "Playground", s: ["write and run your own Python, X-ray"] },
  { k: "page", u: "guide.html", t: "How this course works", s: ["the plan, pace, how to learn"] },
  { k: "page", u: "settings.html", t: "Settings", s: ["theme, dark mode, text size, code size, tutor button"] },
  { k: "page", u: "account.html", t: "Your account", s: ["sign in, profile, progress, sync"] },
  { k: "page", u: "privacy.html", t: "Privacy", s: ["what is stored, delete your data"] },
];

let items = null, dlg, input, list, hits = [], on = 0, lastFocus = null;

async function load() {
  if (items) return items;
  try {
    const r = await fetch(SITE.root + "assets/data/search.json?v=" + SITE.version);
    items = (await r.json()).concat(PAGES);
  } catch { items = PAGES.slice(); }
  return items;
}

const norm = (t) => String(t).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function score(item, words) {
  const title = norm(item.t), week = norm(item.wt || ""), rest = norm([...(item.s || []), ...(item.g || [])].join(" | "));
  let total = 0;
  for (const w of words) {
    if (/^(w|week)?\d+$/.test(w) && item.w === +w.replace(/\D/g, "")) { total += 6; continue; }
    if (title.includes(w)) total += title.startsWith(w) || title.includes(" " + w) ? 10 : 7;
    else if (week.includes(w)) total += 4;
    else if (rest.includes(w)) total += 2;
    else return 0;
  }
  return total + (item.k === "day" ? 1 : item.k === "page" ? 0.5 : 0);
}

function mark(text, words) {
  let out = h("span", {});
  const lower = norm(text);
  let i = 0;
  const ranges = [];
  for (const w of words) { const j = lower.indexOf(w); if (j >= 0) ranges.push([j, j + w.length]); }
  ranges.sort((a, b) => a[0] - b[0]);
  for (const [a, b] of ranges) {
    if (a < i) continue;
    out.append(text.slice(i, a), h("mark", {}, text.slice(a, b)));
    i = b;
  }
  out.append(text.slice(i));
  return out;
}

function snippet(item, words) {
  const pool = [...(item.s || []), ...(item.g || [])];
  const hit = pool.find((x) => words.some((w) => norm(x).includes(w)));
  return hit || pool[0] || "";
}

function render() {
  const q = norm(input.value.trim());
  const words = q.split(/\s+/).filter(Boolean);
  list.replaceChildren();
  if (!words.length) {
    const last = progress.get("last:day");
    const sug = [];
    if (last) { const d = items.find((x) => x.id === last.id); if (d) sug.push(d); }
    sug.push(...PAGES.slice(0, 4));
    hits = sug;
    list.append(h("div", { class: "search-group" }, last ? "Continue, or go to" : "Go to"));
  } else {
    const RANK = { day: 0, week: 1, page: 2 };
    hits = items.map((x) => [score(x, words), x]).filter(([s]) => s > 0)
      .sort((a, b) => RANK[a[1].k] - RANK[b[1].k] || b[0] - a[0] || (a[1].w || 0) - (b[1].w || 0))
      .slice(0, 40).map(([, x]) => x);
    if (!hits.length) { list.append(h("p", { class: "search-empty" }, `Nothing matches "${input.value.trim()}". Try one word, like "loops" or "dictionary".`)); return; }
  }
  on = 0;
  let group = null;
  hits.forEach((x, i) => {
    const g = words.length ? { day: "Lessons", week: "Weeks on the course map", page: "Pages" }[x.k] : null;
    if (g && g !== group) { group = g; list.append(h("div", { class: "search-group" }, g)); }
    const where = x.k === "day" ? `Week ${x.w}, Day ${x.d}` : x.k === "week" ? `Week ${x.w}` : "";
    const done = x.k === "day" && progress.get("day:" + x.id);
    const a = h("a", { class: "search-hit" + (done ? " is-done" : ""), href: SITE.root + x.u, "data-i": i, onmousemove: () => select(i) },
      h("span", { class: "sh-t" }, mark(x.t, words)),
      h("span", { class: "sh-s" }, mark(snippet(x, words), words)),
      h("span", { class: "sh-w" }, where));
    list.append(a);
  });
  select(0);
}

function select(i) {
  const els = list.querySelectorAll(".search-hit");
  if (!els.length) return;
  on = (i + els.length) % els.length;
  els.forEach((e, j) => e.classList.toggle("is-on", j === on));
  els[on].scrollIntoView({ block: "nearest" });
}

export async function openSearch() {
  if (!dlg) build();
  lastFocus = document.activeElement;
  dlg.hidden = false;
  document.body.style.overflow = "hidden";
  input.value = "";
  input.focus();
  await load();
  render();
}

function close() {
  dlg.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

function build() {
  input = h("input", { type: "search", placeholder: "Search lessons, topics and pages…", "aria-label": "Search", autocomplete: "off", spellcheck: "false" });
  list = h("div", { class: "search-results", role: "listbox" });
  const box = h("div", { class: "search-box", role: "dialog", "aria-modal": "true", "aria-label": "Search the course" },
    h("div", { class: "search-field", html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="ico"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' }, input,
      h("kbd", { class: "kbd" }, "Esc")),
    list,
    h("div", { class: "search-foot" }, h("span", {}, h("kbd", { class: "kbd" }, "↑"), " ", h("kbd", { class: "kbd" }, "↓"), " to move"),
      h("span", {}, h("kbd", { class: "kbd" }, "Enter"), " to open"), h("span", {}, h("kbd", { class: "kbd" }, "Esc"), " to close")));
  dlg = h("div", { class: "search-dlg", hidden: true, onclick: (e) => { if (e.target === dlg) close(); } }, box);
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(on + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(on - 1); }
    else if (e.key === "Enter") { const a = list.querySelectorAll(".search-hit")[on]; if (a) { e.preventDefault(); location.href = a.href; } }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  });
  document.body.append(dlg);
}

export function initSearch() {
  const btn = document.getElementById("search-open");
  if (btn) btn.addEventListener("click", openSearch);
  const kbd = document.querySelector(".search-kbd");
  if (kbd && /Mac|iPhone|iPad/.test(navigator.platform)) kbd.textContent = "⌘ K";
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); openSearch(); }
  });
}
