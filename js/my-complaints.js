function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

async function loadMine() {
  const box = document.getElementById("list");
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("myComplaints") || "[]"); } catch (e) {}

  if (!saved.length) {
    box.innerHTML = "<p>No complaints filed from this device yet.</p>";
    return;
  }

  const ids = saved.map(s => s.id);
  const { data, error } = await db
    .from("complaints").select("*")
    .in("complaint_id", ids)
    .order("created_at", { ascending: false });

  if (error || !data.length) {
    box.innerHTML = "<p>Could not load your complaints.</p>";
    return;
  }

  box.innerHTML = data.map(c => {
    const code = `W${c.ward_id}-${c.complaint_id}`;
    return `
      <div class="card">
        <h3>${code}</h3>
        <p><b>Problem:</b> ${esc(c.category)}</p>
        <p><b>Status:</b> ${esc(c.status)}</p>
        <p><small>${new Date(c.created_at).toLocaleString()}</small></p>
        <a class="btn" href="track.html?id=${code}">View progress</a>
      </div>`;
  }).join("");
}

loadMine();
