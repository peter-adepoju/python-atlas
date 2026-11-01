// Where to continue: the first lesson that's ready and not yet complete. The home page button,
// the "Continue learning" menu item and the course map all use this, so they always agree.
import { SITE } from "./site.js?v=588dc67651";
import { progress } from "./progress.js?v=588dc67651";

let coursePromise = null;
export function loadCourse() {
  if (!coursePromise) coursePromise = fetch(SITE.root + "assets/data/course.json").then((r) => r.json());
  return coursePromise;
}

/** The next day to study, as {id, week, day, title}, or null if nothing is built yet. */
export function nextDay(course) {
  const built = new Set(course.built);
  const days = course.weeks.flatMap((w) => w.days.map((d) => ({ ...d, week: w.week }))).filter((d) => built.has(d.id));
  if (!days.length) return null;
  return days.find((d) => !progress.get("day:" + d.id)) || days[days.length - 1];
}
