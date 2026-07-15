import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function withTimeout(promise, timeoutMs = 4000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        )
    ]);
}

document.addEventListener('DOMContentLoaded', () => {
    const headerProfileIcon = document.querySelector('.header-icons [data-section="profile"]');
    const headerProfileLink = headerProfileIcon?.closest('a');
    const mobileProfileLink = document.querySelector('.mobile-nav-icons a[data-section="profile"]');

    // --- Pre-initialize skeleton loaders to prevent layout shifts ---
    if (headerProfileLink) {
        headerProfileLink.style.display = 'flex';
        headerProfileLink.style.flexDirection = 'row';
        headerProfileLink.style.alignItems = 'center';

        let avatarWrapper = headerProfileLink.querySelector('.header-profile-avatar');
        if (!avatarWrapper) {
            headerProfileLink.innerHTML = '';
            avatarWrapper = document.createElement('div');
            avatarWrapper.className = 'header-profile-avatar loading skeleton-loading';
            headerProfileLink.appendChild(avatarWrapper);
        }

        let infoContainer = document.getElementById('headerUserInfo');
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'headerUserInfo';
            infoContainer.className = 'header-user-info loading';
            infoContainer.innerHTML = `
                <div class="skeleton-name skeleton-loading"></div>
                <div class="skeleton-loc skeleton-loading"></div>
            `;
            headerProfileLink.appendChild(infoContainer);
        }
    }

    // Preset Avatars SVGs for Header
    const MALE_1_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#2E86AB"/>
  <path d="M50 30c-10 0-16 6-16 16v10c0 5 4 8 8 9v6c-10 3-18 8-22 17h60c-4-9-12-14-22-17v-6c4-1 8-4 8-9V46c0-10-6-16-16-16z" fill="#FFD5C2"/>
  <path d="M34 44c0-12 7-16 16-16s16 4 16 16c0 1-1 2-2 2h-28c-1 0-2-1-2-2z" fill="#2B2D42"/>
  <circle cx="43" cy="48" r="3" fill="#2B2D42"/>
  <circle cx="57" cy="48" r="3" fill="#2B2D42"/>
  <circle cx="43" cy="48" r="7" fill="none" stroke="#F18F01" stroke-width="2.5"/>
  <circle cx="57" cy="48" r="7" fill="none" stroke="#F18F01" stroke-width="2.5"/>
  <path d="M48 48h4" fill="none" stroke="#F18F01" stroke-width="2.5"/>
  <path d="M38 56c0 6 5 12 12 12s12-6 12-12h-24z" fill="#2B2D42"/>
  <path d="M46 59q4 2 8 0" fill="none" stroke="#FFD5C2" stroke-width="2" stroke-linecap="round"/>
</svg>`;

    const MALE_2_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#3B7A57"/>
  <path d="M50 32c-9 0-15 6-15 15v10c0 5 4 8 8 9v6c-10 3-18 8-22 17h58c-4-9-12-14-22-17v-6c4-1 8-4 8-9V47c0-9-6-15-15-15z" fill="#FAD6A5"/>
  <circle cx="44" cy="49" r="3.5" fill="#1B1B1B"/>
  <circle cx="56" cy="49" r="3.5" fill="#1B1B1B"/>
  <path d="M33 42c0-8 6-14 17-14s17 6 17 14v2H33v-2z" fill="#D81159"/>
  <rect x="30" y="40" width="40" height="5" rx="2" fill="#D81159"/>
  <circle cx="50" cy="25" r="4" fill="#FFFFFF"/>
  <path d="M45 58q5 4 10 0" fill="none" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

    const FEMALE_1_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#8E44AD"/>
  <path d="M30 45c0 0-5 15-5 35h50c0-20-5-35-5-35V45z" fill="#4A235A"/>
  <path d="M50 32c-9 0-15 6-15 15v8c0 5 4 8 8 9v6c-10 3-17 8-21 17h56c-4-9-11-14-21-17v-6c4-1 8-4 8-9V47c0-9-6-15-15-15z" fill="#FAD1AF"/>
  <path d="M34 44c0-12 7-15 16-15s16 3 16 15c0 1-2-1-4-3c-3-3-8-4-12-4s-9 1-12 4c-2 2-4 3-4 3z" fill="#4A235A"/>
  <circle cx="43" cy="49" r="3" fill="#1B1B1B"/>
  <circle cx="57" cy="49" r="3" fill="#1B1B1B"/>
  <circle cx="43" cy="49" r="6.5" fill="none" stroke="#00C9A7" stroke-width="2"/>
  <circle cx="57" cy="49" r="6.5" fill="none" stroke="#00C9A7" stroke-width="2"/>
  <path d="M47.5 49h5" fill="none" stroke="#00C9A7" stroke-width="2"/>
  <path d="M45 58q5 4 10 0" fill="none" stroke="#1B1B1B" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

    const FEMALE_2_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#FF6B6B"/>
  <circle cx="33" cy="32" r="10" fill="#2F2F2F"/>
  <circle cx="67" cy="32" r="10" fill="#2F2F2F"/>
  <path d="M50 34c-9 0-15 6-15 15v8c0 5 4 8 8 9v6c-10 3-17 8-21 17h56c-4-9-11-14-21-17v-6c4-1 8-4 8-9V49c0-9-6-15-15-15z" fill="#FFD5C2"/>
  <path d="M35 44c0-10 6-12 15-12s15 2 15 12c0 1-1 0-2-2c-2-3-6-5-13-5s-11 2-13 5c-1 2-2 2-2 2z" fill="#2F2F2F"/>
  <path d="M40 49a3 3 0 0 0 6 0" fill="none" stroke="#2F2F2F" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M54 49a3 3 0 0 0 6 0" fill="none" stroke="#2F2F2F" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="39" cy="54" r="3.5" fill="#FF8E8E" opacity="0.6"/>
  <circle cx="61" cy="54" r="3.5" fill="#FF8E8E" opacity="0.6"/>
  <path d="M46 58q4 3 8 0" fill="none" stroke="#2F2F2F" stroke-width="2" stroke-linecap="round"/>
</svg>`;

    const DEFAULT_AVATAR_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <path d="M12,12 C14.7614237,12 17,9.76142375 17,7 C17,4.23857625 14.7614237,2 12,2 C9.23857625,2 7,4.23857625 7,7 C7,9.76142375 9.23857625,12 12,12 Z M12,14 C7.581722,14 4,15.790861 4,18 L4,20 L20,20 L20,18 C20,15.790861 16.418278,14 12,14 Z" fill="currentColor"/>
</svg>`;

    function renderHeaderAvatar(avatarType, photoUrl, displayName, email) {
        if (!headerProfileIcon) return;
        
        let avatarWrapper = headerProfileIcon.querySelector('.header-profile-avatar');
        if (!avatarWrapper) {
            headerProfileIcon.innerHTML = '';
            avatarWrapper = document.createElement('div');
            avatarWrapper.className = 'header-profile-avatar';
            headerProfileIcon.appendChild(avatarWrapper);
        }

        avatarWrapper.className = 'header-profile-avatar';
        avatarWrapper.style.backgroundColor = '';

        if (avatarType === 'google' && photoUrl) {
            avatarWrapper.innerHTML = `<img src="${photoUrl}" alt="Profile">`;
        } else if (avatarType === 'male-1') {
            avatarWrapper.innerHTML = MALE_1_SVG;
        } else if (avatarType === 'male-2') {
            avatarWrapper.innerHTML = MALE_2_SVG;
        } else if (avatarType === 'female-1') {
            avatarWrapper.innerHTML = FEMALE_1_SVG;
        } else if (avatarType === 'female-2') {
            avatarWrapper.innerHTML = FEMALE_2_SVG;
        } else if (avatarType === 'default-initials' && (displayName || email)) {
            avatarWrapper.classList.add('initials');
            const name = displayName || email.split('@')[0];
            const initials = name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2) || '?';
            avatarWrapper.innerHTML = '';
            avatarWrapper.textContent = initials;
        } else {
            avatarWrapper.innerHTML = DEFAULT_AVATAR_SVG;
        }
    }

    window.renderHeaderAvatar = renderHeaderAvatar;

    // Handle logout button if it exists on the page (e.g., in profile.html)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                localStorage.setItem('maha_logged_in', 'false');
                localStorage.removeItem('maha_user_name');
                localStorage.removeItem('maha_user_location');
                localStorage.removeItem('maha_user_avatar_type');
                localStorage.removeItem('maha_user_photo_url');
                localStorage.removeItem('maha_user_email');
                localStorage.removeItem('maha_email_verified');
                localStorage.removeItem('maha_has_missing_steps');
                localStorage.removeItem('maha_user_order_count');
                localStorage.removeItem('maha_user_wishlist_count');
                localStorage.removeItem('maha_user_coupons_cache');

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
                if (profileIcon) {
                    profileIcon.style.display = 'flex';
                    profileIcon.style.flexDirection = 'row';
                }
                if (wishlistIcon) {
                    wishlistIcon.style.display = 'flex';
                    wishlistIcon.offsetHeight; // force reflow
                    wishlistIcon.classList.add('show');
                }
                if (cartIcon) {
                    cartIcon.style.display = 'flex';
                    cartIcon.offsetHeight; // force reflow
                    cartIcon.classList.add('show');
                }
                if (loginBtn) loginBtn.style.display = 'none';
            } else {
                if (profileIcon) {
                    profileIcon.style.display = 'none';
                }
                if (wishlistIcon) {
                    wishlistIcon.style.display = 'flex';
                    wishlistIcon.offsetHeight; // force reflow
                    wishlistIcon.classList.add('show');
                }
                if (cartIcon) {
                    cartIcon.style.display = 'flex';
                    cartIcon.offsetHeight; // force reflow
                    cartIcon.classList.add('show');
                }
                if (loginBtn) loginBtn.style.display = 'inline-flex';
                renderHeaderAvatar('default', null, null, null);
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

            // Render default/google photo initially (before Firestore resolves)
            if (user.photoURL) {
                renderHeaderAvatar('google', user.photoURL, user.displayName, user.email);
            } else {
                renderHeaderAvatar('default-initials', null, user.displayName, user.email);
            }

            // Redirect logic for admin vs user
            const isAdmin = user.email === 'admin@maharaja.com';
            const profileTarget = isAdmin ? "admin.html" : "profile.html";

            if (headerProfileLink) headerProfileLink.href = profileTarget;
            if (mobileProfileLink) {
                mobileProfileLink.href = profileTarget;
                const btnSpan = mobileProfileLink.querySelector('.mobile-profile-btn');
                if (btnSpan) {
                    btnSpan.innerHTML = '<lord-icon src="https://cdn.lordicon.com/spzqjmbt.json" trigger="hover" colors="primary:#ffffff" style="width:26px;height:26px"></lord-icon>';
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
                const userDocSnap = await withTimeout(getDoc(userDocRef));
                const userData = userDocSnap.exists() ? userDocSnap.data() : {};
                
                let avatarType = 'default-initials';
                if (userData.selectedAvatar) {
                    avatarType = userData.selectedAvatar;
                } else if (user.photoURL) {
                    avatarType = 'google';
                }

                renderHeaderAvatar(avatarType, user.photoURL, user.displayName, user.email);
                
                const firstName = (userData.firstName || user.displayName || user.email.split('@')[0]).split(' ')[0];
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

                // Cache all these details in localStorage
                localStorage.setItem('maha_logged_in', 'true');
                localStorage.setItem('maha_user_name', firstName);
                localStorage.setItem('maha_user_location', userLocation);
                localStorage.setItem('maha_user_avatar_type', avatarType);
                localStorage.setItem('maha_user_photo_url', user.photoURL || '');
                localStorage.setItem('maha_user_email', user.email);

                // Inject into Header
                if (headerProfileLink) {
                    let infoContainer = document.getElementById('headerUserInfo');
                    if (!infoContainer) {
                        infoContainer = document.createElement('div');
                        infoContainer.id = 'headerUserInfo';
                        infoContainer.className = 'header-user-info';
                        headerProfileLink.appendChild(infoContainer);
                    }
                    
                    infoContainer.className = 'header-user-info';
                    infoContainer.innerHTML = `
                        <span class="header-user-name">Hi, ${firstName} <i class="fas fa-chevron-down header-chevron"></i></span>
                        <span class="header-user-location" id="headerUserLocationText"><i class="fas fa-map-marker-alt"></i> ${userLocation}</span>
                    `;

                    // Only clicking on the location text opens the dropdown
                    const locationTextEl = infoContainer.querySelector('#headerUserLocationText');
                    if (locationTextEl) {
                        locationTextEl.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            renderLocationPopup(user.uid);
                        };
                    }
                    
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

            // Clear all localStorage cache items
            localStorage.setItem('maha_logged_in', 'false');
            localStorage.removeItem('maha_user_name');
            localStorage.removeItem('maha_user_location');
            localStorage.removeItem('maha_user_avatar_type');
            localStorage.removeItem('maha_user_photo_url');
            localStorage.removeItem('maha_user_email');
            localStorage.removeItem('maha_email_verified');
            localStorage.removeItem('maha_has_missing_steps');
            localStorage.removeItem('maha_user_order_count');
            localStorage.removeItem('maha_user_wishlist_count');
            localStorage.removeItem('maha_user_coupons_cache');

            const infoContainer = document.getElementById('headerUserInfo');
            if (infoContainer) {
                infoContainer.remove();
            }

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
                        btn.innerHTML = '<i class="fas fa-location-arrow"></i> Detection Failed';
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

    // --- Pre-render cached state immediately to prevent visual shifts/jumps ---
    function applyCachedHeaderState() {
        const cacheLoggedIn = localStorage.getItem('maha_logged_in') === 'true';
        const cachedName = localStorage.getItem('maha_user_name') || '';
        const cachedLoc = localStorage.getItem('maha_user_location') || 'Select Location';
        const cachedAvatarType = localStorage.getItem('maha_user_avatar_type') || 'default';
        const cachedPhotoUrl = localStorage.getItem('maha_user_photo_url') || '';
        const cachedEmail = localStorage.getItem('maha_user_email') || '';

        const headerIconsContainer = document.querySelector('.header-icons');
        const wishlistIcon = document.querySelector('.header-icons [data-section="wishlist"]');
        const cartIcon = document.querySelector('.header-icons [data-section="cart"]');
        
        let loginBtn = null;
        if (headerIconsContainer) {
            loginBtn = headerIconsContainer.querySelector('.header-login-btn');
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
        }

        if (cacheLoggedIn && headerProfileLink) {
            // Render cached avatar
            renderHeaderAvatar(cachedAvatarType, cachedPhotoUrl, cachedName, cachedEmail);

            // Setup cached userInfo
            let infoContainer = document.getElementById('headerUserInfo');
            if (!infoContainer) {
                infoContainer = document.createElement('div');
                infoContainer.id = 'headerUserInfo';
                headerProfileLink.appendChild(infoContainer);
            }
            infoContainer.className = 'header-user-info';
            infoContainer.innerHTML = `
                <span class="header-user-name">Hi, ${cachedName} <i class="fas fa-chevron-down header-chevron"></i></span>
                <span class="header-user-location" id="headerUserLocationText"><i class="fas fa-map-marker-alt"></i> ${cachedLoc}</span>
            `;

            // Bind click to location text
            const locationTextEl = infoContainer.querySelector('#headerUserLocationText');
            if (locationTextEl) {
                locationTextEl.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.currentUser) {
                        renderLocationPopup(window.currentUser.uid);
                    } else {
                        document.addEventListener('authReady', (evt) => {
                            if (evt.detail) renderLocationPopup(evt.detail.uid);
                        }, { once: true });
                    }
                };
            }

            if (wishlistIcon) {
                wishlistIcon.style.display = 'flex';
                wishlistIcon.classList.add('show');
            }
            if (cartIcon) {
                cartIcon.style.display = 'flex';
                cartIcon.classList.add('show');
            }
            if (headerProfileLink) {
                headerProfileLink.style.display = 'flex';
            }
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }

            const isAdmin = cachedEmail === 'admin@maharaja.com';
            const profileTarget = isAdmin ? "admin.html" : "profile.html";
            headerProfileLink.href = profileTarget;

            // Mobile profile button
            if (mobileProfileLink) {
                mobileProfileLink.href = profileTarget;
                const btnSpan = mobileProfileLink.querySelector('.mobile-profile-btn');
                if (btnSpan) {
                    btnSpan.innerHTML = '<lord-icon src="https://cdn.lordicon.com/spzqjmbt.json" trigger="hover" colors="primary:#ffffff" style="width:26px;height:26px"></lord-icon>';
                    btnSpan.classList.remove('login-pill');
                    btnSpan.style.background = '';
                    btnSpan.style.color = '';
                    btnSpan.style.boxShadow = '';
                    btnSpan.style.padding = '';
                    btnSpan.style.opacity = '';
                }
            }
        } else if (headerProfileLink) {
            // Logged out: Show default avatar immediately, hide wishlist/cart, hide userInfo
            renderHeaderAvatar('default', null, null, null);
            headerProfileLink.href = "login.html";

            const infoContainer = document.getElementById('headerUserInfo');
            if (infoContainer) {
                infoContainer.remove();
            }

            if (wishlistIcon) {
                wishlistIcon.style.display = 'flex';
                wishlistIcon.classList.add('show');
            }
            if (cartIcon) {
                cartIcon.style.display = 'flex';
                cartIcon.classList.add('show');
            }
            if (headerProfileLink) {
                headerProfileLink.style.display = 'none';
            }
            if (loginBtn) {
                loginBtn.style.display = 'inline-flex';
            }

            // Mobile profile button shows 'Login' immediately
            if (mobileProfileLink) {
                mobileProfileLink.href = "login.html";
                const btnSpan = mobileProfileLink.querySelector('.mobile-profile-btn');
                if (btnSpan) {
                    btnSpan.textContent = 'Login';
                    btnSpan.classList.add('login-pill');
                    btnSpan.style.opacity = '1';
                    btnSpan.style.background = '';
                    btnSpan.style.color = '';
                    btnSpan.style.boxShadow = '';
                    btnSpan.style.padding = '';
                }
            }
        }
    }

    // Run cache loader synchronously
    applyCachedHeaderState();
});
