// "Get the app": installs Python Atlas on a phone or computer as an app (a Progressive Web App).
// Android and desktop Chrome/Edge show their own install prompt; iPhone and iPad need Safari's
// Share menu, so for those we show the steps.
import { h, SITE } from "./site.js?v=9f26fe5be3";

let deferred = null;
const listeners = new Set();
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function canInstall() { return !isStandalone(); }
export function onInstallable(fn) { listeners.add(fn); fn(canInstall()); }
const notify = () => listeners.forEach((f) => f(canInstall()));

addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; notify(); });
addEventListener("appinstalled", () => { deferred = null; notify(); });

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register(SITE.root + "sw.js").catch(() => {});
}

function sheet(title, steps, note) {
  const close = () => wrap.remove();
  const wrap = h("div", { class: "sheet-wrap", onclick: (e) => { if (e.target === wrap) close(); } },
    h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "sheet-grip", "aria-hidden": "true" }),
      h("div", { class: "sheet-head" },
        h("img", { src: SITE.root + "assets/img/app-192.png", alt: "", width: 48, height: 48 }),
        h("div", {}, h("strong", {}, title), h("span", {}, "Free, and no app store needed"))),
      h("ol", { class: "sheet-steps" }, steps.map((s) => h("li", { html: s }))),
      note ? h("p", { class: "muted small" }, note) : "",
      h("button", { type: "button", class: "btn sheet-done", onclick: close }, "Got it")));
  document.body.append(wrap);
  wrap.querySelector(".sheet-done").focus();
}

const SHARE = '<svg viewBox="0 0 24 24" width="18" height="18" class="ico" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

export async function install() {
  if (isStandalone()) return;
  if (deferred) {
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null; notify();
    return;
  }
  if (isIOS()) {
    sheet("Install Python Atlas on your iPhone", [
      `Open this site in <strong>Safari</strong> (other browsers on iPhone can't install apps).`,
      `Tap the <strong>Share</strong> button ${SHARE} at the bottom of the screen.`,
      `Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.`,
    ], "Python Atlas then opens full screen from its own icon, like any app. Your progress and sign-in come with it.");
    return;
  }
  sheet("Install Python Atlas", [
    "Open your browser's menu (the <strong>⋮</strong> or <strong>…</strong> button).",
    "Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.",
    "Confirm, and Python Atlas appears with your other apps.",
  ], "Works in Chrome, Edge and Samsung Internet on Android, and in Chrome and Edge on computers.");
}

export function initInstall() {
  document.querySelectorAll("[data-install]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); install(); });
    onInstallable((ok) => { el.hidden = !ok; });
  });
}
