// Progress is stored on this device first and copied to your account when signed in.
//
// Each account has its own space on the device. Signing out removes the account's copy from the
// device (after saving anything unsent), so the next person sees nothing of it.
//
// When nobody is signed in, progress is kept only for this browser session (sessionStorage): it's
// gone once the browser or tab is closed, so a shared or borrowed device shows nothing of anyone's
// work. Progress made before signing in is added to the account you sign in to. (If accounts aren't
// switched on for this copy of the course, the device is the only place to keep progress, so it
// stays in localStorage.)
import { SITE, today } from "./site.js?v=0064081c78";

const GUEST = "atlas.progress.guest";
const LEGACY = "atlas.progress.v1";   // the old signed-out space, kept on the device until sign-in
const ACCOUNTS = !!(SITE.supabaseUrl && SITE.supabaseKey);
const userKey = (id) => "atlas.progress.u." + id;
function store(key) {
  return key.startsWith(GUEST) && ACCOUNTS ? sessionStorage : localStorage;
}
const subs = new Set();
let KEY = GUEST;
let client = null;
let user = null;
let pushTimer = null;
const dirty = new Set();

// Who is signed in, read straight from the saved session so the right progress shows at once.
(function guessUser() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(k)) {
        const id = JSON.parse(localStorage.getItem(k))?.user?.id;
        if (id) KEY = userKey(id);
      }
    }
  } catch { /* no saved session */ }
})();
let state = load();

