(function () {
  const form = document.getElementById("support-form");
  const statusEl = document.getElementById("support-status");
  if (!form || !statusEl) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    statusEl.textContent = "Sending…";
    statusEl.className = "form-status";
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send message.");
      statusEl.textContent = "Thank you — we received your message and will reply by email.";
      statusEl.className = "form-status ok";
      form.reset();
    } catch (err) {
      statusEl.textContent = err.message || "Something went wrong.";
      statusEl.className = "form-status err";
    }
  });
})();
