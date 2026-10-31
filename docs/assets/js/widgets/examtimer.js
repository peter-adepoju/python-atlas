// Exam timer: start it when you begin; it counts down, survives a page reload, and tells you
// when time is up. It never locks anything: the exam is for you.
import { h } from "../site.js?v=5b063fa476";

export default function examtimer(el, { minutes = 120, key = "exam" } = {}) {
  const store = "atlas-timer:" + key;
  const read = () => { try { return +localStorage.getItem(store) || 0; } catch { return 0; } };
  const write = (v) => { try { v ? localStorage.setItem(store, String(v)) : localStorage.removeItem(store); } catch { /* private mode */ } };
  let started = read();
  const clock = h("div", { style: "font:700 2.4rem/1 var(--f-code);letter-spacing:.02em" });
  const bar = h("div", { style: "height:8px;border-radius:4px;background:var(--sunk);overflow:hidden;margin:.7rem 0" }, h("div", { style: "height:100%;width:0;background:var(--blue);transition:width .5s" }));
  const note = h("p", { class: "w-note", style: "margin:0" });
  const startBtn = h("button", { type: "button", class: "btn btn-run" }, "Start the exam");
  const resetBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Reset the timer");
  el.append(h("div", { class: "w-row", style: "align-items:center;gap:1rem" }, clock, startBtn, resetBtn), bar, note);
  startBtn.onclick = () => { started = Date.now(); write(started); tick(); };
  resetBtn.onclick = () => { started = 0; write(0); tick(); };
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60; return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; };
  function tick() {
    const total = minutes * 60000;
    startBtn.hidden = !!started; resetBtn.hidden = !started;
    if (!started) { clock.textContent = fmt(total); bar.firstChild.style.width = "0"; note.textContent = `You have ${minutes} minutes. Press start when you're ready; the timer keeps going if you reload the page.`; return; }
    const left = total - (Date.now() - started);
    clock.textContent = fmt(left);
    bar.firstChild.style.width = `${Math.min(100, 100 * (1 - left / total))}%`;
    bar.firstChild.style.background = left < 10 * 60000 ? "var(--red)" : "var(--blue)";
    clock.style.color = left <= 0 ? "var(--red)" : "";
    note.textContent = left <= 0 ? "Time's up. Finish the line you're on, then check your answers and add up your score." : left < 10 * 60000 ? "Less than ten minutes left. Make sure every answer you have is checked." : "Work through the questions in any order. Check each answer as you finish it.";
  }
  tick();
  setInterval(tick, 1000);
}
