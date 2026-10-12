async function loadWards() {
  const select = document.getElementById("ward");
  const { data } = await db.from("wards").select("*").order("ward_id");
  select.innerHTML = data
    .map(w => `<option value="${w.ward_id}">${w.ward_name}</option>`)
    .join("");

  const pre = new URLSearchParams(window.location.search).get("ward");
  if (pre) select.value = pre;
}

async function submitComplaint() {
  const btn = document.getElementById("submitBtn");
  const err = document.getElementById("error");
  err.textContent = "";

  const wardId = document.getElementById("ward").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("photo").files[0];

  if (description.length < 5) {
    err.textContent = "Please describe the problem (at least 5 characters).";
    return;
  }
  if (file && file.size > 2 * 1024 * 1024) {
    err.textContent = "Photo is too large. Maximum 2 MB.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Submitting...";

  let photoUrl = null;
  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const path = `${Date.now()}-${safeName}`;
    const { error: upErr } = await db.storage.from("complaint-photos").upload(path, file);
    if (upErr) {
      err.textContent = "Photo upload failed. Try again or submit without a photo.";
      btn.disabled = false; btn.textContent = "Submit";
      return;
    }
    photoUrl = db.storage.from("complaint-photos").getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await db
    .from("complaints")
    .insert({ ward_id: wardId, category, description, photo_url: photoUrl })
    .select()
    .single();

  if (error) {
    err.textContent = "Could not submit. Please try again.";
    console.error(error);
    btn.disabled = false; btn.textContent = "Submit";
    return;
  }

  const complaintCode = `W${data.ward_id}-${data.complaint_id}`;
  document.getElementById("formBox").style.display = "none";
  document.getElementById("success").innerHTML = `
    <div class="card">
      <h2>✅ Complaint Submitted!</h2>
      <p>Your Complaint ID:</p>
      <p class="bigid">${complaintCode}</p>
      <p>Status: <b>Submitted</b></p>
      <p><small>Save this ID to track your complaint.</small></p>
      <a class="btn" href="track.html?id=${complaintCode}">Track this complaint</a>
    </div>`;
}

document.getElementById("submitBtn").addEventListener("click", submitComplaint);
loadWards();