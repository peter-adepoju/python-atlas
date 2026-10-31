// The tutor: a chat panel that knows which lesson you're on and what your code is doing.
import { h, $, SITE, pageData, escapeHtml } from "./site.js?v=9f26fe5be3";
import { getClient, progress } from "./progress.js?v=9f26fe5be3";
import { settings, onSettings } from "./settings.js?v=9f26fe5be3";

let panel, log, field, pending = null;
const history = [];

function render(md) {
  // Small, safe Markdown: code fences, inline code, bold, paragraphs.
  const parts = String(md).split(/```(?:python|py)?\n?([\s\S]*?)```/g);
  return parts.map((p, i) => i % 2
    ? `<pre><code>${escapeHtml(p.replace(/\n$/, ""))}</code></pre>`
    : escapeHtml(p).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .split(/\n{2,}/).map((x) => x.trim() ? `<p>${x.replace(/\n/g, "<br>")}</p>` : "").join("")).join("");
}

function say(role, text) {
  const m = h("div", { class: "tm tm-" + role });
  m.innerHTML = role === "bot" ? render(text) : escapeHtml(text).replace(/\n/g, "<br>");
  log.append(m);
  log.scrollTop = log.scrollHeight;
  return m;
}

function lessonContext() {
  const d = pageData("day-data");
  return d ? { lesson: `Week ${d.week}, Day ${d.day}: ${d.title}` } : { lesson: document.title };
}

async function send(text, attach) {
  if (!text.trim()) return;
  say("user", text);
  history.push({ role: "user", content: text });
  const thinking = say("sys", "Thinking…");
  const client = await getClient();
  if (!client) {
    thinking.remove();
    say("bot", "The AI tutor isn't switched on for this site yet. Meanwhile, try this: explain your code out loud, one line at a time, to an imaginary friend: say what each line does and what every variable holds. Then press **X-ray** and compare your story with what Python actually did. The line where they disagree is where the bug is.");
    return;
  }
  if (!progress.user()) {
    thinking.remove();
    say("bot", "Please sign in (top right of the page) to use the tutor. Signing in keeps the free service fair for everyone.");
    return;
  }
  const { data, error } = await client.functions.invoke("tutor", {
    body: { messages: history.slice(-12), context: { ...lessonContext(), ...(attach || {}) } },
  });
  thinking.remove();
  if (error || !data || data.error) {
    const msg = (data && data.error) || (error && error.message) || "unknown error";
    say("bot", msg.includes("limit") ? msg : "The tutor couldn't answer just now (" + msg + "). Try again in a minute.");
    return;
  }
  history.push({ role: "assistant", content: data.reply });
  say("bot", data.reply);
}

let tutorFab = null;

export function openTutor(prefill, attach) {
  panel.hidden = false;
  if (tutorFab) tutorFab.setAttribute("aria-expanded", "true");
  if (prefill) { pending = attach || null; field.value = prefill; }
  field.focus();
}

export function mountTutor() {
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20.5l1.4-4.6A7.5 7.5 0 1 1 20 12.5z"/><path d="M10 10.5l-2 2 2 2M14 10.5l2 2-2 2"/></svg>';
  const fab = h("button", { type: "button", class: "tutor-fab", "aria-label": "Ask the tutor", "aria-expanded": "false", onclick: () => openTutor() },
    h("span", { class: "tf-ico", html: ICON }), h("span", { class: "tf-text" }, "Ask the tutor"));
  log = h("div", { class: "tutor-log", "aria-live": "polite" });
  field = h("textarea", { rows: 2, placeholder: "Ask about today's lesson or your code…", "aria-label": "Your question" });
  const form = h("form", { class: "tutor-form", onsubmit: (e) => { e.preventDefault(); const t = field.value; field.value = ""; send(t, pending); pending = null; } },
    field, h("button", { type: "submit", class: "btn btn-check" }, "Send"));
  field.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  const close = () => { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); };
  panel = h("section", { class: "tutor", hidden: true, "aria-label": "Tutor" },
    h("div", { class: "tutor-head" },
      h("div", { class: "th-who" }, h("span", { class: "th-ico", html: ICON }),
        h("div", {}, h("strong", {}, "Your tutor"), h("small", {}, "Hints first, answers only if you ask"))),
      h("button", { type: "button", class: "tutor-x", "aria-label": "Close the tutor", onclick: close,
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' })),
    log, form);
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  tutorFab = fab;
  document.body.append(fab, panel);
  fab.hidden = !settings().tutorButton;
  onSettings((s) => { fab.hidden = !s.tutorButton; });
  say("bot", "Hi! I'm here to help you think, not to think for you. Ask about anything in the lesson, or press **Ask the tutor about this error** under any error. I'll give hints first; ask for more if you're still stuck.");
  document.addEventListener("tutor:ask", (e) => {
    const c = e.detail || {};
    const err = c.error ? `${c.error.type}: ${c.error.message}` : "";
    openTutor(err ? `I got this error and I don't understand why: ${err}` : "Can you help me with this code?",
      { code: c.code, error: c.error ? c.error.traceback : "", output: c.output || "", task: c.task || "" });
  });
}
