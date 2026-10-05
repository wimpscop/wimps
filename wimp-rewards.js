(() => {
  const apiBase = String(window.APP_CONFIG?.API_BASE || "/api").replace(/\/$/, "");
  const authHeaders = () => window.wimpsAuthHeaders?.() || {};
  const balance = document.getElementById("wimp-page-balance");
  const tokenBalance = document.getElementById("wimp-token-balance");
  const ledger = document.getElementById("wimp-ledger");
  const buyForm = document.getElementById("wimp-buy-form");
  const spendForm = document.getElementById("wimp-spend-form");

  function formatWimp(value, digits = 2) {
    return `${Number(value || 0).toFixed(digits)} WIMP`;
  }

  async function loadRewards() {
    try {
      const [walletResponse, ledgerResponse, tokenResponse] = await Promise.all([
        fetch(`${apiBase}/wimp/wallet`, { headers: authHeaders() }),
        fetch(`${apiBase}/wimp/transactions`, { headers: authHeaders() }),
        fetch(`${apiBase}/wimp/token/balance`, { headers: authHeaders() })
      ]);
      if (walletResponse.status === 401 || ledgerResponse.status === 401 || tokenResponse.status === 401) {
        const message = "Sign in to view and manage WIMP rewards.";
        if (window.wimsRedirectWithNotice) {
          window.wimsRedirectWithNotice("./login-page.html?v=3#signup", message, "info");
        } else {
          window.location.href = "./login-page.html?v=3#signup";
        }
        return;
      }
      const wallet = await walletResponse.json();
      const entries = await ledgerResponse.json();
      const token = await tokenResponse.json();
      if (!walletResponse.ok) throw new Error(wallet.msg || "Unable to load WIMP wallet");
      if (!tokenResponse.ok) throw new Error(token.msg || "Unable to load WIMP token balance");
      balance.textContent = formatWimp(wallet.wallet?.balance || 0, 2);
      if (tokenBalance) tokenBalance.textContent = formatWimp(token.balance || 0, 2);
      const rows = Array.isArray(entries.data) ? entries.data : [];
      ledger.innerHTML = rows.length ? rows.map((entry) => `<div class="ledger-row ${entry.type === "spend" ? "debit" : ""}"><small>${entry.type.replaceAll("_", " ")}</small><span>${entry.description}</span><strong>${entry.type === "spend" ? "-" : "+"}${(Number(entry.amountUnits || 0) / 100).toFixed(2)}</strong></div>`).join("") : "<p>No WIMP activity yet.</p>";
    } catch (error) {
      ledger.innerHTML = `<p>${error.message || "Unable to load WIMP activity."}</p>`;
    }
  }

  async function createPurchase(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      window.wimsAlert?.("Enter a valid WIMP purchase amount.");
      return;
    }
    try {
      const response = await fetch(`${apiBase}/wimp/token/purchase`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ amount: value, source: "app" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.msg || "Unable to buy WIMP token");
      await loadRewards();
      window.wimsNotice?.("WIMP token purchased successfully.", "success");
    } catch (error) {
      window.wimsAlert?.(error.message || "Unable to buy WIMP token.");
    }
  }

  async function createSpend(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      window.wimsAlert?.("Enter a valid WIMP spend amount.");
      return;
    }
    try {
      const response = await fetch(`${apiBase}/wimp/token/spend`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ amount: value, description: "App purchase with WIMP token" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.msg || "Unable to spend WIMP token");
      await loadRewards();
      window.wimsNotice?.("WIMP token used for your app purchase.", "success");
    } catch (error) {
      window.wimsAlert?.(error.message || "Unable to spend WIMP token.");
    }
  }

  buyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("token-buy-amount");
    await createPurchase(input?.value || 0);
  });

  spendForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("token-spend-amount");
    await createSpend(input?.value || 0);
  });

  loadRewards();
  window.setInterval(loadRewards, 30000);
})();
