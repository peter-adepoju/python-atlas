// Local and remote: your repository and its copy on GitHub, side by side. Commit, push, let a
// teammate push, then pull, and watch "ahead" and "behind" change.
import { h } from "../site.js?v=8fe38f9496";

export default function pushpull(el) {
  let local, remote, n, msg;
  const row = (label) => { const r = h("div", { style: "display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-height:2.2rem" }); return [h("div", { class: "w-label", style: "margin-top:.6rem" }, label), r]; };
  const [l1, remoteRow] = row("GitHub (origin/main)"), [l2, localRow] = row("your computer (main)");
  const status = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap" });
  const buttons = { commit: "Commit on your computer", push: "git push", mate: "A teammate pushes", pull: "git pull" };
  const bar = h("div", { class: "w-row", style: "flex-wrap:wrap;gap:.4rem" });
  const resetBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Start again");
  el.append(bar, l1, remoteRow, l2, localRow, status, h("div", { class: "w-row", style: "margin-top:.5rem" }, resetBtn));
  const chip = (c, mine) => h("span", { style: `padding:.25rem .5rem;border-radius:5px;font:700 .8rem var(--f-code);border:2px solid ${c.by === "you" ? "var(--blue)" : "var(--violet)"};background:${mine ? "var(--paper)" : "transparent"}` }, c.id + (c.merge ? " (merge)" : ""));
  const idsOf = (xs) => new Set(xs.map((c) => c.id));
  function draw() {
    remoteRow.replaceChildren(...remote.map((c) => chip(c, false)));
    localRow.replaceChildren(...local.map((c) => chip(c, true)));
    const R = idsOf(remote), L = idsOf(local);
    const ahead = local.filter((c) => !R.has(c.id)).length, behind = remote.filter((c) => !L.has(c.id)).length;
    let s = `Your branch is ${ahead || behind ? "" : "up to date with origin/main."}`;
    if (ahead && !behind) s = `Your branch is ahead of origin/main by ${ahead} commit${ahead > 1 ? "s" : ""}: git push to share ${ahead > 1 ? "them" : "it"}.`;
    if (behind && !ahead) s = `Your branch is behind origin/main by ${behind} commit${behind > 1 ? "s" : ""}: git pull to get ${behind > 1 ? "them" : "it"}.`;
    if (ahead && behind) s = `Your branch and origin/main have diverged: ${ahead} of yours, ${behind} of theirs. git pull first (it merges), then git push.`;
    status.textContent = (msg ? msg + "\n\n" : "") + s;
    bar.replaceChildren(...Object.entries(buttons).map(([k, label]) => { const b = h("button", { type: "button", class: "btn " + (k === "push" || k === "pull" ? "btn-step" : "btn-quiet") }, label); b.onclick = () => act(k); return b; }));
  }
  const next = (by) => ({ id: (by === "you" ? "y" : "t") + ++n, by });
  function act(k) {
    const R = idsOf(remote), L = idsOf(local);
    if (k === "commit") { local.push(next("you")); msg = "You made a commit. Only your computer has it so far."; }
    if (k === "mate") { remote.push(next("mate")); msg = "Your teammate pushed a commit to GitHub. Your computer doesn't know about it yet."; }
    if (k === "push") {
      const behind = remote.filter((c) => !L.has(c.id)).length;
      if (behind) msg = "! [rejected] main -> main (fetch first)\nGitHub has commits you don't have. Pull first, so nothing of theirs is lost.";
      else if (local.length === remote.length) msg = "Everything up-to-date";
      else { remote = local.slice(); msg = "Pushed: GitHub now has your commits."; }
    }
    if (k === "pull") {
      const theirs = remote.filter((c) => !L.has(c.id)), mine = local.filter((c) => !R.has(c.id));
      if (!theirs.length) msg = "Already up to date.";
      else if (!mine.length) { local = remote.slice(); msg = "Fast-forward: you now have your teammate's commits."; }
      else { local = remote.concat(mine, [{ id: "m" + ++n, by: "you", merge: true }]); msg = "Pull fetched their commits and merged them with yours, making a merge commit. Now you can push."; }
    }
    draw();
  }
  function reset() { n = 1; local = [{ id: "c1", by: "you" }]; remote = [{ id: "c1", by: "you" }]; msg = "You cloned a repository: your computer and GitHub have the same history."; draw(); }
  resetBtn.onclick = reset;
  reset();
}
