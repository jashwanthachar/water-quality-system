const STATUSES = ["Submitted", "Reviewed", "In Progress", "Resolved"];
let wards = [];
let complaints = [];
let tests = [];

function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

// 1. Only logged-in admins may stay on this page
async function init() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    window.location.href = "admin-login.html";
    return;
  }
  const res = await db.from("wards").select("*").order("ward_id");
  wards = res.data || [];

  const options = wards.map(w => `<option value="${w.ward_id}">${w.ward_name}</option>`).join("");
  document.getElementById("tWard").innerHTML = options;
  document.getElementById("filterWard").innerHTML =
    `<option value="all">All wards</option>` + options;
  document.getElementById("tDate").value = new Date().toISOString().slice(0, 10);

  await loadAll();
}

async function loadAll() {
  const [c, t] = await Promise.all([
    db.from("complaints").select("*").order("created_at", { ascending: false }),
    db.from("water_tests").select("*").order("test_date", { ascending: false })
  ]);
  complaints = c.data || [];
  tests = t.data || [];
  renderStats(tests.length);
  renderBars();
  renderComplaints();
  renderTests();
}

function renderStats(testCount) {
  const resolved = complaints.filter(c => c.status === "Resolved").length;
  const pending = complaints.length - resolved;
  document.getElementById("stats").innerHTML = `
    <div class="stat"><b>${testCount}</b><span>Water Tests</span></div>
    <div class="stat"><b>${complaints.length}</b><span>Complaints</span></div>
    <div class="stat"><b>${pending}</b><span>Pending</span></div>
    <div class="stat"><b>${resolved}</b><span>Resolved</span></div>`;
}

function renderBars() {
  const counts = wards.map(w => ({
    name: w.ward_name,
    n: complaints.filter(c => c.ward_id === w.ward_id).length
  }));
  const max = Math.max(1, ...counts.map(x => x.n));
  document.getElementById("wardBars").innerHTML = counts.map(x => `
    <div class="bar-row">
      <span class="bar-label">${x.name}</span>
      <div class="bar" style="width:${(x.n / max) * 70}%"></div>
      <span>${x.n}</span>
    </div>`).join("");
}

