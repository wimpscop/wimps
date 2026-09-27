window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE = "https://backend-o5q5.onrender.com/api";
window.wimsNotify = (message, type = "info") => {
	const notice = document.createElement("div");
	notice.className = `wims-notice wims-notice-${type}`;
	notice.textContent = message;
	document.body.appendChild(notice);
	requestAnimationFrame(() => notice.classList.add("is-visible"));
	window.setTimeout(() => {
		notice.classList.remove("is-visible");
		window.setTimeout(() => notice.remove(), 250);
	}, 4500);
	if ("Notification" in window && Notification.permission === "granted" && message) {
		const title = {
			info: "WIMPS update",
			success: "Success",
			warning: "Heads up",
			error: "Action needed"
		}[type] || "WIMPS update";
		try {
			new Notification(title, { body: message, tag: `wimps-${Date.now()}` });
		} catch (error) {
			// Browser notification is best effort and must not block the page UI.
		}
	}
};
window.wimsNotice = (message, type = "info") => window.wimsNotify?.(message, type);
window.wimsAlert = (message, type = "warning") => window.wimsNotify?.(message, type);
const noticeStyle = document.createElement("style");
noticeStyle.textContent = ".wims-notice{position:fixed;right:20px;bottom:20px;z-index:9999;max-width:min(380px,calc(100vw - 40px));padding:14px 18px;border-radius:12px;background:linear-gradient(135deg,#172033,#21314c);color:#fff;box-shadow:0 14px 32px rgba(12,22,35,.28);font:700 14px/1.5 sans-serif;letter-spacing:.01em;opacity:0;transform:translateY(12px);transition:opacity .25s,transform .25s}.wims-notice.is-visible{opacity:1;transform:translateY(0)}.wims-notice-success{background:linear-gradient(135deg,#0e7a55,#17966b)}.wims-notice-error{background:linear-gradient(135deg,#a73c3c,#ca4e4e)}.wims-notice-warning{background:linear-gradient(135deg,#a5670e,#d28b13)}";
document.head.appendChild(noticeStyle);
if ("Notification" in window && Notification.permission === "default") {
	window.addEventListener("load", () => {
		Notification.requestPermission().catch(() => {});
	}, { once: true });
}
window.wimpsAuthHeaders = () => {
	try {
		const user = JSON.parse(localStorage.getItem("user") || "null");
		return user?.authToken ? { Authorization: `Bearer ${user.authToken}` } : {};
	} catch (error) {
		return {};
	}
};
window.wimpsLogout = (message) => {
	const user = (() => {
		try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (error) { return null; }
	})();
	localStorage.removeItem("user");
	localStorage.removeItem("accountStats");
	if (user?.email) localStorage.removeItem(`profilePicture:${user.email}`);
	if (message) window.wimsNotice?.(message, "warning");
	window.setTimeout(() => { window.location.href = "./login-page.html?v=3#signup"; }, 250);
};
window.wimpsSessionCheck = window.wimpsSessionCheck || null;
window.wimpsCheckSession = () => {
	if (window.wimpsSessionCheck) return window.wimpsSessionCheck;
	const check = (async () => {
	try {
		const rawUser = localStorage.getItem("user");
		const user = rawUser ? JSON.parse(rawUser) : null;
		if (!user?.authToken) return true;
		const configured = window.APP_CONFIG?.API_BASE;
		const apiBase = configured ? String(configured).replace(/\/$/, "") : (/localhost|127\.0\.0\.1/.test(window.location.hostname) ? "http://localhost:5000/api" : "/api");
		const response = await fetch(`${apiBase}/auth/session`, { headers: window.wimpsAuthHeaders() });
		if (response.status === 401) {
			const data = await response.json().catch(() => ({}));
			window.wimpsLogout(data.msg || "Your account was deleted. Create a new account to continue.");
			return false;
		}
		return true;
	} catch (error) {
		return true;
	}
})();
	window.wimpsSessionCheck = check.finally(() => { window.wimpsSessionCheck = null; });
	return window.wimpsSessionCheck;
};
window.wimpsCheckConfigVersion = async () => {
	try {
		const configured = window.APP_CONFIG?.API_BASE;
		const apiBase = configured ? String(configured).replace(/\/$/, "") : (/localhost|127\.0\.0\.1/.test(window.location.hostname) ? "http://localhost:5000/api" : "/api");
		const response = await fetch(`${apiBase}/config/version`, { cache: "no-store" });
		if (!response.ok) return;
		const version = String((await response.json()).version || 0);
		const previous = sessionStorage.getItem("wimps-config-version");
		sessionStorage.setItem("wimps-config-version", version);
		if (previous && previous !== version) window.location.reload();
	} catch (error) {
		// Configuration polling is best effort and must not block the page.
	}
};
document.addEventListener("DOMContentLoaded", () => window.wimpsCheckSession());
window.setInterval(() => window.wimpsCheckSession(), 60000);
window.setInterval(() => window.wimpsCheckConfigVersion(), 30000);
window.wimpsCheckConfigVersion();
