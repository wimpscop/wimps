(() => {
    const toggleSignupLink = document.getElementById('toggle-signup');
    const toggleLoginLink = document.getElementById('toggle-login');
    const loginBox = document.querySelector('.login-form');
    const signupBox = document.querySelector('.signup-form');

    if (window.location.hash === '#signup') {
        loginBox?.classList.remove('active');
        signupBox?.classList.add('active');
    }

    if (toggleSignupLink && toggleLoginLink) {
        toggleSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginBox.classList.remove('active');
            signupBox.classList.add('active');
            history.replaceState(null, '', '#signup');
        });

        toggleLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupBox.classList.remove('active');
            loginBox.classList.add('active');
            history.replaceState(null, '', '#login');
        });
    }

    const API_BASE = (() => {
        const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
        if (configured) {
            return String(configured).replace(/\/$/, "");
        }

        return /localhost|127\.0\.0\.1/.test(window.location.hostname)
            ? "http://localhost:5000/api"
            : "/api";
    })();

    async function readApiResponse(response) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) return response.json();
        const text = await response.text();
        return { msg: text.trim() || `Request failed with status ${response.status}` };
    }

    function saveAuthenticatedUser(user) {
        localStorage.setItem("user", JSON.stringify({
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            balance: user.balance || 0,
            referralCode: user.referralCode || "",
            referralCount: user.referralCount || 0,
            referralCredits: user.referralCredits || 0,
            createdAt: user.createdAt,
            authToken: user.authToken
        }));
        window.location.href = "./account.html";
    }

    const authModal = document.getElementById("auth-modal");
    const authModalTitle = document.getElementById("auth-modal-title");
    const authModalText = document.getElementById("auth-modal-text");
    const authModalLabel = document.getElementById("auth-modal-label");
    const authModalInput = document.getElementById("auth-modal-input");
    const authModalPassword = document.getElementById("auth-modal-password");
    const authModalForm = document.getElementById("auth-modal-form");
    const authModalClose = document.getElementById("auth-modal-close");
    const authModalCancel = document.getElementById("auth-modal-cancel");

    function closeAuthModal() {
        authModal?.classList.add("hidden");
        authModal?.setAttribute("aria-hidden", "true");
        if (authModalForm) authModalForm.dataset.action = "";
    }

    function openAuthModal({ title, text, label, placeholder, action, inputType = "email", buttonText = "Submit" }) {
        if (!authModal || !authModalTitle || !authModalText || !authModalLabel || !authModalInput || !authModalPassword || !authModalForm) return;
        authModalTitle.textContent = title;
        authModalText.textContent = text;
        authModalLabel.textContent = label;
        authModalInput.type = inputType;
        authModalInput.placeholder = placeholder;
        authModalInput.value = "";
        authModalPassword.value = "";
        authModalPassword.classList.toggle("hidden", action !== "reset");
        authModalPassword.setAttribute("placeholder", "New password");
        authModalPassword.type = "password";
        authModalInput.classList.toggle("hidden", action === "reset");
        authModalForm.dataset.action = action;
        const submitButton = authModalForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.textContent = buttonText;
        authModal.classList.remove("hidden");
        authModal.setAttribute("aria-hidden", "false");
    }

    authModalClose?.addEventListener("click", closeAuthModal);
    authModalCancel?.addEventListener("click", closeAuthModal);
    authModal?.addEventListener("click", (event) => {
        if (event.target === authModal) closeAuthModal();
    });

    document.getElementById("forgot-password-link")?.addEventListener("click", async (event) => {
        event.preventDefault();
        openAuthModal({
            title: "Reset password",
            text: "Enter the email address linked to your account and we'll send a reset link.",
            label: "Email address",
            placeholder: "you@example.com",
            action: "forgot",
            buttonText: "Send link"
        });
    });

    authModalForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const action = authModalForm.dataset.action;
        if (action === "forgot") {
            const email = String(authModalInput.value || "").trim();
            if (!email) return window.wimsAlert("Please enter your email address.");
            try {
                const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await readApiResponse(response);
                closeAuthModal();
                if (!response.ok) return window.wimsNotice?.(data.msg || "Unable to start password reset.", "error");
                window.wimsNotice?.(data.msg || "Check your email for a password reset link.", "success");
            } catch (err) {
                closeAuthModal();
                window.wimsNotice?.("Unable to connect to server. Please try again.", "error");
            }
            return;
        }

        if (action === "reset") {
            const password = String(authModalPassword.value || "").trim();
            const resetEmail = new URLSearchParams(window.location.search).get("email") || "";
            const token = new URLSearchParams(window.location.search).get("reset") || "";
            if (!password || password.length < 6) return window.wimsAlert("Password must be at least 6 characters.");
            if (!token || !resetEmail) return window.wimsAlert("The reset link is missing required information.");
            try {
                const response = await fetch(`${API_BASE}/auth/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: resetEmail, token, password })
                });
                const data = await readApiResponse(response);
                closeAuthModal();
                if (!response.ok) return window.wimsNotice?.(data.msg || "Password reset failed.", "error");
                window.wimsNotice?.(data.msg || "Password reset complete.", "success");
                setTimeout(() => window.location.href = "./login-page.html#login", 800);
            } catch (err) {
                closeAuthModal();
                window.wimsNotice?.("Unable to connect to server. Please try again.", "error");
            }
        }
    });

    const resetParams = new URLSearchParams(window.location.search);
    const resetToken = resetParams.get("reset");
    const resetEmail = resetParams.get("email");
    if (resetToken && resetEmail) {
        openAuthModal({
            title: "Create new password",
            text: "Choose a new password for your WIMPS account.",
            label: "New password",
            placeholder: "At least 6 characters",
            action: "reset",
            inputType: "password",
            buttonText: "Update password"
        });
    }

    // Password toggle functionality
    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const input = document.getElementById(toggle.dataset.passwordToggle);
            if (!input) return;
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
            toggle.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });

    // Signup email existence check
    const signupEmailInput = document.getElementById('signup-email');
    const signupEmailHint = document.getElementById('signup-email-hint');
    let emailCheckDebounce = null;

    if (signupEmailInput && signupEmailHint) {
        signupEmailInput.addEventListener('blur', async () => {
            const email = String(signupEmailInput.value || "").trim().toLowerCase();
            if (!email || !email.includes('@')) return;

            clearTimeout(emailCheckDebounce);
            emailCheckDebounce = setTimeout(async () => {
                signupEmailHint.textContent = 'Checking...';
                signupEmailHint.style.color = '#666';

                try {
                    const response = await fetch(`${API_BASE}/auth/check-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email })
                    });
                    const data = await readApiResponse(response);

                    if (data.exists) {
                        signupEmailHint.textContent = 'An account with this email already exists. Please login instead.';
                        signupEmailHint.style.color = '#a83232';
                        signupEmailInput.setAttribute('aria-invalid', 'true');
                    } else {
                        signupEmailHint.textContent = 'Email is available';
                        signupEmailHint.style.color = '#16794c';
                        signupEmailInput.removeAttribute('aria-invalid');
                    }
                } catch (err) {
                    signupEmailHint.textContent = '';
                    signupEmailInput.removeAttribute('aria-invalid');
                }
            }, 500);
        });

        // Clear hint on focus
        signupEmailInput.addEventListener('focus', () => {
            clearTimeout(emailCheckDebounce);
            signupEmailHint.textContent = '';
            signupEmailInput.removeAttribute('aria-invalid');
        });
    }

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            if (!email || !password) {
                window.wimsAlert("Please fill in all fields.");
                return;
            }

            try {
                const submitButton = loginForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Logging in...";
                }

                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await readApiResponse(res);

                if (res.ok) {
                    window.wimsNotice?.("Login successful.", "success");
                    const user = {
                        id: data.user.id,
                        fullname: data.user.fullname,
                        email: data.user.email,
                        balance: data.user.balance || 0,
                        referralCode: data.user.referralCode || "",
                        referralCount: data.user.referralCount || 0,
                        referralCredits: data.user.referralCredits || 0,
                        createdAt: data.user.createdAt,
                        authToken: data.user.authToken
                    };
                    localStorage.setItem("user", JSON.stringify(user));
                    window.location.href = "./account.html";
                    return;
                }

                // Check if error is about user not existing
                if (data.msg && data.msg.toLowerCase().includes('invalid credentials')) {
                    window.wimsAlert("Invalid email or password. Please check your credentials.");
                } else {
                    window.wimsAlert(data.msg || "Login failed");
                }
            } catch (err) {
                console.error(err);
                window.wimsAlert("Unable to connect to server. Please check your internet connection and try again.");
            } finally {
                const submitButton = loginForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Login";
                }
            }
        });
    }

    const signupForm = document.querySelector('.signup-form form');

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const fullname = document.getElementById('signup-fullname').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm').value;

            if (!fullname || !email || !password || !confirmPassword) {
                window.wimsAlert("Please fill in all fields.");
                return;
            }

            if (password !== confirmPassword) {
                window.wimsAlert("Passwords do not match.");
                return;
            }

            if (password.length < 6) {
                window.wimsAlert("Password must be at least 6 characters.");
                return;
            }

            // Check if email hint shows account exists
            if (signupEmailHint && signupEmailHint.textContent.includes('already exists')) {
                window.wimsAlert("An account with this email already exists. Please login instead.");
                return;
            }

            try {
                const submitButton = signupForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Creating account...";
                }

                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fullname,
                        email,
                        password,
                        referralCode: new URLSearchParams(window.location.search).get("ref") || ""
                    })
                });

                const data = await readApiResponse(res);

                if (res.ok) {
                    window.wimsNotice?.("Account created successfully.", "success");
                    signupBox.classList.remove('active');
                    loginBox.classList.add('active');
                    document.getElementById('email').value = email;
                    document.getElementById('email').focus();
                    history.replaceState(null, '', '#login');
                } else {
                    if (data.msg && data.msg.toLowerCase().includes('already exists')) {
                        window.wimsAlert("An account with this email already exists. Please login instead.");
                        signupEmailHint.textContent = 'An account with this email already exists. Please login instead.';
                        signupEmailHint.style.color = '#a83232';
                    } else {
                        window.wimsAlert(data.msg || "Signup failed.");
                    }
                }
            } catch (err) {
                console.error(err);
                window.wimsAlert("Unable to connect to server. Please check your internet connection and try again.");
            } finally {
                const submitButton = signupForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Sign Up";
                }
            }
        });
    }
})();