// BIS IS 10500 reference values (informational)
const LIMITS = {
  ph:        { min: 6.5, max: 8.5 },
  tds:       { acceptable: 500, permissible: 2000 },
  turbidity: { acceptable: 1,   permissible: 5 }
};

// returns "good", "attention" or "high"
function checkStatus(t) {
  let level = "good";
  if (t.ph < LIMITS.ph.min || t.ph > LIMITS.ph.max) level = "high";
  for (const key of ["tds", "turbidity"]) {
    const v = Number(t[key]);
    if (v > LIMITS[key].permissible) level = "high";
    else if (v > LIMITS[key].acceptable && level !== "high") level = "attention";
  }
  return level;
}

const STATUS_TEXT = {
  good: "🟢 Recorded values within selected reference limits",
  attention: "🟡 One or more values above the acceptable limit",
  high: "🔴 One or more values outside permissible limits"
};

async function loadWater() {
  const params = new URLSearchParams(window.location.search);
  const wardId = params.get("ward");
  const box = document.getElementById("result");

  if (!wardId) { box.textContent = "No ward selected."; return; }

  document.getElementById("reportBtn").href = `complaint.html?ward=${wardId}`;

  const { data: ward } = await db.from("wards").select("*").eq("ward_id", wardId).single();
  document.getElementById("title").textContent = "💧 " + ward.ward_name;

  const { data: tests, error } = await db
    .from("water_tests").select("*")
    .eq("ward_id", wardId)
    .order("test_date", { ascending: false })
    .limit(5);

  if (error || !tests.length) {
    box.innerHTML = "<p>No water test record available for this ward yet.</p>";
    return;
  }

  const t = tests[0];
  const status = checkStatus(t);

  box.innerHTML = `
    <div class="card">
      <h3>Latest Test</h3>
      <p><b>Test date:</b> ${t.test_date}</p>
      <p><b>Source:</b> ${t.source || "Not specified"}</p>
      <table>
        <tr><td>pH</td><td>${t.ph}</td></tr>
        <tr><td>TDS</td><td>${t.tds} mg/L</td></tr>
        <tr><td>Turbidity</td><td>${t.turbidity} NTU</td></tr>
      </table>
      <div class="badge ${status}">${STATUS_TEXT[status]}</div>
      <small>Informational comparison with BIS IS 10500 reference limits.
      This is not a substitute for laboratory testing.</small>
    </div>

    <div class="card">
      <h3>Previous Records</h3>
      <table>
        <tr><th>Date</th><th>pH</th><th>TDS</th><th>NTU</th></tr>
        ${tests.slice(1).map(x =>
          `<tr><td>${x.test_date}</td><td>${x.ph}</td><td>${x.tds}</td><td>${x.turbidity}</td></tr>`
        ).join("") || "<tr><td colspan='4'>No earlier records</td></tr>"}
      </table>
    </div>`;
}

loadWater();