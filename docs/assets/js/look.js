/* Design previews. Opening any page with ?look=paper (atelier, studio, night, calm) shows the
   whole site in that sample design and remembers it in this browser; ?look=off returns to normal.
   Nobody sees a preview unless they open one of those links. */
(function () {
  var LOOKS = { paper: "Paper", atelier: "Atelier", studio: "Studio", night: "Night", calm: "Atlas Calm" };
  var look = null;
  try {
    var q = new URLSearchParams(location.search).get("look");
    if (q === "off") localStorage.removeItem("atlas.look");
    else if (q && LOOKS[q]) localStorage.setItem("atlas.look", q);
    look = localStorage.getItem("atlas.look");
  } catch (e) {}
  if (!look || !LOOKS[look]) return;
  var root = (document.querySelector('meta[name="site-root"]') || {}).content || "";
  var v = (document.querySelector('meta[name="site-version"]') || {}).content || "";
  document.write('<link rel="stylesheet" href="' + root + "assets/css/looks/" + look + ".css?v=" + v + '">');
  if (look === "night") document.documentElement.dataset.theme = "dark";
  document.addEventListener("DOMContentLoaded", function () {
    var plan = document.querySelector(".day-plan");
    if (plan) {
      var n = plan.querySelectorAll(".plan-list li").length;
      plan.dataset.parts = n + " parts. Click to see the plan.";
      plan.addEventListener("click", function () { plan.classList.toggle("is-open"); });
    }
    var bar = document.createElement("div");
    bar.className = "look-bar";
    var opts = Object.keys(LOOKS).map(function (k) { return '<option value="' + k + '"' + (k === look ? " selected" : "") + ">" + LOOKS[k] + "</option>"; }).join("");
    bar.innerHTML = '<label for="look-pick">Preview</label><select id="look-pick">' + opts + '</select><a href="?look=off">Exit</a>';
    bar.querySelector("select").addEventListener("change", function (e) {
      var u = new URL(location.href); u.searchParams.set("look", e.target.value); location.href = u.toString();
    });
    document.body.appendChild(bar);
  });
})();
