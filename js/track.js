const STEPS = ["Submitted", "Reviewed", "In Progress", "Resolved"];

// stops people from injecting HTML into the page
function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

async function track() {
  const box = document.getElementById("result");
  const code = document.getElementById("codeInput").value.trim();
  const match = code.match(/^W(\d+)-(\d+)$/i);

  if (!match) {
    box.innerHTML = "<p class='error'>Invalid ID. Use the format W4-1.</p>";
    return;
  }

  const wardId = match[1];
  const complaintId = match[2];
  box.textContent = "Searching...";

  const { data: c } = await db
    .from("complaints").select("*")
    .eq("complaint_id", complaintId)
    .eq("ward_id", wardId)
    .maybeSingle();

  if (!c) {
    box.innerHTML = "<p class='error'>No complaint found with this ID.</p>";
    return;
  }

  const { data: updates } = await db
    .from("complaint_updates").select("*")
    .eq("complaint_id", complaintId)
    .order("updated_at", { ascending: true });

  const currentIndex = STEPS.indexOf(c.status);
  const stepsHtml = STEPS.map((s, i) => {
    let cls = "pending", icon = "○";
    if (i < currentIndex || (i === currentIndex && s === "Resolved")) { cls = "done"; icon = "✓"; }
    else if (i === currentIndex) { cls = "current"; icon = "●"; }
    return `<div class="step ${cls}">${icon} ${s}</div>`;
  }).join("");

  const updatesHtml = (updates || []).map(u =>
    `<p><small>${new Date(u.updated_at).toLocaleString()} - <b>${esc(u.status)}</b>${u.remark ? ": " + esc(u.remark) : ""}</small></p>`
  ).join("");

  box.innerHTML = `
    <div class="card">
      <h3>Complaint ${esc(code.toUpperCase())}</h3>
      <p><b>Problem:</b> ${esc(c.category)}</p>
      <p><b>Description:</b> ${esc(c.description)}</p>
      <p><b>Filed on:</b> ${new Date(c.created_at).toLocaleString()}</p>
      ${c.photo_url ? `<img src="${esc(c.photo_url)}" class="photo" alt="Complaint photo" />` : ""}
      <h4>Progress</h4>
      ${stepsHtml}
      ${updatesHtml ? "<h4>Updates from authority</h4>" + updatesHtml : ""}
    </div>`;
}

document.getElementById("trackBtn").addEventListener("click", track);

// auto-fill if opened from the success page
const pre = new URLSearchParams(window.location.search).get("id");
if (pre) {
  document.getElementById("codeInput").value = pre;
  track();
}