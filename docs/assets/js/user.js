// How a signed-in learner is shown: name and avatar.
import { h } from "./site.js?v=9f26fe5be3";

export function displayName(user) {
  if (!user) return "";
  const m = user.user_metadata || {};
  const name = (m.full_name || m.name || "").trim();
  if (name) return name;
  const local = (user.email || "").split("@")[0].replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : "Learner";
}

export const firstName = (user) => displayName(user).split(/\s+/)[0];

export function initials(user) {
  const parts = displayName(user).split(/\s+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function avatar(user, el = h("span", { class: "avatar" })) {
  const m = (user && user.user_metadata) || {};
  const url = m.avatar_url || m.picture;
  el.replaceChildren();
  if (url) {
    const img = h("img", { src: url, alt: "", referrerpolicy: "no-referrer" });
    img.onerror = () => { el.replaceChildren(initials(user)); };
    el.append(img);
  } else el.append(initials(user));
  return el;
}
