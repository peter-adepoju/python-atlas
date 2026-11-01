// Quizzes and Parsons puzzles.
import { h, $, $$ } from "./site.js?v=8fe38f9496";
import { progress } from "./progress.js?v=8fe38f9496";
import { makeEditor } from "./editor.js?v=8fe38f9496";

const clean = (s) => String(s).trim().replace(/\s+/g, " ").toLowerCase();
const normOut = (s) => String(s).split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

export function renderQuestion(q, { onAnswer } = {}) {
  const box = h("div", { class: "q" });
  box.append(h("div", { class: "q-text", html: q.q }));
  if (q.code) {
    const cw = h("div", { class: "q-code" });
    box.append(cw);
    makeEditor(cw, q.code, { readOnly: true, minLines: 1 });
  }
  let read;
  if (q.type === "mc" || q.type === "multi") {
    const name = "q" + Math.random().toString(36).slice(2);
    const opts = q.options.map((o, i) => {
      const input = h("input", { type: q.type === "mc" ? "radio" : "checkbox", name, value: i });
      return h("label", { class: "q-opt" }, input, h("span", { html: o }));
    });
    box.append(h("div", { class: "q-opts", role: q.type === "mc" ? "radiogroup" : "group" }, opts));
    read = () => {
      const picked = $$("input", box).filter((x) => x.checked).map((x) => +x.value);
      if (!picked.length) return null;
      const want = [].concat(q.answer).map(Number).sort();
      return { ok: JSON.stringify(picked.sort()) === JSON.stringify(want), picked };
    };
  } else {
    const multiline = q.type === "output";
    const field = multiline
      ? h("textarea", { class: "q-field", rows: 3, spellcheck: "false", "aria-label": "Your answer" })
      : h("input", { class: "q-field", type: "text", spellcheck: "false", autocomplete: "off", "aria-label": "Your answer" });
    box.append(field);
    read = () => {
      const v = field.value;
      if (!v.trim()) return null;
      const answers = [].concat(q.answer).map(String);
      const ok = multiline ? answers.some((a) => normOut(a) === normOut(v)) : answers.some((a) => clean(a) === clean(v));
      return { ok };
    };
  }
  const fb = h("div", { class: "q-fb", "aria-live": "polite" });
  const btn = h("button", { type: "button", class: "btn btn-check" }, "Check");
  btn.addEventListener("click", () => {
    const r = read();
    if (!r) { fb.textContent = "Choose or type an answer first."; return; }
    box.classList.remove("is-ok", "is-no");
    box.classList.add(r.ok ? "is-ok" : "is-no");
    const right = q.type === "mc" || q.type === "multi"
      ? [].concat(q.answer).map((i) => q.options[i]).join(", ")
      : [].concat(q.answer)[0];
    fb.innerHTML = (r.ok ? "<strong>Correct.</strong> " : `<strong>Not this time.</strong> The answer is <code class="q-ans"></code>. `) + (q.explain || "");
    if (!r.ok) $(".q-ans", fb).textContent = right;
    if (!box.dataset.answered) { box.dataset.answered = "1"; onAnswer && onAnswer(r.ok); }
  });
  box.append(h("div", { class: "q-actions" }, btn), fb);
  return box;
}

export function mountQuizzes(root = document) {
  $$(".quiz", root).forEach((el) => {
    const id = el.dataset.id;
    const qs = JSON.parse($("script", el).textContent);
    let answered = 0, right = 0;
    const score = h("div", { class: "quiz-score", "aria-live": "polite" });
    const prev = progress.get("quiz:" + id);
    if (prev) score.textContent = `Your best so far: ${prev.best} of ${qs.length}.`;
    qs.forEach((q, i) => {
      el.append(h("div", { class: "q-num" }, `Question ${i + 1} of ${qs.length}`), renderQuestion(q, {
        onAnswer: (ok) => {
          answered++; if (ok) right++;
          // Every quiz question becomes a review card; a wrong first answer brings it back sooner.
          const ck = `srs:${id}#${i}`;
          if (!progress.get(ck)) progress.set(ck, { due: Date.now() + (ok ? 2 : 1) * 864e5, interval: ok ? 2 : 1, ease: 2.5, reps: ok ? 1 : 0 });
          if (answered === qs.length) {
            progress.update("quiz:" + id, (p) => ({ score: right, total: qs.length, best: Math.max((p && p.best) || 0, right) }));
            score.textContent = `You got ${right} of ${qs.length} on the first try.` + (right < qs.length ? " The ones you missed will come back in your daily review." : "");
          }
          progress.activity(ok ? 2 : 1);
        },
      }));
    });
    el.append(score);
  });
}

