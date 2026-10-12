async function loadWards() {
  const select = document.getElementById("wardSelect");
  const { data, error } = await db.from("wards").select("*").order("ward_id");

  if (error) {
    select.innerHTML = "<option>Could not load wards</option>";
    console.error(error);
    return;
  }

  select.innerHTML = data
    .map(w => `<option value="${w.ward_id}">${w.ward_name}</option>`)
    .join("");

  updateLink();
}

function updateLink() {
  const id = document.getElementById("wardSelect").value;
  document.getElementById("viewBtn").href = `water.html?ward=${id}`;
}

document.getElementById("wardSelect").addEventListener("change", updateLink);
loadWards();