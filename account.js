// account.js

const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
        return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "http://localhost:5000/api"
        : "/api";
})();

document.addEventListener("DOMContentLoaded", async () => {
    if (window.wimpsCheckSession && !(await window.wimpsCheckSession())) return;
    initializeAccount();
    setupAccountDepositButton();

    const connectBtn = document.getElementById("solana-connect-btn");
    const disconnectBtn = document.getElementById("solana-disconnect-btn");
    const refreshBtn = document.getElementById("solana-refresh-balance-btn");

    connectBtn?.addEventListener("click", connectSolanaWallet);
    disconnectBtn?.addEventListener("click", disconnectSolanaWallet);
    refreshBtn?.addEventListener("click", async () => {
        await refreshSolanaBalance(localStorage.getItem("solanaWalletAddress"));
    });
});

function getUser() {
    return JSON.parse(localStorage.getItem("user"));
}

function initializeAccount() {
    const user = getUser();

    const loggedInView = document.getElementById("logged-in");
    const notLoggedInView = document.getElementById("not-logged-in");

    if (!user || !user.email) {
        window.location.href = "./login-page.html?v=3#signup";
        return;
    }

    if (loggedInView) loggedInView.style.display = "block";
    if (notLoggedInView) notLoggedInView.style.display = "none";

    populateAccountInfo(user);
    setupReferral(user);
    setupProfileUpload(user);
    loadAccountData(user.email);
    window.setInterval(() => loadAccountData(user.email), 30000);
    setupLogout();
}

function setupReferral(user) {
    const code = user.referralCode || `WIMPS-${String(user.id || user.email).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`;
    const link = `${window.location.origin}/login-page.html?ref=${encodeURIComponent(code)}#signup`;
    const linkInput = document.getElementById('referral-link');
    const count = document.getElementById('referral-count');
    if (linkInput) linkInput.value = link;
    if (count) count.textContent = `${Number(user.referralCount || 0)} referrals`;
    document.getElementById('copy-referral-link')?.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(link);
        window.wimsNotice?.('Referral link copied.', 'success');
    });
}

function setupProfileUpload(user) {
    const uploadInput = document.getElementById("profile-upload");
    const uploadButton = document.getElementById("upload-btn");
    const pictureContainer = document.getElementById("picture-container");
    const picture = document.getElementById("profile-picture");

    if (!uploadInput || !picture || !user?.email) return;

    const savedPicture = localStorage.getItem(`profilePicture:${user.email}`);
    if (savedPicture) renderProfilePicture(savedPicture, picture);

    const openFilePicker = () => uploadInput.click();
    uploadButton?.addEventListener("click", openFilePicker);
    pictureContainer?.addEventListener("click", openFilePicker);

    uploadInput.addEventListener("change", () => {
        const [file] = uploadInput.files || [];
        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const imageData = String(reader.result);
            localStorage.setItem(`profilePicture:${user.email}`, imageData);
            renderProfilePicture(imageData, picture);
        });
        reader.readAsDataURL(file);
    });
}

function renderProfilePicture(imageData, picture) {
    picture.innerHTML = "";
    const image = document.createElement("img");
    image.src = imageData;
    image.alt = "Profile picture";
    picture.appendChild(image);
}

// ==========================
// BASIC INFO
// ==========================
function populateAccountInfo(user) {
    const fullname = document.getElementById("fullname");
    const email = document.getElementById("email");
    const memberSince = document.getElementById("member-since");

    if (fullname) fullname.value = user.fullname || "";
    if (email) email.value = user.email || "";

    if (memberSince && user.createdAt) {
        memberSince.value = new Date(user.createdAt).toLocaleDateString();
    }
}

// ==========================
// LOAD DATA
// ==========================
async function loadSolanaStatus() {
    try {
        const panel = document.getElementById("solana-status-panel");
        const badge = document.getElementById("solana-status-badge");
        const details = document.getElementById("solana-details");
        if (!panel || !badge || !details) return;

        const response = await fetch(`${API_BASE}/solana/feature-flags`, {
            headers: window.wimpsAuthHeaders()
        });

        if (!response.ok) {
            panel.style.display = "block";
            badge.textContent = "Unknown";
            details.textContent = "Solana wallet features are currently unavailable.";
            return;
        }

        const payload = await response.json();
        const enabled = Boolean(payload.flags?.WIMP_WALLET_CONNECTION);
        badge.textContent = enabled ? "Enabled" : "Disabled";
        details.textContent = enabled
            ? "Solana wallet support is available in this environment. Public activation remains subject to approval and protection checks."
            : "Solana wallet access remains disabled until the mint, network, and compliance approvals are complete.";
        panel.style.display = "block";
    } catch (error) {
        console.warn("Solana status unavailable:", error);
    }
}

