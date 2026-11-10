// Loads each interactive figure on demand when it scrolls near the screen.
import { $$, h } from "../site.js?v=b54d8b61c9";

export function mountWidgets(root = document) {
  const figs = $$(".widget[data-widget]", root);
  const load = async (fig) => {
    if (fig.dataset.mounted) return;
    fig.dataset.mounted = "1";
    const name = fig.dataset.widget;
    const params = JSON.parse(fig.querySelector("script").textContent || "{}");
    const body = fig.querySelector(".widget-body");
    try {
      const mod = await import(`./${name}.js?v=b54d8b61c9`);
      body.replaceChildren();
      await mod.default(body, params, fig);
    } catch (e) {
      console.error(e);
      body.replaceChildren(h("p", { class: "w-err" }, `This figure (${name}) failed to load: ${e.message}`));
    }
  };
  if (!("IntersectionObserver" in window)) { figs.forEach(load); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { io.unobserve(en.target); load(en.target); }
  }), { rootMargin: "600px 0px" });
  figs.forEach((f) => io.observe(f));
}
