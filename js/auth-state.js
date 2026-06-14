import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const headerProfileIcon = document.querySelector('.header-icons [data-section="profile"]');
    const headerProfileLink = headerProfileIcon?.closest('a');

    const mobileProfileLink = document.querySelector('.mobile-nav-icons a[data-section="profile"]');

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

    onAuthStateChanged(auth, async (user) => {
        window.isAuthReady = true;
        window.currentUser = user;

        const headerIconsContainer = document.querySelector('.header-icons');
        if (headerIconsContainer) {
            const profileIcon = headerIconsContainer.querySelector('[data-section="profile"]');
            const wishlistIcon = headerIconsContainer.querySelector('[data-section="wishlist"]');
            const cartIcon = headerIconsContainer.querySelector('[data-section="cart"]');
            
            let loginBtn = headerIconsContainer.querySelector('.header-login-btn');
            if (!loginBtn) {
                loginBtn = document.createElement('a');
                loginBtn.href = 'login.html';
                loginBtn.className = 'btn btn-primary header-login-btn';
                loginBtn.style.padding = '4px 18px';
                loginBtn.style.height = '32px';
                loginBtn.style.minHeight = '32px';
                loginBtn.style.marginLeft = '12px';
                loginBtn.style.textDecoration = 'none';
                loginBtn.style.borderRadius = '50px';
                loginBtn.style.fontSize = '0.85rem';
                loginBtn.textContent = 'Login';
                headerIconsContainer.appendChild(loginBtn);
            }

            if (user) {
                if (profileIcon) profileIcon.style.display = 'block';
                if (wishlistIcon) wishlistIcon.style.display = 'block';
                if (cartIcon) cartIcon.style.display = 'block';
                loginBtn.style.display = 'none';
            } else {
                if (profileIcon) profileIcon.style.display = 'none';
                if (wishlistIcon) wishlistIcon.style.display = 'none';
                if (cartIcon) cartIcon.style.display = 'none';
                loginBtn.style.display = 'inline-flex';
                loginBtn.style.alignItems = 'center';
            }
        }

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
            if (mobileProfileLink) {
                mobileProfileLink.href = profileTarget;
                const btnSpan = mobileProfileLink.querySelector('.mobile-profile-btn');
                if (btnSpan) {
                    btnSpan.innerHTML = '<lord-icon src="https://cdn.lordicon.com/spzqjmbt.json" trigger="hover" colors="primary:#ffffff" style="width:24px;height:24px"></lord-icon>';
                    btnSpan.classList.remove('login-pill');
                    btnSpan.style.background = '';
                    btnSpan.style.color = '';
                    btnSpan.style.boxShadow = '';
                    btnSpan.style.padding = '';
                    btnSpan.style.opacity = '';
                }
            }

            // --- Desktop Header Location Feature ---
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const userData = userDocSnap.exists() ? userDocSnap.data() : {};
                
                const firstName = (user.displayName || user.email.split('@')[0]).split(' ')[0];
                let userLocation = null;
                let showPopup = false;
                
                if (userData.currentLocation) {
                    userLocation = userData.currentLocation;
                } else if (userData.addresses && userData.addresses.length > 0) {
                    userLocation = userData.addresses[0].city || "Saved Address";
                } else if (sessionStorage.getItem('skippedLocation')) {
                    userLocation = "Select Location";
                } else {
                    userLocation = "Select Location";
                    showPopup = true;
                }

                // Inject into Header
                if (headerProfileLink) {
                    let infoContainer = document.getElementById('headerUserInfo');
                    if (!infoContainer) {
                        infoContainer = document.createElement('div');
                        infoContainer.id = 'headerUserInfo';
                        infoContainer.className = 'header-user-info';
                        infoContainer.onclick = () => renderLocationPopup(user.uid);
                        headerProfileLink.insertAdjacentElement('afterend', infoContainer);
                    }
                    
                    infoContainer.innerHTML = `
                        <span class="header-user-name">Hi, ${firstName} <i class="fas fa-chevron-down header-chevron"></i></span>
                        <span class="header-user-location" id="headerUserLocationText"><i class="fas fa-map-marker-alt"></i> ${userLocation}</span>
                    `;
                    
                    if (showPopup) {
                        renderLocationPopup(user.uid);
                    }
                }
            } catch (err) {
                console.error("Error setting up header location", err);
            }
            // --- End Desktop Header Location Feature ---

        } else {
            console.log("Global Auth: User logged out");

            if (headerProfileLink) headerProfileLink.href = "login.html";
            if (mobileProfileLink) {
                mobileProfileLink.href = "login.html";
                const btnSpan = mobileProfileLink.querySelector('.mobile-profile-btn');
                if (btnSpan) {
                    btnSpan.textContent = 'Login';
                    btnSpan.classList.add('login-pill');
                    btnSpan.style.opacity = '1';
                    // Clear inline styles that might conflict
                    btnSpan.style.background = '';
                    btnSpan.style.color = '';
                    btnSpan.style.boxShadow = '';
                    btnSpan.style.padding = '';
                }
            }

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

    // --- Desktop Header Location Popup Logic ---
    window.renderLocationPopup = function(uid) {
        const infoContainer = document.getElementById('headerUserInfo');
        let existingPopup = document.getElementById('headerLocationPopup');
        
        // Define cleanup function to close popup properly
        const closePopup = () => {
            const popupEl = document.getElementById('headerLocationPopup');
            if (popupEl) popupEl.remove();
            if (infoContainer) infoContainer.classList.remove('active');
            document.removeEventListener('click', closePopupOnOutsideClick);
        };

        const closePopupOnOutsideClick = (e) => {
            if (infoContainer && !infoContainer.contains(e.target)) {
                closePopup();
            }
        };

        if (existingPopup) {
            closePopup();
            return; // Toggle off if already showing
        }

        if (!infoContainer) return;
        infoContainer.classList.add('active');

        const popup = document.createElement('div');
        popup.id = 'headerLocationPopup';
        popup.className = 'location-popup-widget';
        popup.innerHTML = `
            <div class="loc-header-icon-container">
                <div class="loc-icon-ring">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
            </div>
            <h4>Set Your Location</h4>
            <p>Get accurate delivery estimates and localized offers.</p>
            <button class="loc-btn loc-detect-btn" id="locDetectBtn">
                <i class="fas fa-location-arrow"></i> Detect Automatically
            </button>
            <button class="loc-btn loc-manual-btn" id="locManualBtn">
                <i class="fas fa-pencil-alt"></i> Enter Manually
            </button>
            <div class="loc-manual-input-container" id="locManualContainer">
                <input type="text" class="loc-input" id="locManualInput" placeholder="Enter City or Pincode">
                <button class="loc-btn loc-detect-btn" id="locSaveManualBtn">Save Location</button>
            </div>
            <button class="loc-skip-btn" id="locSkipBtn">Skip for now</button>
        `;

        infoContainer.appendChild(popup);

        // Prevent closing when clicking inside popup
        popup.onclick = (e) => e.stopPropagation();

        // Close popup when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closePopupOnOutsideClick);
        }, 0);

        // Click handlers
        document.getElementById('locSkipBtn').onclick = (e) => {
            e.stopPropagation();
            sessionStorage.setItem('skippedLocation', 'true');
            document.getElementById('headerUserLocationText').innerHTML = '<i class="fas fa-map-marker-alt"></i> Select Location';
            closePopup();
        };

        document.getElementById('locManualBtn').onclick = (e) => {
            e.stopPropagation();
            document.getElementById('locManualContainer').style.display = 'flex';
            document.getElementById('locManualBtn').style.display = 'none';
            document.getElementById('locDetectBtn').style.display = 'none';
        };

        document.getElementById('locSaveManualBtn').onclick = async (e) => {
            e.stopPropagation();
            const val = document.getElementById('locManualInput').value.trim();
            if (!val) return;
            await saveUserLocation(uid, val, closePopup);
        };

        document.getElementById('locDetectBtn').onclick = (e) => {
            e.stopPropagation();
            const btn = document.getElementById('locDetectBtn');
            btn.innerHTML = '<i class="fas fa-location-arrow"></i> Detecting...';
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    try {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        // Use OpenStreetMap Nominatim API for reverse geocoding
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const data = await response.json();
                        
                        let city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown Location';
                        await saveUserLocation(uid, city, closePopup);
                    } catch (error) {
                        console.error('Error detecting location:', error);
                        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Detection Failed';
                        setTimeout(() => {
                            btn.innerHTML = '<i class="fas fa-location-arrow"></i> Detect Automatically';
                        }, 2000);
                    }
                }, (error) => {
                    console.error('Geolocation error:', error);
                    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Permission Denied';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-location-arrow"></i> Detect Automatically';
                    }, 2000);
                });
            } else {
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Not Supported';
            }
        };
    };

    async function saveUserLocation(uid, locationString, closePopupFn) {
        try {
            await updateDoc(doc(db, 'users', uid), {
                currentLocation: locationString
            });
            document.getElementById('headerUserLocationText').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${locationString}`;
            closePopupFn();
        } catch (error) {
            console.error('Error saving location', error);
            alert('Failed to save location.');
        }
    }
});
