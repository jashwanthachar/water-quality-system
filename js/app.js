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

  // Calculate Reference Score (0 - 100) based strictly on BIS IS 10500 limits:
  let score = 100;

  // 1. pH penalty (acceptable: 6.5 - 8.5)
  if (t.ph < 6.5) score -= Math.min(30, (6.5 - t.ph) * 20);
  else if (t.ph > 8.5) score -= Math.min(30, (t.ph - 8.5) * 20);
  else if (Math.abs(t.ph - 7.2) > 0.4) score -= (Math.abs(t.ph - 7.2) - 0.4) * 8;

  // 2. TDS penalty (acceptable <= 500, permissible <= 2000 mg/L)
  if (t.tds > 500) score -= Math.min(35, 10 + ((t.tds - 500) / 1500) * 25);
  else if (t.tds > 300) score -= ((t.tds - 300) / 200) * 8;

  // 3. Turbidity penalty (acceptable <= 1, permissible <= 5 NTU)
  if (t.turbidity > 1) score -= Math.min(35, 10 + ((t.turbidity - 1) / 4) * 25);

  score = Math.max(15, Math.min(99, Math.round(score)));
  scoreSpan.textContent = score;

  // Arc length is ~120 in the SVG path
  const offset = 120 - (120 * (score / 100));
  arcPath.style.strokeDashoffset = offset;

  if (score >= 82) {
    statusText.textContent = "Within Reference Limits";
    iconSpan.textContent = "✓";
    iconSpan.className = "wqi-status-icon";
    arcPath.style.stroke = "#22d3ee";
  } else if (score >= 60) {
    statusText.textContent = "Above Acceptable Limit";
    iconSpan.textContent = "!";
    iconSpan.className = "wqi-status-icon attention";
    arcPath.style.stroke = "#f59e0b";
  } else {
    statusText.textContent = "Outside Permissible Limit";
    iconSpan.textContent = "✕";
    iconSpan.className = "wqi-status-icon high";
    arcPath.style.stroke = "#ef4444";
  }

  dateSpan.textContent = `Last Tested: ${t.test_date}${t.source ? ' • ' + t.source : ''}`;
}

const selElement = document.getElementById("wardSelect");
selElement.addEventListener("change", updateWard);
selElement.addEventListener("input", updateWard);

const scoreInfoBtn = document.getElementById("scoreInfoBtn");
if (scoreInfoBtn) {
  scoreInfoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    alert(
      "📊 How the Reference Score (0 - 100) is calculated:\n\n" +
      "Base Score = 100 points\n\n" +
      "Evaluated mathematically against BIS IS 10500 Drinking Water specifications:\n" +
      "• pH (Acceptable: 6.5 – 8.5):\n" +
      "   Deducts up to 30 points if water is acidic (<6.5) or alkaline (>8.5).\n" +
      "• TDS (Acceptable: ≤ 500 mg/L, Permissible: ≤ 2000 mg/L):\n" +
      "   Deducts up to 35 points if dissolved solids exceed acceptable limits.\n" +
      "• Turbidity (Acceptable: ≤ 1 NTU, Permissible: ≤ 5 NTU):\n" +
      "   Deducts up to 35 points for suspended particulates.\n\n" +
      "Categories:\n" +
      "• 82 – 100: Within Reference Limits\n" +
      "• 60 – 81: Above Acceptable Limit\n" +
      "• Below 60: Outside Permissible Limit\n\n" +
      "*Informational mathematical indicator. Not a laboratory certification."
    );
  });
}

loadWards();
