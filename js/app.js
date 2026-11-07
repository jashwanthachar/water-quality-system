let wardsList = [];

async function loadWards() {
  const select = document.getElementById("wardSelect");
  const { data, error } = await db.from("wards").select("*").order("ward_id");

  if (error || !data || !data.length) {
    select.innerHTML = "<option>Could not load wards</option>";
    console.error(error);
    return;
  }

  wardsList = data;
  select.innerHTML = data
    .map(w => `<option value="${w.ward_id}">${w.ward_name}</option>`)
    .join("");

  updateWard();
}

async function updateWard() {
  const id = document.getElementById("wardSelect").value;
  const wardObj = wardsList.find(w => String(w.ward_id) === String(id));
  const wardName = wardObj ? wardObj.ward_name : `Ward ${id}`;

  const display = document.getElementById("wardDisplay");
  if (display) display.textContent = wardName;

  // Update navigation links for this ward
  document.getElementById("viewBtn").href = `water.html?ward=${id}`;
  document.getElementById("reportProblemBtn").href = `complaint.html?ward=${id}`;
  document.getElementById("navWaterLink").href = `water.html?ward=${id}`;
  document.getElementById("wqiCardLink").href = `water.html?ward=${id}`;
  document.getElementById("wqiWardLabel").textContent = `Water Quality (${wardName})`;

  // Fetch the latest water test for this ward
  const { data: tests, error } = await db
    .from("water_tests")
    .select("*")
    .eq("ward_id", id)
    .order("test_date", { ascending: false })
    .limit(1);

  const statusText = document.getElementById("wqiStatusText");
  const iconSpan = document.getElementById("wqiIcon");
  const dateSpan = document.getElementById("wqiDate");
  const scoreSpan = document.getElementById("wqiScore");
  const arcPath = document.getElementById("gaugeArc");

  if (error || !tests || !tests.length) {
    statusText.textContent = "No Test Data";
    iconSpan.textContent = "ℹ";
    iconSpan.className = "wqi-status-icon attention";
    dateSpan.textContent = "No test records available for this ward yet";
    scoreSpan.textContent = "--";
    arcPath.style.strokeDashoffset = "120";
    return;
  }

  const t = tests[0];

  // Calculate WQI (Water Quality Index 0 - 100) based on BIS limits
  let score = 95;
  if (Math.abs(t.ph - 7.2) > 0.5) score -= Math.abs(t.ph - 7.2) * 14;
  if (t.tds > 300) score -= Math.min(25, (t.tds - 300) / 20);
  if (t.turbidity > 1) score -= Math.min(20, (t.turbidity - 1) * 8);
  score = Math.max(25, Math.min(98, Math.round(score)));

  scoreSpan.textContent = score;

  // Arc length is ~120 in the SVG path
  const offset = 120 - (120 * (score / 100));
  arcPath.style.strokeDashoffset = offset;

  if (score >= 82) {
    statusText.textContent = "Safe to Use";
    iconSpan.textContent = "✓";
    iconSpan.className = "wqi-status-icon";
    arcPath.style.stroke = "#22d3ee";
  } else if (score >= 60) {
    statusText.textContent = "Attention Needed";
    iconSpan.textContent = "!";
    iconSpan.className = "wqi-status-icon attention";
    arcPath.style.stroke = "#f59e0b";
  } else {
    statusText.textContent = "Unsafe to Drink";
    iconSpan.textContent = "✕";
    iconSpan.className = "wqi-status-icon high";
    arcPath.style.stroke = "#ef4444";
  }

  dateSpan.textContent = `Last Tested: ${t.test_date}${t.source ? ' • ' + t.source : ''}`;
}

const selElement = document.getElementById("wardSelect");
selElement.addEventListener("change", updateWard);
selElement.addEventListener("input", updateWard);
loadWards();
