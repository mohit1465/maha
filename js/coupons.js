import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const couponsList = document.getElementById('couponsList');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Get user profile for eligibility checks
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            let userData = {};
            if (userSnap.exists()) {
                userData = userSnap.data();
            }

            // Get all coupons
            const couponsRef = collection(db, "coupons");
            const couponsSnap = await getDocs(couponsRef);
            
            const validCoupons = [];
            
            couponsSnap.forEach(docSnap => {
                const coupon = docSnap.data();
                
                // 1. Check if active
                if (!coupon.active) return;
                
                // 2. Check Expiry
                if (coupon.expiryDate) {
                    let expiryObj = coupon.expiryDate.seconds ? new Date(coupon.expiryDate.seconds * 1000) : new Date(coupon.expiryDate);
                    if (expiryObj < new Date()) return; // Expired
                }

                // 3. Check Global Uses
                if (coupon.maxUsesGlobally && coupon.timesUsed >= coupon.maxUsesGlobally) return;

                // 4. Check Per User limit
                const userUsedCoupons = userData.usedCoupons || {};
                const userUsageCount = userUsedCoupons[coupon.code] || 0;
                if (coupon.maxUsesPerUser && userUsageCount >= coupon.maxUsesPerUser) return;

                // 5. Eligibility Rules
                const eligibility = coupon.eligibility || { type: "everyone" };
                
                if (eligibility.type === "specific_users") {
                    const allowedUids = eligibility.allowedUids || [];
                    if (!allowedUids.includes(user.uid)) return;
                } 
                else if (eligibility.type === "new_users") {
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
                }
                else if (eligibility.type === "first_order") {
                    const orders = userData.orders || [];
                    if (orders.length > 0) return;
                }
                else if (eligibility.type === "profile_completion") {
                    const dob = userData.dateOfBirth;
                    const ds = userData.discoverySource;
                    const fp = userData.foodPreference;
                    if (!dob || dob === "Skipped" || !ds || ds === "Skipped" || !fp || fp === "Skipped") return;
                }
                else if (eligibility.type === "total_spent") {
                    const orders = userData.orders || [];
                    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
                    const threshold = eligibility.threshold || 0;
                    if (totalSpent < threshold) return;
                }

                validCoupons.push(coupon);
            });

            renderCoupons(validCoupons);

        } catch (error) {
            console.error("Error loading coupons:", error);
            if (couponsList) {
                couponsList.innerHTML = `<div style="text-align:center; color:#e74c3c; padding:20px;">Failed to load coupons. Please try again.</div>`;
            }
        }
    });

    function renderCoupons(coupons) {
        if (!couponsList) return;

        if (coupons.length === 0) {
            couponsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-ticket-alt" style="font-size: 48px; color: #fc6e20; margin-bottom: 20px;"></i>
                    <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">No Active Coupons</h2>
                    <p style="color: #666;">You don't have any active coupons right now. Keep shopping to unlock rewards!</p>
                </div>
            `;
            return;
        }

        let html = '';
        coupons.forEach(coupon => {
            const isPercentage = !!coupon.discountPercent;
            const discountDisplay = isPercentage ? `${coupon.discountPercent}% OFF` : `₹${coupon.discountFlat} OFF`;
            
            let expiryText = "No Expiry";
            if (coupon.expiryDate) {
                const expiryObj = coupon.expiryDate.seconds ? new Date(coupon.expiryDate.seconds * 1000) : new Date(coupon.expiryDate);
                expiryText = `Valid till ${expiryObj.toLocaleDateString()}`;
            }

            let badgeHtml = '';
            if (coupon.eligibility) {
                if (coupon.eligibility.type === "new_users") {
                    badgeHtml = '<div style="margin-top:5px; font-size:11px; background:#e8f5e9; color:#2e7d32; display:inline-block; padding:3px 8px; border-radius:10px; font-weight:600;">New User Exclusive</div>';
                } else if (coupon.eligibility.type === "first_order") {
                    badgeHtml = '<div style="margin-top:5px; font-size:11px; background:#e3f2fd; color:#1565c0; display:inline-block; padding:3px 8px; border-radius:10px; font-weight:600;">First Order Special</div>';
                } else if (coupon.eligibility.type === "profile_completion") {
                    badgeHtml = '<div style="margin-top:5px; font-size:11px; background:#fff3cd; color:#856404; display:inline-block; padding:3px 8px; border-radius:10px; font-weight:600;">Profile Reward</div>';
                } else if (coupon.eligibility.type === "total_spent") {
                    badgeHtml = '<div style="margin-top:5px; font-size:11px; background:#f3e5f5; color:#7b1fa2; display:inline-block; padding:3px 8px; border-radius:10px; font-weight:600;">VIP Member</div>';
                }
            }

            html += `
                <div style="background: white; border: 1px solid #eee; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size: 24px; font-weight: 800; color: #fc6e20; margin-bottom: 5px;">${discountDisplay}</div>
                        <div style="font-size: 14px; color: #333; font-weight: 600; margin-bottom: 5px;">Code: <span style="background: #FFF8F2; padding: 4px 8px; border-radius: 6px; letter-spacing: 1px; color: #fc6e20; border: 1px dashed #fc6e20;">${coupon.code}</span></div>
                        <div style="font-size: 12px; color: #888;">Min Order: ₹${coupon.minOrder || 0} • ${expiryText}</div>
                        ${badgeHtml}
                    </div>
                    <button onclick="navigator.clipboard.writeText('${coupon.code}'); alert('Coupon code copied!');" style="background: #1b1b1b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">Copy Code</button>
                </div>
            `;
        });
        couponsList.innerHTML = html;
    }
});