async function loadAccountData(email) {
    try {
        await loadSolanaStatus();
        await loadSolanaWalletUI();

        const wimpRes = await fetch(`${API_BASE}/wimp/wallet`, { headers: window.wimpsAuthHeaders() });
        if (wimpRes.ok) {
            const wimpData = await wimpRes.json();
            const wimpBalance = document.getElementById("wimp-balance");
            if (wimpBalance) wimpBalance.textContent = `${Number(wimpData.wallet?.balance || 0).toFixed(2)} WIMP`;
        }

        // ===== WALLET =====
        const walletRes = await fetch(`${API_BASE}/wallet/${email}`, {
            headers: window.wimpsAuthHeaders()
        });

        if (walletRes.status === 401) {
            window.wimpsLogout?.("Your account was deleted. Create a new account to continue.");
            return;
        }
        if (!walletRes.ok) throw new Error("Wallet request failed");

        const walletData = await walletRes.json();
        const balance = Number(walletData.balance || 0);

        const balanceEl = document.getElementById("account-balance");
        if (balanceEl) {
            balanceEl.textContent = "GHS " + balance.toFixed(2);
        }

        // sync localStorage
        const user = getUser();
        user.balance = balance;
        localStorage.setItem("user", JSON.stringify(user));

        // ===== TRANSACTIONS =====
        const txRes = await fetch(`${API_BASE}/transactions/${email}`, {
            headers: window.wimpsAuthHeaders()
        });

        if (!txRes.ok) throw new Error("Transactions request failed");

        const transactions = await txRes.json();

        // TOTAL TRANSACTIONS
        const totalTxEl = document.getElementById("total-transactions");
        if (totalTxEl) {
            totalTxEl.textContent = transactions.length;
        }

        // TOTAL ORDERS (only purchases)
        const totalOrdersEl = document.getElementById("total-orders");
        const orders = transactions.filter(tx => tx.type === "purchase");

        if (totalOrdersEl) {
            totalOrdersEl.textContent = orders.length;
        }

        localStorage.setItem("accountStats", JSON.stringify({
            totalOrders: orders.length,
            totalTransactions: transactions.length,
            balance
        }));

        // (optional debug)
        console.log("Transactions:", transactions);

    } catch (err) {
        console.error("Account load error:", err);
    }
}

// ==========================
// LOGOUT
// ==========================
function setupAccountDepositButton() {
    const amountInput = document.getElementById("deposit-amount");
    const depositBtn = document.getElementById("account-deposit-paystack");

    if (!amountInput || !depositBtn) return;

    depositBtn.addEventListener("click", async () => {
        const amount = Number(amountInput.value);
        if (!Number.isFinite(amount) || amount < 10) {
            window.wimsAlert("Enter a valid deposit amount of at least GHS 10.");
            return;
        }

        await openPaystackDeposit(amount);
    });
}

function getSolanaProvider() {
    return (window.phantom && window.phantom.solana) || window.solana || null;
}

function setSolanaWalletInput(address) {
    const input = document.getElementById("solana-wallet-address");
    if (input) input.value = address || "";
}

function setSolanaWalletText(statusText, badgeText) {
    const status = document.getElementById("solana-wallet-status");
    const badge = document.getElementById("solana-wallet-connection-badge");
    if (status) status.textContent = statusText;
    if (badge) badge.textContent = badgeText;
}

