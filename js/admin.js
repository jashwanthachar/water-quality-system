const STATUSES = ["Submitted", "Reviewed", "In Progress", "Resolved"];
let wards = [];
let complaints = [];

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
    db.from("water_tests").select("test_id")
  ]);
  complaints = c.data || [];
  renderStats(t.data ? t.data.length : 0);
  renderBars();
  renderComplaints();
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