// ------------------------------------------------------------ Parsons puzzles

export function mountParsons(root = document) {
  $$(".parsons", root).forEach((el) => {
    const data = JSON.parse($("script", el).textContent);
    const id = el.dataset.id;
    const solution = data.lines.map((l) => ({ text: l.replace(/^ +/, ""), indent: (l.match(/^ */)[0].length / 4) | 0 }));
    const pieces = [...solution.map((s, i) => ({ ...s, key: "s" + i })), ...(data.distractors || []).map((t, i) => ({ text: t.trim(), indent: 0, key: "d" + i }))];
    for (let i = pieces.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
    let answer = [];
    const pool = h("ul", { class: "pz-pool", "aria-label": "Lines to use" });
    const ans = h("ul", { class: "pz-ans", "aria-label": "Your program" });
    const fb = h("div", { class: "pz-fb", "aria-live": "polite" });

    const draw = () => {
      const left = pieces.filter((p) => !answer.some((a) => a.ref === p));
      pool.replaceChildren(...left.map((p) =>
        h("li", {}, h("button", { type: "button", class: "pz-line", onclick: () => { answer.push({ text: p.text, indent: 0, ref: p }); draw(); } }, h("code", {}, p.text)))));
      if (!left.length) pool.append(h("li", { class: "pz-empty" }, "All lines used."));
      ans.replaceChildren(...answer.map((a, i) => h("li", { class: "pz-row", style: `--ind:${a.indent}` },
        h("code", { class: "pz-text" }, a.text),
        h("span", { class: "pz-tools" },
          h("button", { type: "button", class: "btn btn-tiny", "aria-label": "Indent less", onclick: () => { a.indent = Math.max(0, a.indent - 1); draw(); } }, "⇤"),
          h("button", { type: "button", class: "btn btn-tiny", "aria-label": "Indent more", onclick: () => { a.indent = Math.min(4, a.indent + 1); draw(); } }, "⇥"),
          h("button", { type: "button", class: "btn btn-tiny", "aria-label": "Move up", onclick: () => { if (i) { [answer[i - 1], answer[i]] = [answer[i], answer[i - 1]]; draw(); } } }, "↑"),
          h("button", { type: "button", class: "btn btn-tiny", "aria-label": "Move down", onclick: () => { if (i < answer.length - 1) { [answer[i + 1], answer[i]] = [answer[i], answer[i + 1]]; draw(); } } }, "↓"),
          h("button", { type: "button", class: "btn btn-tiny", "aria-label": "Remove line", onclick: () => { answer.splice(i, 1); draw(); } }, "✕")))));
      if (!answer.length) ans.append(h("li", { class: "pz-empty" }, "Click lines on the left to build the program here."));
    };

    const check = () => {
      el.classList.remove("is-ok");
      const got = answer.map((a) => a.text + "|" + a.indent);
      const want = solution.map((s) => s.text + "|" + s.indent);
      let firstBad = got.findIndex((g, i) => g !== want[i]);
      if (firstBad === -1 && got.length !== want.length) firstBad = Math.min(got.length, want.length);
      $$(".pz-row", ans).forEach((r, i) => r.classList.toggle("is-bad", i === firstBad));
      if (firstBad === -1) {
        el.classList.add("is-ok");
        fb.textContent = "Correct. Every line is in the right place with the right indentation.";
        if (id) progress.update("pz:" + id, () => ({ solved: true }));
        progress.activity(3);
      } else if (firstBad >= got.length) {
        fb.textContent = `So far so good. The program needs ${want.length - got.length} more line(s).`;
      } else {
        const a = answer[firstBad];
        const wrongIndent = solution[firstBad] && solution[firstBad].text === a.text;
        fb.textContent = wrongIndent
          ? `Line ${firstBad + 1} is the right line but its indentation is wrong.`
          : (data.distractors || []).map((d) => d.trim()).includes(a.text)
            ? `Line ${firstBad + 1} is a trap: that line doesn't belong in the program at all.`
            : `Line ${firstBad + 1} is in the wrong place.`;
      }
    };
    el.append(h("div", { class: "pz-grid" }, h("div", {}, h("div", { class: "pz-head" }, "Lines"), pool), h("div", {}, h("div", { class: "pz-head" }, "Your program"), ans)),
      h("div", { class: "pz-actions" }, h("button", { type: "button", class: "btn btn-check", onclick: check }, "Check order"),
        h("button", { type: "button", class: "btn btn-quiet", onclick: () => { answer = []; fb.textContent = ""; draw(); } }, "Start again")), fb);
    draw();
  });
}