async function refreshSolanaBalance(publicKey = localStorage.getItem("solanaWalletAddress")) {
    const balanceEl = document.getElementById("solana-wallet-balance");
    const mintEl = document.getElementById("solana-wallet-mint");
    if (!balanceEl) return;

    if (!publicKey) {
        balanceEl.textContent = "0.000000 WIMP";
        if (mintEl) mintEl.textContent = "UNAPPROVED";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/solana/wallet/balance?publicKey=${encodeURIComponent(publicKey)}`, {
            headers: window.wimpsAuthHeaders()
        });
        const payload = await response.json();
        const balance = Number(payload.balance || 0);
        const mint = payload.mintAddress || "UNAPPROVED";
        const decimals = Number(payload.decimals || 9);
        const formatted = balance.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals === 0 ? 0 : 6
        });
        if (mintEl) mintEl.textContent = mint;
        balanceEl.textContent = `${formatted} WIMP`;
    } catch (error) {
        console.warn("Solana balance refresh failed:", error);
        balanceEl.textContent = "0.000000 WIMP";
    }
}

async function loadSolanaWalletUI() {
    const panel = document.getElementById("solana-wallet-panel");
    const featureFlags = await fetch(`${API_BASE}/solana/feature-flags`, {
        headers: window.wimpsAuthHeaders()
    }).then((response) => response.ok ? response.json() : null).catch(() => null);

    if (!panel || !featureFlags || !featureFlags.flags || !featureFlags.flags.WIMP_WALLET_CONNECTION) {
        if (panel) panel.style.display = "none";
        return;
    }

    panel.style.display = "block";
    const provider = getSolanaProvider();
    const savedWallet = localStorage.getItem("solanaWalletAddress");
    const connected = Boolean(provider && provider.isConnected && provider.isConnected) || Boolean(savedWallet);

    const connectBtn = document.getElementById("solana-connect-btn");
    const disconnectBtn = document.getElementById("solana-disconnect-btn");
    const refreshBtn = document.getElementById("solana-refresh-balance-btn");

    if (connectBtn) connectBtn.style.display = connected ? "none" : "inline-flex";
    if (disconnectBtn) disconnectBtn.style.display = connected ? "inline-flex" : "none";
    if (refreshBtn) refreshBtn.style.display = connected ? "inline-flex" : "none";

    if (connected) {
        const publicKey = provider && provider.publicKey ? provider.publicKey.toString() : savedWallet;
        setSolanaWalletInput(publicKey || "");
        setSolanaWalletText("Connected to a compatible Solana wallet.", "Connected");
        if (publicKey) {
            localStorage.setItem("solanaWalletAddress", publicKey);
            await refreshSolanaBalance(publicKey);
        }
        return;
    }

    setSolanaWalletInput("");
    setSolanaWalletText("Connect a compatible wallet to view and manage your WIMP token balance.", "Disconnected");
    await refreshSolanaBalance();
}

async function connectSolanaWallet() {
    const provider = getSolanaProvider();
    if (!provider) {
        window.wimsAlert("Install Phantom or another compatible Solana wallet to continue.");
        return;
    }

    try {
        await provider.connect();
        const publicKey = provider.publicKey && provider.publicKey.toString ? provider.publicKey.toString() : "";
        if (!publicKey) {
            throw new Error("Wallet did not return a public key");
        }

        const nonceResponse = await fetch(`${API_BASE}/solana/wallet/nonce`, {
            method: "POST",
            headers: { ...window.wimpsAuthHeaders(), "Content-Type": "application/json" }
        });
        const noncePayload = await nonceResponse.json();
        if (!nonceResponse.ok || !noncePayload.data || !noncePayload.data.nonce) {
            throw new Error(noncePayload.error || "Unable to create a wallet verification nonce");
        }

        const message = new TextEncoder().encode(`WIMPS wallet verification: ${noncePayload.data.nonce}`);
        const signed = await provider.signMessage(message, "utf8");
        const signature = typeof signed?.signature === "string"
            ? signed.signature
            : btoa(String.fromCharCode(...new Uint8Array(signed.signature || [])));

        const verifyResponse = await fetch(`${API_BASE}/solana/wallet/verify`, {
            method: "POST",
            headers: { ...window.wimpsAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
                nonce: noncePayload.data.nonce,
                publicKey,
                signature
            })
        });

        const verifyPayload = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyPayload.ok) {
            throw new Error(verifyPayload.error || "Wallet verification failed");
        }

        localStorage.setItem("solanaWalletAddress", publicKey);
        setSolanaWalletInput(publicKey);
        setSolanaWalletText("Connected to a compatible Solana wallet.", "Connected");
        await refreshSolanaBalance(publicKey);
        window.wimsNotice?.("Solana wallet connected.", "success");
    } catch (error) {
        console.error("Solana wallet connection failed:", error);
        window.wimsAlert(error.message || "Unable to connect your Solana wallet.");
    }
}

async function disconnectSolanaWallet() {
    const provider = getSolanaProvider();
    if (provider && provider.disconnect) {
        try {
            await provider.disconnect();
        } catch (error) {
            console.warn("Disconnect signal failed:", error);
        }
    }

    localStorage.removeItem("solanaWalletAddress");
    setSolanaWalletInput("");
    setSolanaWalletText("Connect a compatible wallet to view and manage your WIMP token balance.", "Disconnected");
    await refreshSolanaBalance();
    window.wimsNotice?.("Solana wallet disconnected.", "success");
}

function setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        localStorage.removeItem("solanaWalletAddress");
        window.location.href = "login-page.html";
    });
}

