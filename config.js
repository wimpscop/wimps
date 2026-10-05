window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE = "https://backend-o5q5.onrender.com/api";
try {
	document.documentElement.dataset.theme = localStorage.getItem("wimps-theme") === "dark" ? "dark" : "light";
} catch (error) {
	document.documentElement.dataset.theme = "light";
}
window.wimsSetTheme = (theme) => {
	const isDark = theme === "dark";
	document.documentElement.dataset.theme = isDark ? "dark" : "light";
	try {
		localStorage.setItem("wimps-theme", isDark ? "dark" : "light");
	} catch (error) {
		// Keep the current page usable when browser storage is unavailable.
	}
	const themeColor = document.querySelector('meta[name="theme-color"]');
	if (themeColor) themeColor.content = isDark ? "#111a16" : "#f2f6f1";
	const toggle = document.querySelector(".theme-toggle");
	if (toggle) {
		toggle.setAttribute("aria-pressed", String(isDark));
		toggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
		toggle.querySelector(".theme-toggle-label").textContent = isDark ? "Light mode" : "Dark mode";
	}
};
document.addEventListener("DOMContentLoaded", () => {
	const navigation = document.querySelector(".header, .checker-nav, .rewards-shell > nav");
	if (!navigation || navigation.querySelector(".theme-toggle")) return;
	const toggle = document.createElement("button");
	toggle.className = "theme-toggle";
	toggle.type = "button";
	toggle.setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "dark"));
	const track = document.createElement("span");
	track.className = "theme-toggle-track";
	track.setAttribute("aria-hidden", "true");
	const thumb = document.createElement("span");
	thumb.className = "theme-toggle-thumb";
	track.appendChild(thumb);
	const label = document.createElement("span");
	label.className = "theme-toggle-label";
	const isDark = document.documentElement.dataset.theme === "dark";
	toggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
	label.textContent = isDark ? "Light mode" : "Dark mode";
	toggle.append(track, label);
	toggle.addEventListener("click", () => {
		window.wimsSetTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
	});
	const mobileActions = navigation.querySelector("#mobile");
	if (mobileActions) navigation.insertBefore(toggle, mobileActions);
	else navigation.appendChild(toggle);
});
window.wimsNotify = (message, type = "info", options = {}) => {
	if (!message) return null;
	const tone = ["success", "warning", "error"].includes(type) ? type : "info";
	let stack = document.querySelector(".wims-notice-stack");
	if (!stack) {
		stack = document.createElement("div");
		stack.className = "wims-notice-stack";
		stack.setAttribute("aria-label", "Notifications");
		document.body.appendChild(stack);
	}
	const notice = document.createElement("div");
	notice.className = `wims-notice wims-notice-${tone}`;
	notice.setAttribute("role", tone === "error" ? "alert" : "status");
	notice.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
	const mark = document.createElement("span");
	mark.className = "wims-notice-mark";
	mark.setAttribute("aria-hidden", "true");
	mark.textContent = tone === "success" ? "OK" : tone === "error" ? "!" : "i";
	const copy = document.createElement("span");
	copy.className = "wims-notice-copy";
	copy.textContent = String(message);
	const close = document.createElement("button");
	close.className = "wims-notice-close";
	close.type = "button";
	close.setAttribute("aria-label", "Dismiss notification");
	close.textContent = "x";
	const dismiss = () => {
		notice.classList.remove("is-visible");
		window.setTimeout(() => notice.remove(), 220);
	};
	close.addEventListener("click", dismiss);
	notice.append(mark, copy, close);
	stack.appendChild(notice);
	requestAnimationFrame(() => notice.classList.add("is-visible"));
	window.setTimeout(dismiss, Number(options.duration) || 5200);
	return notice;
};
window.wimsNotice = (message, type = "info", options) => window.wimsNotify(message, type, options);
window.wimsAlert = (message, type = "warning", options) => window.wimsNotify(message, type, options);
const noticeStyle = document.createElement("style");
noticeStyle.textContent = ".wims-notice-stack{position:fixed;top:88px;right:18px;z-index:1200;display:grid;gap:10px;width:min(410px,calc(100vw - 36px));pointer-events:none}.wims-notice{display:grid;grid-template-columns:34px minmax(0,1fr) 32px;align-items:center;gap:12px;min-height:64px;padding:12px 14px;border:1px solid #dce6dc;border-left:4px solid #18775e;border-radius:10px;background:#fff;color:#182821;box-shadow:0 16px 40px rgba(24,40,33,.18);font:600 14px/1.45 Spartan,sans-serif;opacity:0;transform:translateY(-8px) scale(.98);transition:opacity .2s ease,transform .2s ease;pointer-events:auto}.wims-notice.is-visible{opacity:1;transform:translateY(0) scale(1)}.wims-notice-success{border-left-color:#18775e}.wims-notice-error{border-left-color:#e87558}.wims-notice-warning{border-left-color:#c28a24}.wims-notice-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#e8f3ec;color:#164f40;font:800 10px/1 Spartan,sans-serif}.wims-notice-error .wims-notice-mark{background:#fff0eb;color:#b94c36}.wims-notice-warning .wims-notice-mark{background:#fbf4e5;color:#926817}.wims-notice-copy{overflow-wrap:anywhere}.wims-notice-close{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:7px;background:transparent;color:#63746b;font:700 16px/1 Spartan,sans-serif;cursor:pointer}.wims-notice-close:hover{background:#f2f6f1;color:#182821}@media(max-width:600px){.wims-notice-stack{top:76px;right:12px;width:calc(100vw - 24px)}}";
document.head.appendChild(noticeStyle);
window.wimsRedirectWithNotice = (destination, message, type = "info", duration) => {
	try {
		localStorage.setItem("wims-pending-notice", JSON.stringify({ message, type, duration, createdAt: Date.now() }));
	} catch (error) {
		// The redirect still works when browser storage is unavailable.
	}
	window.location.href = destination;
};
window.wimsCompletePurchase = (message) => window.wimsRedirectWithNotice("./history.html", message, "success", 9000);
document.addEventListener("DOMContentLoaded", () => {
	try {
		const pending = JSON.parse(localStorage.getItem("wims-pending-notice") || "null");
		localStorage.removeItem("wims-pending-notice");
		if (!pending?.message) return;
		if (Date.now() - Number(pending.createdAt || 0) > 5 * 60 * 1000) return;
		window.setTimeout(() => window.wimsNotice(pending.message, pending.type || "success", { duration: pending.duration }), 100);
	} catch (error) {
		try {
			localStorage.removeItem("wims-pending-notice");
		} catch (storageError) {
			// Notifications are best effort when browser storage is disabled.
		}
	}
});
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
		if (!user?.authToken) {
			if (user?.email) {
				window.wimpsLogout("Your session has expired. Please log in again.");
				return false;
			}
			return true;
		}
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
