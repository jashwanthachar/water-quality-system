document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const err = document.getElementById("error");
  err.textContent = "";

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    err.textContent = "Wrong email or password.";
    return;
  }
  window.location.href = "admin.html";
});