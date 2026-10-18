const LIMITS = {
  ph:        { min: 6.5, max: 8.5 },
  tds:       { acceptable: 500, permissible: 2000 },
  turbidity: { acceptable: 1,   permissible: 5 }
};

function waterLevel(t) {
  if (!t) return null;
  let level = "good";
  if (t.ph < LIMITS.ph.min || t.ph > LIMITS.ph.max) level = "high";
  for (const key of ["tds", "turbidity"]) {
    const v = Number(t[key]);
    if (v > LIMITS[key].permissible) level = "high";
    else if (v > LIMITS[key].acceptable && level !== "high") level = "attention";
  }
  return level;
}

const COLORS = { green: "#2d9d4f", yellow: "#f4a300", red: "#d62828" };
const LABELS = { green: "🟢 Normal", yellow: "🟡 Attention", red: "🔴 High Priority" };
const DAY = 24 * 60 * 60 * 1000;

function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

function analyse(ward, complaints, tests) {
  const now = Date.now();
  const mine = complaints.filter(c => c.ward_id === ward.ward_id);
  const recentList = mine.filter(c => now - new Date(c.created_at) <= 30 * DAY);
  const recent = recentList.length;
  const previous = mine.filter(c => {
    const age = now - new Date(c.created_at);
    return age > 30 * DAY && age <= 60 * DAY;
  }).length;

  const latest = tests.find(t => t.ward_id === ward.ward_id); // tests are newest first
  const water = waterLevel(latest);

  let score = 0;
  const reasons = [];

  if (recent >= 10) { score += 2; reasons.push(`${recent} complaints in 30 days`); }
  else if (recent >= 5) { score += 1; reasons.push(`${recent} complaints in 30 days`); }

  const rising = recent >= 3 && recent >= 2 * previous;
  if (rising) { score += 1; reasons.push("complaints rising"); }

  if (water === "high") { score += 2; reasons.push("water value outside permissible limit"); }
  else if (water === "attention") { score += 1; reasons.push("water value above acceptable limit"); }

  const level = score >= 3 ? "red" : score >= 1 ? "yellow" : "green";

  let change = "0%";
  if (previous > 0) change = Math.round(((recent - previous) / previous) * 100) + "%";
  else if (recent > 0) change = "new";

  const byCategory = {};
  recentList.forEach(c => { byCategory[c.category] = (byCategory[c.category] || 0) + 1; });

  return { ward, recent, previous, change, latest, water, level, reasons, byCategory };
}

async function loadMap() {
  const [w, c, t] = await Promise.all([
    db.from("wards").select("*").order("ward_id"),
    db.from("complaints").select("ward_id, category, created_at"),
    db.from("water_tests").select("*").order("test_date", { ascending: false })
  ]);

  const wards = w.data || [];
  const results = wards.map(x => analyse(x, c.data || [], t.data || []));

  const map = L.map("map").setView([12.97, 77.6], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const points = [];
  results.forEach(r => {
    if (r.ward.latitude == null || r.ward.longitude == null) return;
    const pos = [r.ward.latitude, r.ward.longitude];
    points.push(pos);

    const cats = Object.entries(r.byCategory)
      .map(([k, v]) => `${esc(k)}: ${v}`).join("<br>") || "No recent complaints";
    const test = r.latest
      ? `pH ${r.latest.ph} | TDS ${r.latest.tds} | Turbidity ${r.latest.turbidity}<br>Tested: ${r.latest.test_date}`
      : "No test record";

    L.circleMarker(pos, {
      radius: 18, color: COLORS[r.level], fillColor: COLORS[r.level],
      fillOpacity: 0.6, weight: 3
    }).addTo(map).bindPopup(`
      <b>${esc(r.ward.ward_name)}</b><br>${LABELS[r.level]}<br><br>
      <b>Latest test</b><br>${test}<br><br>
      <b>Complaints (30 days): ${r.recent}</b><br>${cats}<br><br>
      <a href="water.html?ward=${r.ward.ward_id}">View water details</a>`);
  });

  if (points.length) map.fitBounds(points, { padding: [40, 40] });

  const order = { red: 0, yellow: 1, green: 2 };
  results.sort((a, b) => order[a.level] - order[b.level]);

  document.getElementById("summary").innerHTML = `
    <table>
      <tr><th>Ward</th><th>Level</th><th>30 days</th><th>Before</th><th>Change</th><th>Why</th></tr>
      ${results.map(r => `
        <tr>
          <td>${esc(r.ward.ward_name)}</td>
          <td>${LABELS[r.level]}</td>
          <td>${r.recent}</td><td>${r.previous}</td><td>${r.change}</td>
          <td><small>${r.reasons.join("; ") || "No concerns"}</small></td>
        </tr>`).join("")}
    </table>`;
}

loadMap();