import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

                    // Add other personal details if fields exist in UI
                    if (data.age) {
                        const ageRow = document.createElement('div');
                        ageRow.className = 'detail-row';
                        ageRow.innerHTML = `<span class="detail-label">Age</span><span class="detail-value">${data.age}</span>`;
                        detailName.closest('.profile-section-card').appendChild(ageRow);
                    }
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        }
    });

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