function renderComplaints() {
  const f = document.getElementById("filterWard").value;
  const list = complaints.filter(c => f === "all" || String(c.ward_id) === f);
  const box = document.getElementById("complaintList");

  if (!list.length) { box.innerHTML = "<p>No complaints found.</p>"; return; }

  box.innerHTML = list.map(c => {
    const wardName = (wards.find(w => w.ward_id === c.ward_id) || {}).ward_name;
    return `
    <div class="complaint">
      <b>W${c.ward_id}-${c.complaint_id}</b> | ${esc(wardName)} | ${esc(c.category)}
      <p>${esc(c.description)}</p>
      ${c.photo_url ? `<a href="${esc(c.photo_url)}" target="_blank">View photo</a>` : ""}
      <p><small>${new Date(c.created_at).toLocaleString()}</small></p>
      <select id="st-${c.complaint_id}">
        ${STATUSES.map(s => `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <input type="text" id="rm-${c.complaint_id}" placeholder="Remark (optional)" />
      <button onclick="updateStatus(${c.complaint_id})">Update</button>
    </div>`;
  }).join("");
}

function renderTests() {
  const box = document.getElementById("testList");
  if (!tests.length) { box.innerHTML = "<p>No records yet.</p>"; return; }
  box.innerHTML = `<table>
    <tr><th>Ward</th><th>Date</th><th>pH</th><th>TDS</th><th>NTU</th><th></th></tr>
    ${tests.slice(0, 30).map(t => {
      const w = (wards.find(x => x.ward_id === t.ward_id) || {}).ward_name;
      return `<tr>
        <td>${esc(w)}</td><td>${esc(t.test_date)}</td><td>${esc(t.ph)}</td><td>${esc(t.tds)}</td><td>${esc(t.turbidity)}</td>
        <td>
          <button class="small-btn" onclick="editTest(${t.test_id})">Edit</button>
          <button class="small-btn" style="background:#c1121f" onclick="deleteTest(${t.test_id})">Delete</button>
        </td></tr>`;
    }).join("")}
  </table><small>Showing the latest 30 records.</small>`;
}

async function editTest(id) {
  const t = tests.find(x => x.test_id === id);
  if (!t) return;
  const ph = parseFloat(prompt("pH (0-14):", t.ph));
  const tds = parseFloat(prompt("TDS (mg/L):", t.tds));
  const turb = parseFloat(prompt("Turbidity (NTU):", t.turbidity));

  if ([ph, tds, turb].some(isNaN) || ph < 0 || ph > 14 || tds < 0 || turb < 0) {
    alert("Invalid values. Nothing changed.");
    return;
  }
  const { error } = await db.from("water_tests")
    .update({ ph, tds, turbidity: turb }).eq("test_id", id);
  if (error) { alert("Could not update."); console.error(error); return; }
  await loadAll();
}

async function deleteTest(id) {
  if (!confirm("Delete this test record permanently?")) return;
  const { error } = await db.from("water_tests").delete().eq("test_id", id);
  if (error) { alert("Could not delete."); console.error(error); return; }
  await loadAll();
}

// Neutralise formula-like values before writing them to CSV for spreadsheet apps.
function downloadCSV(filename, rows) {
  const clean = v => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = rows.map(r => r.map(clean).join(",")).join("\n");
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("csvComplaints").addEventListener("click", () => {
  const rows = [["Complaint ID", "Ward", "Category", "Description", "Status", "Date"]];
  complaints.forEach(c => {
    const w = (wards.find(x => x.ward_id === c.ward_id) || {}).ward_name;
    rows.push([`W${c.ward_id}-${c.complaint_id}`, w, c.category, c.description, c.status, c.created_at]);
  });
  downloadCSV("complaints-report.csv", rows);
});

document.getElementById("csvTests").addEventListener("click", () => {
  const rows = [["Ward", "Test date", "pH", "TDS", "Turbidity", "Source", "Remarks"]];
  tests.forEach(t => {
    const w = (wards.find(x => x.ward_id === t.ward_id) || {}).ward_name;
    rows.push([w, t.test_date, t.ph, t.tds, t.turbidity, t.source, t.remarks]);
  });
  downloadCSV("water-tests-report.csv", rows);
});

async function updateStatus(id) {
  const status = document.getElementById(`st-${id}`).value;
  const remark = document.getElementById(`rm-${id}`).value.trim();

  const { error } = await db.from("complaints").update({ status }).eq("complaint_id", id);
  if (error) { alert("Could not update. Are you logged in?"); console.error(error); return; }

  await db.from("complaint_updates").insert({ complaint_id: id, status, remark: remark || null });
  await loadAll();
}

async function addTest() {
  const msg = document.getElementById("testMsg");
  const ph = parseFloat(document.getElementById("tPh").value);
  const tds = parseFloat(document.getElementById("tTds").value);
  const turb = parseFloat(document.getElementById("tTurb").value);
  const date = document.getElementById("tDate").value;

  if ([ph, tds, turb].some(isNaN) || !date) { msg.textContent = "❌ Fill all numbers and the date."; return; }
  if (ph < 0 || ph > 14) { msg.textContent = "❌ pH must be between 0 and 14."; return; }
  if (tds < 0 || turb < 0) { msg.textContent = "❌ Values cannot be negative."; return; }

  const { error } = await db.from("water_tests").insert({
    ward_id: document.getElementById("tWard").value,
    test_date: date, ph, tds, turbidity: turb,
    source: document.getElementById("tSource").value.trim() || null,
    remarks: document.getElementById("tRemarks").value.trim() || null
  });

  if (error) { msg.textContent = "❌ Could not save."; console.error(error); return; }
  msg.textContent = "✅ Test record saved.";
  ["tPh", "tTds", "tTurb", "tSource", "tRemarks"].forEach(i => document.getElementById(i).value = "");
  await loadAll();
}

document.getElementById("addTestBtn").addEventListener("click", addTest);
document.getElementById("filterWard").addEventListener("change", renderComplaints);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  window.location.href = "admin-login.html";
});

init();
