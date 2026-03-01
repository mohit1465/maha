import { db, auth } from './firebase-config.js';
import { doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const addressList = document.getElementById('addressList');
    const emptyAddresses = document.getElementById('emptyAddresses');
    const addressModal = document.getElementById('addressModal');
    const addressForm = document.getElementById('addressForm');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const closeAddressModal = document.getElementById('closeAddressModal');
    const cancelAddress = document.getElementById('cancelAddress');
    const modalTitle = document.getElementById('modalTitle');
    const openAddModalBtns = document.querySelectorAll('.open-add-modal');

    let userAddresses = [];

    // --- Auth Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            initAddressListener(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- Listener for Real-time Updates ---
    function initAddressListener(uid) {
        const userRef = doc(db, "users", uid);
        onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                userAddresses = data.addresses || [];
                renderAddresses();
            }
        });
    }

    // --- Render logic ---
    function renderAddresses() {
        if (!addressList) return;

        addressList.innerHTML = '';

        if (userAddresses.length === 0) {
            addressList.style.display = 'none';
            emptyAddresses.style.display = 'block';
            return;
        }

        addressList.style.display = 'grid';
        emptyAddresses.style.display = 'none';

        userAddresses.forEach((addr, index) => {
            const card = document.createElement('div');
            card.className = 'address-card';
            card.style.cssText = `
                background: white;
                padding: 25px;
                border-radius: 30px;
                border: 1px solid #f0f0f0;
                position: relative;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,0,0,0.02);
            `;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <span style="background: #fff5eb; color: #fc6e20; padding: 5px 15px; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${addr.type || 'Other'}</span>
                    <div class="address-actions" style="display: flex; gap: 10px;">
                        <button class="edit-btn" data-index="${index}" style="background: none; border: none; color: #666; cursor: pointer; font-size: 14px;"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-index="${index}" style="background: none; border: none; color: #DE0000; cursor: pointer; font-size: 14px;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <h4 style="font-size: 18px; margin-bottom: 5px; color: #1b1b1b;">${addr.name}</h4>
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;"><i class="fas fa-phone-alt" style="margin-right: 8px; font-size: 12px;"></i>${addr.phone}</p>
                <p style="color: #1b1b1b; font-size: 15px; line-height: 1.5; margin-bottom: 5px;">${addr.address}</p>
                <p style="color: #1b1b1b; font-size: 15px;">${addr.city}, ${addr.state} - ${addr.pin}</p>
            `;

            // Hover effect
            card.onmouseenter = () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 15px 30px rgba(252, 110, 32, 0.1)';
                card.style.borderColor = 'rgba(252, 110, 32, 0.2)';
            };
            card.onmouseleave = () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.02)';
                card.style.borderColor = '#f0f0f0';
            };

            addressList.appendChild(card);
        });

        // Add event listeners to buttons after rendering
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => editAddress(btn.dataset.index);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = () => deleteAddress(btn.dataset.index);
        });
    }

    // --- Modal Logic ---
    function openModal(isEdit = false, index = null) {
        addressModal.style.display = 'flex';
        if (!isEdit) {
            modalTitle.textContent = 'Add New Address';
            addressForm.reset();
            document.getElementById('addressId').value = '';
        } else {
            modalTitle.textContent = 'Edit Address';
            const addr = userAddresses[index];
            document.getElementById('addressId').value = index;
            document.getElementById('addressLabel').value = addr.type;
            document.getElementById('receiverName').value = addr.name;
            document.getElementById('receiverPhone').value = addr.phone;
            document.getElementById('fullAddress').value = addr.address;
            document.getElementById('addressCity').value = addr.city;
            document.getElementById('addressState').value = addr.state;
            document.getElementById('addressPin').value = addr.pin;
        }
    }

    function closeModal() {
        addressModal.style.display = 'none';
    }

    if (addAddressBtn) addAddressBtn.onclick = () => openModal();
    openAddModalBtns.forEach(btn => btn.onclick = () => openModal());
    if (closeAddressModal) closeAddressModal.onclick = closeModal;
    if (cancelAddress) cancelAddress.onclick = closeModal;

    window.onclick = (event) => {
        if (event.target === addressModal) closeModal();
    };

    // --- Save Address ---
    addressForm.onsubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const index = document.getElementById('addressId').value;
        const newAddress = {
            type: document.getElementById('addressLabel').value,
            name: document.getElementById('receiverName').value,
            phone: document.getElementById('receiverPhone').value,
            address: document.getElementById('fullAddress').value,
            city: document.getElementById('addressCity').value,
            state: document.getElementById('addressState').value,
            pin: document.getElementById('addressPin').value
        };

        let newAddresses = [...userAddresses];
        if (index === '') {
            newAddresses.push(newAddress);
        } else {
            newAddresses[index] = newAddress;
        }

        try {
            await updateDoc(doc(db, "users", user.uid), {
                addresses: newAddresses
            });
            closeModal();
            // Not invoking alert to keep it smooth, listener will handle render
        } catch (error) {
            console.error("Error saving address:", error);
            alert("Failed to save address. Please try again.");
        }
    };

    // --- Edit Address ---
    function editAddress(index) {
        openModal(true, index);
    }

    // --- Delete Address ---
    async function deleteAddress(index) {
        if (!confirm("Are you sure you want to delete this address?")) return;

        const user = auth.currentUser;
        if (!user) return;

        let newAddresses = userAddresses.filter((_, i) => i !== parseInt(index));

        try {
            await updateDoc(doc(db, "users", user.uid), {
                addresses: newAddresses
            });
        } catch (error) {
            console.error("Error deleting address:", error);
            alert("Failed to delete address.");
        }
    }
});
