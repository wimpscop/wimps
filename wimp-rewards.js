(() => {
  const apiBase = String(window.APP_CONFIG?.API_BASE || "/api").replace(/\/$/, "");
  const authHeaders = () => window.wimpsAuthHeaders?.() || {};
  const balance = document.getElementById("wimp-page-balance");
  const ledger = document.getElementById("wimp-ledger");

  async function loadRewards() {
    try {
      const [walletResponse, ledgerResponse] = await Promise.all([
        fetch(`${apiBase}/wimp/wallet`, { headers: authHeaders() }),
        fetch(`${apiBase}/wimp/transactions`, { headers: authHeaders() })
      ]);
      if (walletResponse.status === 401 || ledgerResponse.status === 401) {
        window.location.href = "./login-page.html?v=3#signup";
        return;
      }
      const wallet = await walletResponse.json();
      const entries = await ledgerResponse.json();
      if (!walletResponse.ok) throw new Error(wallet.msg || "Unable to load WIMP wallet");
      balance.textContent = `${Number(wallet.wallet?.balance || 0).toFixed(2)} WIMP`;
      const rows = Array.isArray(entries.data) ? entries.data : [];
      ledger.innerHTML = rows.length ? rows.map((entry) => `<div class="ledger-row ${entry.type === "spend" ? "debit" : ""}"><small>${entry.type.replaceAll("_", " ")}</small><span>${entry.description}</span><strong>${entry.type === "spend" ? "-" : "+"}${(Number(entry.amountUnits || 0) / 100).toFixed(2)}</strong></div>`).join("") : "<p>No WIMP activity yet.</p>";
    } catch (error) {
      ledger.innerHTML = `<p>${error.message || "Unable to load WIMP activity."}</p>`;
    }
  }

  loadRewards();
  window.setInterval(loadRewards, 30000);
})();
