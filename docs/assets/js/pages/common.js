// Runs on every page: account link, streak, review badge and the tutor.
import { SITE, $, h } from "../site.js?v=871ff52039";
import { displayName, firstName, avatar } from "../user.js?v=871ff52039";
import { progress, getClient, onAuth, onSync, signOut } from "../progress.js?v=871ff52039";
import { mountTutor } from "../tutor.js?v=871ff52039";
import { settings, update as updateSettings, onSettings } from "../settings.js?v=871ff52039";
import { initSearch } from "../search.js?v=871ff52039";
import { initInstall, install, onInstallable } from "../install.js?v=871ff52039";
import { loadCourse, nextDay } from "../resume.js?v=871ff52039";

let closeMenu = () => {};
document.addEventListener("click", (e) => { const slot = document.getElementById("account-slot"); if (slot && !slot.contains(e.target)) closeMenu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

export function initCommon() {
  const here = location.pathname.split("/").pop() || "index.html";
  const inDay = location.pathname.includes("/days/");

  // Header dropdowns: one open at a time; close on outside click or Escape.
  const dds = [...document.querySelectorAll(".nav-dd")];
  const closeDds = (except) => dds.forEach((dd) => {
    if (dd === except) return;
    dd.querySelector(".dd-menu").hidden = true;
    dd.querySelector(".nav-btn").setAttribute("aria-expanded", "false");
  });
  dds.forEach((dd) => {
    const btn = dd.querySelector(".nav-btn"), menu = dd.querySelector(".dd-menu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeDds(dd);
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector("a")?.focus({ preventScroll: true });
    });
    menu.querySelectorAll("a").forEach((a) => {
      if (a.getAttribute("href").split("#")[0].endsWith(here) && !a.classList.contains("dd-continue")) { a.setAttribute("aria-current", "page"); btn.classList.add("is-here"); }
    });
    if (inDay && dd === dds[0]) btn.classList.add("is-here");
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav-dd")) closeDds(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDds(); });

  // "Continue learning" goes to the first lesson not yet complete, the same one as on the home page.
  const cont = document.getElementById("dd-continue");
  const setContinue = () => {
    if (!cont) return;
    loadCourse().then((course) => {
      const d = nextDay(course);
      if (!d) return;
      cont.href = SITE.root + "days/" + d.id + ".html";
      cont.querySelector("span").textContent = `Week ${d.week}, Day ${d.day}: ${d.title}`;
    }).catch(() => { /* offline and not saved yet: keep the course map link */ });
  };
  setContinue();

  // Theme button in the footer: Auto, Light, Dark in turn.
  const tbtn = document.getElementById("theme-btn"), tlab = document.getElementById("theme-label");
  const NAMES = { auto: "Auto", light: "Light", dark: "Dark" };
  const showTheme = (s) => { if (tlab) { tlab.textContent = NAMES[s.theme] || "Auto"; tbtn.title = `Colour theme: ${tlab.textContent}. Click to change.`; } };
  if (tbtn) {
    showTheme(settings());
    onSettings(showTheme);
    tbtn.onclick = () => { const order = ["auto", "light", "dark"]; updateSettings({ theme: order[(order.indexOf(settings().theme) + 1) % 3] }); };
  }
  initSearch();
  initInstall();

  // Bottom tab bar (phones): mark the current tab.
  const tabOf = { "index.html": "home", "map.html": "learn", "review.html": "review", "playground.html": "play", "account.html": "me", "settings.html": "me" };
  const tab = inDay ? "learn" : tabOf[here];
  document.querySelectorAll(".tab").forEach((t) => { if (t.dataset.tab === tab) t.setAttribute("aria-current", "page"); });

  const refresh = () => {
    const s = progress.streak();
    const st = $("#streak");
    if (st) { st.hidden = s < 1; st.textContent = `${s}-day streak`; }
    const due = progress.all("srs:").filter(([, v]) => v.due <= Date.now()).length;
    for (const b of [$("#due-badge"), $("#tab-due")]) if (b) { b.hidden = !due; b.textContent = due > 99 ? "99+" : due; }
  };
  refresh();
  progress.subscribe(() => { refresh(); setContinue(); });

  getClient().catch((e) => console.warn("Accounts unavailable:", e));
  onAuth((user) => {
    const slot = $("#account-slot");
    if (!slot) return;
    if (!user) {
      slot.replaceChildren(h("a", { class: "btn btn-quiet", href: SITE.root + "account.html" }, "Sign in"));
      return;
    }
    const syncLine = h("span", { class: "um-sync" });
    const installItem = h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); install(); } }, "Install the app");
    onInstallable((ok) => { installItem.hidden = !ok; });
    onSync((st) => {
      syncLine.className = "um-sync is-" + st.status;
      syncLine.textContent = { synced: "Progress saved to your account", pending: "Saving progress…", offline: "Offline: progress saved on this device", error: "Couldn't save to your account yet", off: "" }[st.status] || "";
    });
    const menu = h("div", { class: "user-menu", role: "menu", hidden: true },
      h("div", { class: "um-head" }, h("strong", {}, displayName(user)), h("span", {}, user.email || ""), syncLine),
      h("a", { role: "menuitem", href: SITE.root + "account.html" }, "Your profile"),
      h("a", { role: "menuitem", href: SITE.root + "settings.html" }, "Settings"),
      installItem,
      h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); signOut(); } }, "Sign out"));
    const btn = h("button", { type: "button", class: "user-btn", "aria-haspopup": "menu", "aria-expanded": "false" },
      avatar(user), h("span", { class: "user-first" }, firstName(user)),
      h("span", { class: "chev", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24" width="14" height="14" class="ico"><path d="M6 9l6 6 6-6"/></svg>' }));
    const toggle = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.onclick = (e) => { e.stopPropagation(); toggle(menu.hidden); };
    closeMenu = () => toggle(false);
    slot.replaceChildren(btn, menu);
  });
  if (SITE.tutor) mountTutor();
}

if (!window.__atlasCommon) { window.__atlasCommon = true; initCommon(); }