function load(key = KEY) {
  try {
    const found = JSON.parse(store(key).getItem(key));
    if (found) return found;
    // Without accounts, the old signed-out space is still the place progress lives.
    if (key === GUEST && !ACCOUNTS) return JSON.parse(localStorage.getItem(LEGACY)) || {};
    return {};
  } catch { return {}; }
}
function save() {
  try { store(KEY).setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
function emit(key) { subs.forEach((f) => f(key)); }

export const progress = {
  get(key) { return state[key] ? state[key].v : undefined; },
  all(prefix) {
    return Object.entries(state).filter(([k]) => k.startsWith(prefix)).map(([k, e]) => [k, e.v]);
  },
  set(key, value) {
    state[key] = { v: value, t: Date.now() };
    save(); emit(key);
    markDirty(key);
    if (user) schedulePush();
  },
  /** Merge-update an object value, keeping the best numbers where it makes sense. */
  update(key, fn) { this.set(key, fn(this.get(key))); },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  user: () => user,
  client: () => client,

  /** Record that the learner did something today (for the streak and heatmap). */
  activity(points = 1) {
    const k = "act:" + today();
    const cur = this.get(k) || { pts: 0 };
    this.set(k, { pts: cur.pts + points });
  },
  streak() {
    const days = new Set(this.all("act:").map(([k]) => k.slice(4)));
    let n = 0;
    const d = new Date();
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    if (!days.has(fmt(d))) d.setDate(d.getDate() - 1); // today not started yet: count up to yesterday
    while (days.has(fmt(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  export() { return JSON.stringify(state, null, 1); },
  import(text) {
    const incoming = JSON.parse(text);
    for (const [k, e] of Object.entries(incoming)) if (!state[k] || state[k].t < e.t) state[k] = e;
    save(); emit("*");
  },
};

// ------------------------------------------------------------ account sync
//
// Every change is saved on this device at once, and the keys still to send are remembered in
// localStorage, so nothing is lost if the page closes before it reaches the server. Changes are
// sent quickly, and again when the page is hidden (switching apps on a phone, closing a tab),
// with a request the browser finishes even after the page has gone. Whenever the page comes
// back into view, it fetches what other devices have saved.

const dirtyKey = () => KEY + ".dirty";
let session = null;
let pulling = null;
let lastPull = 0;
const sync = { status: "off", last: 0, error: "" };
const syncSubs = new Set();

(function loadDirty() {
  try { (JSON.parse(store(dirtyKey()).getItem(dirtyKey())) || []).forEach((k) => dirty.add(k)); } catch { /* ignore */ }
})();
function saveDirty() {
  try { store(dirtyKey()).setItem(dirtyKey(), JSON.stringify([...dirty])); } catch { /* ignore */ }
}
function setSync(status, error = "") {
  sync.status = status;
  sync.error = error;
  if (status === "synced") sync.last = Date.now();
  syncSubs.forEach((f) => f({ ...sync, pending: dirty.size }));
}
export function onSync(fn) { syncSubs.add(fn); fn({ ...sync, pending: dirty.size }); return () => syncSubs.delete(fn); }

function markDirty(key) { dirty.add(key); saveDirty(); }

function schedulePush() {
  clearTimeout(pushTimer);
  if (!user) return;
  setSync("pending");
  pushTimer = setTimeout(push, 400);
}

function rowsFor(keys) {
  return keys.filter((k) => state[k]).map((k) => ({
    user_id: user.id, key: k, value: state[k].v, updated_at: new Date(state[k].t).toISOString(),
  }));
}

async function push() {
  clearTimeout(pushTimer);
  if (!client || !user) return;
  if (!dirty.size) { setSync("synced"); return; }
  const keys = [...dirty];
  const rows = rowsFor(keys);
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.from("progress").upsert(rows.slice(i, i + 500), { onConflict: "user_id,key" });
    if (error) {
      console.warn("Progress sync failed", error.message);
      setSync(navigator.onLine === false ? "offline" : "error", error.message);
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 15000);
      return;
    }
  }
  // Only clear keys that haven't changed again while we were sending.
  for (const k of keys) {
    const r = rows.find((x) => x.key === k);
    if (!r || Date.parse(r.updated_at) === state[k].t) dirty.delete(k);
  }
  saveDirty();
  if (dirty.size) schedulePush(); else setSync("synced");
}

/** Send what's waiting with a request that survives the page closing (no waiting for an answer). */
function flushOnExit() {
  if (!user || !session || !dirty.size || !SITE.supabaseUrl) return;
  const body = JSON.stringify(rowsFor([...dirty]));
  if (body.length > 60000) { push(); return; } // too big for a keepalive request; try normally
  try {
    fetch(`${SITE.supabaseUrl}/rest/v1/progress?on_conflict=user_id,key`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: SITE.supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body,
    });
  } catch { /* the keys stay marked, and are sent next time */ }
}

async function pull(force = false) {
  if (!client || !user) return;
  if (pulling) return pulling;
  if (!force && Date.now() - lastPull < 15000) return;
  pulling = (async () => {
    setSync("pending");
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from("progress").select("key,value,updated_at")
        .eq("user_id", user.id).range(from, from + 999);
      if (error) {
        console.warn(error.message);
        setSync(navigator.onLine === false ? "offline" : "error", error.message);
        return;
      }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    lastPull = Date.now();
    const remote = new Map(rows.map((r) => [r.key, r]));
    let changed = false;
    for (const r of rows) {
      const t = Date.parse(r.updated_at);
      if (!state[r.key] || state[r.key].t < t) { state[r.key] = { v: r.value, t }; changed = true; }
    }
    for (const k of Object.keys(state)) {
      const r = remote.get(k);
      if (!r || Date.parse(r.updated_at) < state[k].t) dirty.add(k);
    }
    saveDirty();
    if (changed) { save(); emit("*"); }
    await push();
  })();
  try { await pulling; } finally { pulling = null; }
}

/** Use the space for this account (or the signed-out space), bringing signed-out progress along. */
function switchTo(newUser) {
  const key = newUser ? userKey(newUser.id) : GUEST;
  if (key !== KEY) {
    KEY = key;
    state = load();
    dirty.clear();
    try { (JSON.parse(store(dirtyKey()).getItem(dirtyKey())) || []).forEach((k) => dirty.add(k)); } catch { /* ignore */ }
  }
  if (newUser) {
    // Progress made while signed out (this session, or saved on the device by older versions of
    // the site) joins the account, and leaves the signed-out space.
    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem(LEGACY)) || {}; } catch { /* ignore */ }
    for (const guest of [legacy, load(GUEST)]) {
      for (const k of Object.keys(guest)) if (!state[k] || state[k].t < guest[k].t) { state[k] = guest[k]; dirty.add(k); }
    }
    try {
      for (const k of [LEGACY, LEGACY + ".dirty", "atlas.progress.dirty"]) localStorage.removeItem(k);
      for (const k of [GUEST, GUEST + ".dirty"]) store(k).removeItem(k);
    } catch { /* ignore */ }
    saveDirty();
    save();
  }
  emit("*");
}

/** Sign out: save anything unsent, then remove this account's progress from the device. */
export async function signOut() {
  if (!client) return;
  if (user) {
    await push();
    if (dirty.size && !confirm(`${dirty.size} recent change${dirty.size === 1 ? " hasn't" : "s haven't"} reached your account yet (you may be offline). If you sign out now, ${dirty.size === 1 ? "it" : "they"} will be lost. Sign out anyway?`)) return;
    const mine = KEY;
    try { localStorage.removeItem(mine); localStorage.removeItem(mine + ".dirty"); } catch { /* ignore */ }
  }
  await client.auth.signOut();
  user = null; session = null;
  switchTo(null);
  setSync("off");
  authSubs.forEach((f) => f(null));
}

/** Fetch from the account and send anything waiting, now. */
export async function syncNow() { await pull(true); }

const authSubs = new Set();
export function onAuth(fn) { authSubs.add(fn); fn(user); return () => authSubs.delete(fn); }

export async function getClient() {
  if (client) return client;
  if (!SITE.supabaseUrl || !SITE.supabaseKey) return null;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  client = createClient(SITE.supabaseUrl, SITE.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
  client.auth.onAuthStateChange((_event, s) => {
    const was = user && user.id;
    session = s;
    user = s ? s.user : null;
    if (user && user.id !== was) switchTo(user);
    if (!user && was) {
      // Signed out somewhere else (another tab, or the session ended): clear this account's copy.
      try { localStorage.removeItem(userKey(was)); localStorage.removeItem(userKey(was) + ".dirty"); } catch { /* ignore */ }
      switchTo(null);
      setSync("off");
    }
    authSubs.forEach((f) => f(user));
    if (user && user.id !== was) pull(true);
  });
  const { data } = await client.auth.getSession();
  session = data.session;
  const was = user && user.id;
  user = session ? session.user : null;
  if (user && user.id !== was) switchTo(user);
  if (!user && KEY !== GUEST) switchTo(null); // a saved session that is no longer valid
  authSubs.forEach((f) => f(user));
  if (user && user.id !== was) pull(true);
  return client;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnExit();
  else pull();
});
addEventListener("pagehide", flushOnExit);
addEventListener("focus", () => pull());
addEventListener("online", () => pull(true));
// Another tab on this device saved something: take it from shared storage.
addEventListener("storage", (e) => {
  if (e.key === KEY) { state = load(); emit("*"); }
  if (e.key === dirtyKey()) { try { (JSON.parse(e.newValue) || []).forEach((k) => dirty.add(k)); } catch { /* ignore */ } }
});
setInterval(() => { if (document.visibilityState === "visible") pull(); }, 120000);
