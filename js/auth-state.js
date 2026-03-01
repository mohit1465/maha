import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const headerProfileIcon = document.querySelector('.header-icons .fa-user');
    const headerProfileLink = headerProfileIcon?.closest('a');

    const mobileProfileIcon = document.querySelector('.mobile-nav-icons .fa-user');
    const mobileProfileLink = mobileProfileIcon?.closest('a');

    // Handle logout button if it exists on the page (e.g., in profile.html)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = "login.html";
            } catch (error) {
                console.error("Logout failed", error);
            }
        });
    }

    window.isAuthReady = false;
    window.currentUser = null;

    onAuthStateChanged(auth, (user) => {
        window.isAuthReady = true;
        window.currentUser = user;

        const headerWishlistIcon = document.querySelector('.icon[data-section="wishlist"] i');
        const mobileWishlistIcon = document.querySelector('.mobile-nav-icons a[data-section="wishlist"] i');

        if (user) {
            console.log("Global Auth: User logged in", user.email);

            // Populate profile elements if they exist
            const userNameEl = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');
            if (userNameEl) userNameEl.textContent = user.displayName || user.email.split('@')[0];
            if (userEmailEl) userEmailEl.textContent = user.email;

            // Redirect logic for admin vs user
            const isAdmin = user.email === 'admin@maharaja.com';
            const profileTarget = isAdmin ? "admin.html" : "profile.html";

            if (headerProfileLink) headerProfileLink.href = profileTarget;
            if (mobileProfileLink) mobileProfileLink.href = profileTarget;

        } else {
            console.log("Global Auth: User logged out");

            if (headerProfileLink) headerProfileLink.href = "login.html";
            if (mobileProfileLink) mobileProfileLink.href = "login.html";

            // Redirect if on protected page
            const protectedPages = ['profile.html', 'wishlist.html', 'cart.html', 'admin.html', 'orders.html'];
            const pathParts = window.location.pathname.split('/');
            const currentPage = pathParts[pathParts.length - 1];

            if (protectedPages.includes(currentPage)) {
                window.location.href = "login.html";
            }
        }

        // Dispatch a custom event to notify other scripts that auth is ready
        document.dispatchEvent(new CustomEvent('authReady', { detail: user }));
    });

    /**
     * Centralized function to check auth before navigating to protected pages.
     * @param {string} section The section/page to navigate to.
     * @param {string} url Optional direct URL to navigate to.
     */
    window.checkAuthAndNavigate = function (section, url) {
        const protectedSections = ['profile', 'wishlist', 'cart', 'orders', 'admin'];
        const targetUrl = url || (section === 'home' ? 'index.html' : `${section}.html`);

        if (protectedSections.includes(section)) {
            if (!window.isAuthReady) {
                // If auth isn't ready yet, wait for it
                document.addEventListener('authReady', () => {
                    const currentUser = window.currentUser;
                    if (currentUser) {
                        window.location.href = targetUrl;
                    } else {
                        window.location.href = 'login.html';
                    }
                }, { once: true });
                return;
            }

            if (!window.currentUser) {
                window.location.href = 'login.html';
                return;
            }
        }

        window.location.href = targetUrl;
    };
});
