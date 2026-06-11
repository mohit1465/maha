import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    // Populate profile details
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Update basic info
            const nameEl = document.getElementById('userName');
            const emailEl = document.getElementById('userEmail');
            const avatarEl = document.querySelector('.profile-avatar');
            const detailName = document.getElementById('detailName');
            const detailEmail = document.getElementById('detailEmail');

            const displayName = user.displayName || user.email.split('@')[0];
            if (nameEl) nameEl.textContent = displayName;
            if (emailEl) emailEl.textContent = user.email;
            if (detailEmail) detailEmail.textContent = user.email;

            // Handle Dynamic Avatar (Photo or Initials)
            if (avatarEl) {
                if (user.photoURL) {
                    avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Profile">`;
                } else {
                    const initials = displayName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                    avatarEl.textContent = initials || '?';
                }
            }

            // Fetch extra info from Firestore (like Age, Preferences from Step-based flow)
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Update Name from Firestore if available
                    if (detailName && (data.firstName || data.lastName)) {
                        detailName.textContent = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                    }

                    // Update Insights (Counts)
                    const orderCountEl = document.getElementById('orderCount');
                    const wishlistCountEl = document.getElementById('wishlistCount');

                    if (orderCountEl) {
                        const count = (data.orders && data.orders.length) || 0;
                        orderCountEl.textContent = count === 1 ? '1 Order' : `${count} Orders`;
                    }

                    if (wishlistCountEl) {
                        const count = (data.wishlist && data.wishlist.length) || 0;
                        wishlistCountEl.textContent = count === 1 ? '1 Item' : `${count} Items`;
                    }

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
                        widget.style.display = "flex";
                        
                        const totalSteps = 4; // Name + 3 optional
                        const completedSteps = totalSteps - missingSteps.length;
                        const progressPercent = Math.round((completedSteps / totalSteps) * 100);
                        
                        progressFill.style.width = `${progressPercent}%`;
                        progressText.textContent = `${progressPercent}%`;

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
                        widget.style.display = "none";
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
                        
                        function updateStackClasses() {
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
                            setInterval(() => {
                                currentIndex = (currentIndex + 1) % cards.length;
                                updateStackClasses();
                            }, 3000); // Switch every 3 seconds
                        }
                    }
                }
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