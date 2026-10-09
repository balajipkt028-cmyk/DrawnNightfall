// ============================================================
// DRAWNNIGHTFALL — AUTH JAVASCRIPT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Password visibility toggle
    const toggleButtons = document.querySelectorAll(".password-toggle-btn");
    toggleButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === "password") {
                input.type = "text";
                btn.textContent = "🙈";
                btn.setAttribute("title", "Hide password");
                btn.setAttribute("aria-label", "Hide password");
            } else {
                input.type = "password";
                btn.textContent = "👁️";
                btn.setAttribute("title", "Show password");
                btn.setAttribute("aria-label", "Show password");
            }
        });
    });

    // 2. Demo Account Autofill on Sign In page
    const demoFillBtn = document.getElementById("demoAutofillBtn");
    if (demoFillBtn) {
        demoFillBtn.addEventListener("click", () => {
            const identifierInput = document.getElementById("identifier");
            const passwordInput = document.getElementById("password");
            if (identifierInput && passwordInput) {
                identifierInput.value = "demo";
                passwordInput.value = "password123";
                identifierInput.focus();

                // Flash button to indicate action
                const originalText = demoFillBtn.textContent;
                demoFillBtn.textContent = "Filled ✓";
                setTimeout(() => {
                    demoFillBtn.textContent = originalText;
                }, 1500);
            }
        });
    }

    // 3. Signup Password Matching Validation
    const passwordInput = document.getElementById("signupPassword");
    const confirmInput = document.getElementById("signupConfirmPassword");
    const feedbackEl = document.getElementById("passwordMatchFeedback");

    function checkPasswordsMatch() {
        if (!passwordInput || !confirmInput || !feedbackEl) return;
        const pass = passwordInput.value;
        const confirm = confirmInput.value;

        if (!confirm) {
            feedbackEl.className = "password-feedback";
            feedbackEl.textContent = "";
            return;
        }

        if (pass === confirm) {
            feedbackEl.className = "password-feedback match";
            feedbackEl.textContent = "Passwords match ✓";
        } else {
            feedbackEl.className = "password-feedback mismatch";
            feedbackEl.textContent = "Passwords do not match";
        }
    }

    if (passwordInput && confirmInput) {
        passwordInput.addEventListener("input", checkPasswordsMatch);
        confirmInput.addEventListener("input", checkPasswordsMatch);
    }

    // 4. Form Submit Loading Indicator
    const authForms = document.querySelectorAll(".auth-form");
    authForms.forEach((form) => {
        form.addEventListener("submit", () => {
            const submitBtn = form.querySelector(".auth-submit-btn");
            if (submitBtn) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.innerHTML = `
                    <span class="spinner" style="width: 18px; height: 18px; border-width: 2px; margin-right: 8px; display: inline-block; vertical-align: middle;"></span>
                    Processing...
                `;
                // In case submission errors or stays on page
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 5000);
            }
        });
    });
});
