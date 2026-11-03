// Course guide: highlight the section you're reading in the side menu.
import "./common.js?v=7343aa5d1b";

const links = [...document.querySelectorAll(".gd-toc a")];
const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.remove("on"));
      const a = byId.get(e.target.id);
      if (a) a.classList.add("on");
    }
  }, { rootMargin: "-20% 0px -70% 0px" });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}
