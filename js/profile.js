import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Preset Avatars SVGs
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

document.addEventListener('DOMContentLoaded', function () {
    // --- Define generic renderProfileAvatar function first ---
    const avatarEl = document.querySelector('.profile-avatar');

    function renderProfileAvatar(avatarType, photoUrl, displayName) {
        if (!avatarEl) return;
        
        avatarEl.style.backgroundColor = '';
        avatarEl.style.display = 'flex';
        avatarEl.style.alignItems = 'center';
        avatarEl.style.justifyContent = 'center';

        if (avatarType === 'google' && photoUrl) {
            avatarEl.innerHTML = `<img src="${photoUrl}" alt="Profile">`;
        } else if (avatarType === 'male-1') {
            avatarEl.innerHTML = MALE_1_SVG;
        } else if (avatarType === 'male-2') {
            avatarEl.innerHTML = MALE_2_SVG;
        } else if (avatarType === 'female-1') {
            avatarEl.innerHTML = FEMALE_1_SVG;
        } else if (avatarType === 'female-2') {
            avatarEl.innerHTML = FEMALE_2_SVG;
        } else {
            // Default / Initials
            avatarEl.innerHTML = '';
            const name = displayName || 'User';
            const initials = name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2) || '?';
            avatarEl.textContent = initials;
            avatarEl.style.backgroundColor = '#fc6e20';
        }
    }

    // --- Pre-render cached profile data instantly ---
    function applyCachedProfileState() {
        const cacheLoggedIn = localStorage.getItem('maha_logged_in') === 'true';
        if (!cacheLoggedIn) return;

        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const detailName = document.getElementById('detailName');
        const detailEmail = document.getElementById('detailEmail');

        const cachedDisplayName = localStorage.getItem('maha_user_display_name') || localStorage.getItem('maha_user_name') || 'User';
        const cachedEmail = localStorage.getItem('maha_user_email') || '';
        const cachedAvatarType = localStorage.getItem('maha_user_avatar_type') || 'default';
        const cachedPhotoUrl = localStorage.getItem('maha_user_photo_url') || '';

        if (nameEl) nameEl.textContent = cachedDisplayName;
        if (emailEl) emailEl.textContent = cachedEmail;
        if (detailEmail) detailEmail.textContent = cachedEmail;
        if (detailName) detailName.textContent = cachedDisplayName;

        renderProfileAvatar(cachedAvatarType, cachedPhotoUrl, cachedDisplayName);

        // Cached counts
        const orderCountEl = document.getElementById('orderCount');
        const wishlistCountEl = document.getElementById('wishlistCount');
        const cachedOrderCount = localStorage.getItem('maha_user_order_count') || 'Tap to view';
        const cachedWishlistCount = localStorage.getItem('maha_user_wishlist_count') || 'Tap to view';
        if (orderCountEl) orderCountEl.textContent = cachedOrderCount;
        if (wishlistCountEl) wishlistCountEl.textContent = cachedWishlistCount;

        // Cached completion widget state
        const hasMissingSteps = localStorage.getItem('maha_has_missing_steps') === 'true';
        const widget = document.getElementById("profileCompletionWidget");
        const container = document.getElementById("missingStepsContainer");
        if (hasMissingSteps && widget && container) {
            widget.classList.add("show");
            container.innerHTML = `
                <div class="missing-step-card skeleton-card skeleton-loading"></div>
                <div class="missing-step-card skeleton-card skeleton-loading"></div>
            `;
        }

        // Cached coupons stack
        const cachedCouponsString = localStorage.getItem('maha_user_coupons_cache');
        if (cachedCouponsString) {
            try {
                const validCoupons = JSON.parse(cachedCouponsString);
                if (validCoupons && validCoupons.length > 0) {
                    const menuBadge = document.getElementById('myCouponsMenuBadge');
                    if (menuBadge) {
                        menuBadge.style.display = 'inline-block';
                        menuBadge.textContent = `${validCoupons.length} New`;
                    }
                    
                    const stackWidget = document.getElementById('profileCouponStack');
                    const stackBadge = document.getElementById('couponCountBadge');
                    const stackContainer = document.getElementById('stackCardsContainer');
                    if (stackWidget && stackContainer) {
                        stackWidget.style.display = 'block';
                        if (stackBadge) stackBadge.textContent = validCoupons.length;
                        
                        let html = '';
                        validCoupons.forEach((c, index) => {
                            let text = c.discountPercent ? `${c.discountPercent}% OFF` : `₹${c.discountFlat} OFF`;
                            html += `<div class="stack-card" data-index="${index}">${text}</div>`;
                        });
                        stackContainer.innerHTML = html;
                        
                        const cards = stackContainer.querySelectorAll('.stack-card');
                        if (cards.length > 0) {
                            let currentIndex = 0;
                            const updateStackClasses = () => {
                                cards.forEach((card, i) => {
                                    card.className = 'stack-card';
                                    if (i === currentIndex) {
                                        card.classList.add('active');
                                    } else if (i === (currentIndex + 1) % cards.length) {
                                        card.classList.add('next');
                                    } else {
                                        card.classList.add('hidden-card');
                                    }
                                });
                            };
                            updateStackClasses();
                            if (cards.length > 1) {
                                if (window.profileCouponsInterval) clearInterval(window.profileCouponsInterval);
                                window.profileCouponsInterval = setInterval(() => {
                                    currentIndex = (currentIndex + 1) % cards.length;
                                    updateStackClasses();
                                }, 3000);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading cached coupons", e);
            }
        }
    }

    applyCachedProfileState();

    // Populate profile details
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Update basic info
            const nameEl = document.getElementById('userName');
            const emailEl = document.getElementById('userEmail');
            const detailName = document.getElementById('detailName');
            const detailEmail = document.getElementById('detailEmail');

            const displayName = user.displayName || user.email.split('@')[0];
            if (nameEl) nameEl.textContent = displayName;
            if (emailEl) emailEl.textContent = user.email;
            if (detailEmail) detailEmail.textContent = user.email;

            // Default render based on auth details (before Firestore snapshot resolves)
            if (user.photoURL) {
                renderProfileAvatar('google', user.photoURL, displayName);
            } else {
                renderProfileAvatar('default', null, displayName);
            }

            // Fetch extra info from Firestore (like Age, Preferences from Step-based flow)
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Render custom avatar if selectedAvatar exists
                    if (data.selectedAvatar) {
                        renderProfileAvatar(data.selectedAvatar, user.photoURL, displayName);
                    } else if (user.photoURL) {
                        renderProfileAvatar('google', user.photoURL, displayName);
                    } else {
                        renderProfileAvatar('default', null, displayName);
                    }

                    // Update Name from Firestore if available
                    const resolvedName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || displayName;
                    if (detailName) {
                        detailName.textContent = resolvedName;
                    }

                    // Update cached values in localStorage
                    localStorage.setItem('maha_user_display_name', resolvedName);
                    localStorage.setItem('maha_user_avatar_type', data.selectedAvatar || (user.photoURL ? 'google' : 'default'));
                    localStorage.setItem('maha_user_photo_url', user.photoURL || '');

                    // Update Insights (Counts)
                    const orderCountEl = document.getElementById('orderCount');
                    const wishlistCountEl = document.getElementById('wishlistCount');

                    let orderCountText = '0 Orders';
                    if (orderCountEl) {
                        const count = (data.orders && data.orders.length) || 0;
                        orderCountText = count === 1 ? '1 Order' : `${count} Orders`;
                        orderCountEl.textContent = orderCountText;
                    }

                    let wishlistCountText = '0 Items';
                    if (wishlistCountEl) {
                        const count = (data.wishlist && data.wishlist.length) || 0;
                        wishlistCountText = count === 1 ? '1 Item' : `${count} Items`;
                        wishlistCountEl.textContent = wishlistCountText;
                    }

                    localStorage.setItem('maha_user_order_count', orderCountText);
                    localStorage.setItem('maha_user_wishlist_count', wishlistCountText);

                    // Check for missing profile steps
                    const missingSteps = [];
                    if (!data.dateOfBirth || data.dateOfBirth === "Skipped") missingSteps.push({id: "dob", label: "Date of Birth", type: "date"});
                    if (!data.discoverySource || data.discoverySource === "Skipped") missingSteps.push({id: "discovery", label: "How did you hear about us?", type: "select", options: ["Instagram", "Friend", "Google", "YouTube", "Other"]});
                    if (!data.foodPreference || data.foodPreference === "Skipped") missingSteps.push({id: "food", label: "Favorite Dry Fruit", type: "select", options: ["Almonds", "Cashews", "Raisins", "Mixed"]});

                    const widget = document.getElementById("profileCompletionWidget");
                    const container = document.getElementById("missingStepsContainer");
                    const progressFill = document.getElementById("completionProgressFill");
                    const progressText = document.getElementById("completionProgressText");

                    if (missingSteps.length > 0 && widget && container) {
                        widget.classList.add("show");
                        localStorage.setItem('maha_has_missing_steps', 'true');
                        
                        const totalSteps = 4; // Name + 3 optional
                        const completedSteps = totalSteps - missingSteps.length;
                        const progressPercent = Math.round((completedSteps / totalSteps) * 100);
                        
                        if (progressFill) progressFill.style.width = `${progressPercent}%`;
                        if (progressText) progressText.textContent = `${progressPercent}%`;

                        container.innerHTML = "";
                        missingSteps.forEach(step => {
                            const card = document.createElement("div");
                            card.className = "missing-step-card";
                            
                            let inputHTML = "";
                            if (step.type === "date") {
                                inputHTML = `<input type="date" id="input_${step.id}">`;
                            } else if (step.type === "select") {
                                inputHTML = `<select id="input_${step.id}">
                                    <option value="">Select an option</option>
                                    ${step.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                                </select>`;
                            }

                            let iconClass = 'fa-check-circle';
                            if (step.id === 'dob') iconClass = 'fa-gift';
                            if (step.id === 'discovery') iconClass = 'fa-ticket-alt';
                            if (step.id === 'food') iconClass = 'fa-star';

                            card.innerHTML = `
                                <span><i class="fas ${iconClass}" style="color:#fc6e20; font-size: 1.2em;"></i> ${step.label}</span>
                                <div class="step-actions">
                                    ${inputHTML}
                                    <button onclick="saveMissingStep('${step.id}')">Claim</button>
                                </div>
                            `;
                            container.appendChild(card);
                        });

                        // Make saveMissingStep globally available
                        window.saveMissingStep = async (stepId) => {
                            const inputEl = document.getElementById(`input_${stepId}`);
                            if (!inputEl || !inputEl.value) {
                                alert("Please provide a value before saving.");
                                return;
                            }

                            try {
                                const updateData = {};
                                if (stepId === "dob") updateData.dateOfBirth = inputEl.value;
                                if (stepId === "discovery") updateData.discoverySource = inputEl.value;
                                if (stepId === "food") updateData.foodPreference = inputEl.value;

                                await updateDoc(docRef, updateData);
                                alert("Profile updated successfully!");
                                window.location.reload();
                            } catch (err) {
                                console.error("Error updating profile:", err);
                                alert("Failed to update profile.");
                            }
                        };
                    } else if (widget) {
                        widget.classList.remove("show");
                        widget.style.display = "none";
                        localStorage.setItem('maha_has_missing_steps', 'false');
                    }

                    // Modal initialization & event listeners
                    const googlePhotoPreview = document.getElementById('googlePhotoPreview');
                    const googleOptionCard = document.getElementById('avatarOptionGoogle');
                    if (googleOptionCard) {
                        if (user.photoURL) {
                            googlePhotoPreview.innerHTML = `<img src="${user.photoURL}" alt="Google Profile">`;
                            googleOptionCard.classList.remove('disabled');
                        } else {
                            googleOptionCard.classList.add('disabled');
                            googlePhotoPreview.innerHTML = `<i class="fab fa-google" style="font-size: 24px; color: #ccc;"></i>`;
                        }
                    }

                    const defaultInitialsPreview = document.getElementById('defaultInitialsPreview');
                    if (defaultInitialsPreview) {
                        const initials = displayName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2) || '?';
                        defaultInitialsPreview.textContent = initials;
                    }

                    const male1Preview = document.getElementById('male1Preview');
                    if (male1Preview) male1Preview.innerHTML = MALE_1_SVG;
                    const male2Preview = document.getElementById('male2Preview');
                    if (male2Preview) male2Preview.innerHTML = MALE_2_SVG;
                    const female1Preview = document.getElementById('female1Preview');
                    if (female1Preview) female1Preview.innerHTML = FEMALE_1_SVG;
                    const female2Preview = document.getElementById('female2Preview');
                    if (female2Preview) female2Preview.innerHTML = FEMALE_2_SVG;

                    const editAvatarBtn = document.getElementById('editAvatarBtn');
                    const avatarModal = document.getElementById('avatarModal');
                    const avatarModalBackdrop = document.getElementById('avatarModalBackdrop');
                    const closeAvatarModalBtn = document.getElementById('closeAvatarModalBtn');
                    const cancelAvatarBtn = document.getElementById('cancelAvatarBtn');
                    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
                    const optionCards = document.querySelectorAll('.avatar-option-card');

                    let tempSelectedAvatarType = 'default';

                    function openAvatarModal() {
                        const currentAvatar = data.selectedAvatar || (user.photoURL ? 'google' : 'default');
                        tempSelectedAvatarType = currentAvatar;

                        optionCards.forEach(card => {
                            card.classList.remove('selected');
                            if (card.dataset.avatarType === currentAvatar) {
                                card.classList.add('selected');
                            }
                        });

                        if (avatarModal && avatarModalBackdrop) {
                            avatarModalBackdrop.style.display = 'block';
                            avatarModal.style.display = 'flex';
                            avatarModal.offsetHeight;
                            avatarModalBackdrop.offsetHeight;
                            avatarModalBackdrop.classList.add('show');
                            avatarModal.classList.add('show');
                        }
                    }

                    function closeAvatarModal() {
                        if (avatarModal && avatarModalBackdrop) {
                            avatarModalBackdrop.classList.remove('show');
                            avatarModal.classList.remove('show');
                            setTimeout(() => {
                                avatarModalBackdrop.style.display = 'none';
                                avatarModal.style.display = 'none';
                            }, 300);
                        }
                    }

                    if (editAvatarBtn) {
                        editAvatarBtn.addEventListener('click', openAvatarModal);
                    }

                    if (closeAvatarModalBtn) {
                        closeAvatarModalBtn.addEventListener('click', closeAvatarModal);
                    }

                    if (cancelAvatarBtn) {
                        cancelAvatarBtn.addEventListener('click', closeAvatarModal);
                    }

                    if (avatarModalBackdrop) {
                        avatarModalBackdrop.addEventListener('click', closeAvatarModal);
                    }

                    optionCards.forEach(card => {
                        card.addEventListener('click', function() {
                            if (this.classList.contains('disabled')) return;
                            optionCards.forEach(c => c.classList.remove('selected'));
                            this.classList.add('selected');
                            tempSelectedAvatarType = this.dataset.avatarType;
                        });
                    });

                    if (saveAvatarBtn) {
                        saveAvatarBtn.addEventListener('click', async () => {
                            try {
                                const docRef = doc(db, "users", user.uid);
                                await updateDoc(docRef, {
                                    selectedAvatar: tempSelectedAvatarType
                                });
                                
                                data.selectedAvatar = tempSelectedAvatarType; // Update local data object
                                renderProfileAvatar(tempSelectedAvatarType, user.photoURL, displayName);
                                if (typeof window.renderHeaderAvatar === 'function') {
                                    window.renderHeaderAvatar(tempSelectedAvatarType, user.photoURL, displayName, user.email);
                                }
                                closeAvatarModal();
                            } catch (error) {
                                console.error("Error saving avatar selection:", error);
                                alert("Failed to update profile picture. Please try again.");
                            }
                        });
                    }

                    // Fetch and highlight available coupons
                    await loadAndDisplayProfileCoupons(user, data);
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        }
    });

    async function loadAndDisplayProfileCoupons(user, userData) {
        try {
            const couponsRef = collection(db, "coupons");
            const couponsSnap = await getDocs(couponsRef);
            const validCoupons = [];
            
            couponsSnap.forEach(docSnap => {
                const coupon = docSnap.data();
                if (!coupon.active) return;
                if (coupon.expiryDate) {
                    let expiryObj = coupon.expiryDate.seconds ? new Date(coupon.expiryDate.seconds * 1000) : new Date(coupon.expiryDate);
                    if (expiryObj < new Date()) return;
                }
                if (coupon.maxUsesGlobally && coupon.timesUsed >= coupon.maxUsesGlobally) return;
                const userUsedCoupons = userData.usedCoupons || {};
                const userUsageCount = userUsedCoupons[coupon.code] || 0;
                if (coupon.maxUsesPerUser && userUsageCount >= coupon.maxUsesPerUser) return;
                
                const eligibility = coupon.eligibility || { type: "everyone" };
                if (eligibility.type === "specific_users") {
                    const allowedUids = eligibility.allowedUids || [];
                    if (!allowedUids.includes(user.uid)) return;
                } else if (eligibility.type === "new_users") {
                    const thresholdDays = eligibility.threshold || 7;
                    let createdAtDate;
                    if (userData.createdAt && userData.createdAt.seconds) {
                        createdAtDate = new Date(userData.createdAt.seconds * 1000);
                    } else {
                        createdAtDate = new Date(userData.createdAt || Date.now());
                    }
                    const diffTime = Math.abs(new Date() - createdAtDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    if (diffDays > thresholdDays) return;
                } else if (eligibility.type === "first_order") {
                    const orders = userData.orders || [];
                    if (orders.length > 0) return;
                } else if (eligibility.type === "profile_completion") {
                    const dob = userData.dateOfBirth;
                    const ds = userData.discoverySource;
                    const fp = userData.foodPreference;
                    if (!dob || dob === "Skipped" || !ds || ds === "Skipped" || !fp || fp === "Skipped") return;
                } else if (eligibility.type === "total_spent") {
                    const orders = userData.orders || [];
                    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
                    const threshold = eligibility.threshold || 0;
                    if (totalSpent < threshold) return;
                }
                validCoupons.push(coupon);
            });

            if (validCoupons.length > 0) {
                localStorage.setItem('maha_user_coupons_cache', JSON.stringify(validCoupons));

                // Highlight My Coupons Menu Row
                const menuBadge = document.getElementById('myCouponsMenuBadge');
                if (menuBadge) {
                    menuBadge.style.display = 'inline-block';
                    menuBadge.textContent = `${validCoupons.length} New`;
                }
                
                // Setup Stack Widget
                const stackWidget = document.getElementById('profileCouponStack');
                const stackBadge = document.getElementById('couponCountBadge');
                const stackContainer = document.getElementById('stackCardsContainer');
                
                if (stackWidget && stackContainer) {
                    stackWidget.style.display = 'block';
                    stackBadge.textContent = validCoupons.length;
                    
                    let html = '';
                    validCoupons.forEach((c, index) => {
                        let text = c.discountPercent ? `${c.discountPercent}% OFF` : `₹${c.discountFlat} OFF`;
                        html += `<div class="stack-card" data-index="${index}">${text}</div>`;
                    });
                    stackContainer.innerHTML = html;
                    
                    const cards = stackContainer.querySelectorAll('.stack-card');
                    if (cards.length > 0) {
                        let currentIndex = 0;
                        
                        const updateStackClasses = () => {
                            cards.forEach((card, i) => {
                                card.className = 'stack-card';
                                if (i === currentIndex) {
                                    card.classList.add('active');
                                } else if (i === (currentIndex + 1) % cards.length) {
                                    card.classList.add('next');
                                } else {
                                    card.classList.add('hidden-card');
                                }
                            });
                        }
                        
                        updateStackClasses();
                        
                        if (cards.length > 1) {
                            if (window.profileCouponsInterval) clearInterval(window.profileCouponsInterval);
                            window.profileCouponsInterval = setInterval(() => {
                                currentIndex = (currentIndex + 1) % cards.length;
                                updateStackClasses();
                            }, 3000); // Switch every 3 seconds
                        }
                    }
                }
            } else {
                localStorage.removeItem('maha_user_coupons_cache');
                const menuBadge = document.getElementById('myCouponsMenuBadge');
                if (menuBadge) menuBadge.style.display = 'none';
                const stackWidget = document.getElementById('profileCouponStack');
                if (stackWidget) stackWidget.style.display = 'none';
            }
        } catch (err) {
            console.error("Error loading profile coupons:", err);
        }
    }

    // Menu item interactions
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            if (this.classList.contains('logout')) {
                // Handled by auth-state.js but kept for UI confirmation
                if (confirm('Are you sure you want to logout?')) {
                    signOut(auth).then(() => {
                        window.location.href = "login.html";
                    });
                }
            }
        });
    });
});