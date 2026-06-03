import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, query, where, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const productList = document.getElementById('productList');
const orderList = document.getElementById('orderList');
const userList = document.getElementById('userList');
const couponList = document.getElementById('couponList');
const productFormContainer = document.getElementById('productFormContainer');
const productForm = document.getElementById('productForm');
const couponFormContainer = document.getElementById('couponFormContainer');
const couponForm = document.getElementById('couponForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const imageInput = document.getElementById('productImageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const userModal = document.getElementById('userModal');
const modalTabContent = document.getElementById('modalTabContent');

let allProducts = [];
let allUsers = [];
let allCoupons = [];
let allOrders = [];
let currentImages = [];

// Admin Emails
const ADMIN_EMAILS = ["haryalidryfruits@gmail.com", "mohit8307521465@gmail.com"];

// Auth handling
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!ADMIN_EMAILS.includes(user.email)) {
            alert("Access Denied: You are not an authorized admin.");
            signOut(auth).then(() => window.location.href = 'index.html');
            return;
        }
        document.getElementById('userEmail').textContent = user.email;
        initAdmin();
    } else {
        window.location.href = 'login.html';
    }
});

function initAdmin() {
    loadProducts();
    loadOrders();
    loadUsers();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// Navigation logic for tabs
document.querySelectorAll('.sidebar .nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar .nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const tabId = item.dataset.tab;
        document.getElementById('productsTab').classList.toggle('hidden', tabId !== 'products');
        document.getElementById('ordersTab').classList.toggle('hidden', tabId !== 'orders');
        document.getElementById('usersTab').classList.toggle('hidden', tabId !== 'users');
        document.getElementById('couponsTab').classList.toggle('hidden', tabId !== 'coupons');
        if (tabId === 'coupons') {
            loadCoupons();
        }
    });
});

// --- PRODUCT MANAGEMENT ---
async function loadProducts() {
    loadingOverlay.style.display = 'flex';
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ _id: doc.id, ...doc.data() });
        });
        renderProducts();
    } catch (error) {
        console.error("Error loading products:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function renderProducts() {
    productList.innerHTML = '';
    if (allProducts.length === 0) {
        productList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No products found.</p>';
        return;
    }

    allProducts.forEach(product => {
        const imgUrl = product.images && product.images['1'] ? product.images['1'] : '';
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="item-info">
                <img src="${imgUrl || 'https://placehold.co/100x100?text=No+Img'}" class="item-img">
                <div>
                    <h4 style="margin: 0;">${product.name}</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #666;">
                        ₹${product.price} 
                        ${product.originalPrice ? `<span style="text-decoration: line-through; margin-left: 5px; opacity: 0.6;">₹${product.originalPrice}</span>` : ''}
                        | ${product.category}
                    </p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-outline" onclick="window.editProduct('${product._id}')" style="padding: 5px 12px;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="window.deleteProduct('${product._id}')" style="padding: 5px 12px; margin-left: 8px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        productList.appendChild(div);
    });
}

// --- ORDER MANAGEMENT ---
async function loadOrders() {
    orderList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Loading orders...</p>';
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        allOrders = [];

        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const userOrders = userData.orders || [];
            userOrders.forEach(order => {
                allOrders.push({
                    ...order,
                    userUID: userDoc.id,
                    userEmail: userData.email || 'N/A'
                });
            });
        });

        // Sort by timestamp descending
        allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderOrders(allOrders);
    } catch (error) {
        console.error("Error loading orders:", error);
        orderList.innerHTML = '<p style="color: red; text-align: center;">Failed to load orders.</p>';
    }
}

function renderOrders(orders) {
    orderList.innerHTML = '';
    if (orders.length === 0) {
        orderList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No orders placed yet.</p>';
        return;
    }

    orders.forEach(order => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="item-info" style="flex: 1;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <h4 style="margin: 0;">#${order.orderId}</h4>
                        <span class="badge badge-${(order.status || 'Processing').toLowerCase()}">${order.status || 'Processing'}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.85rem; color: #555;">
                        <i class="fas fa-user-circle"></i> ${order.userEmail} | 
                        <i class="fas fa-calendar-alt"></i> ${new Date(order.timestamp).toLocaleDateString()}
                    </p>
                    <p style="margin: 0; font-weight: 700; color: var(--primary-dark);">₹${order.total.toLocaleString('en-IN')}</p>
                </div>
            </div>
            <div class="item-actions" style="display: flex; align-items: center; gap: 10px;">
                <select class="status-select" onchange="window.updateOrderStatus('${order.userUID}', '${order.orderId}', this.value)">
                    <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button class="btn btn-outline" onclick="window.viewOrderItems('${order.orderId}')" style="padding: 5px 12px;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        orderList.appendChild(div);
    });
}

// --- USER MANAGEMENT ---
async function loadUsers() {
    userList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Loading users...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        allUsers = [];
        querySnapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        renderUsers();
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function renderUsers() {
    userList.innerHTML = '';
    if (allUsers.length === 0) {
        userList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No users registered yet.</p>';
        return;
    }

    allUsers.forEach(user => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="item-info">
                 <div style="width:40px; height:40px; background: #eee; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#888;">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h4 style="margin: 0;">${user.displayName || 'Unverified User'}</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #666;">${user.email || 'No email'}</p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-outline" onclick="window.viewUserDetails('${user.id}')">
                    <i class="fas fa-id-card"></i> View Details
                </button>
            </div>
        `;
        userList.appendChild(div);
    });
}

// --- USER DETAILS MODAL ---
window.viewUserDetails = async (uid) => {
    loadingOverlay.style.display = 'flex';
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        document.getElementById('modalUserName').textContent = userData.displayName || 'Anonymous';
        document.getElementById('modalUserEmail').textContent = userData.email || 'N/A';

        // Prepare tab data
        window.currentViewingUser = userData;
        showModalTab('cart');

        userModal.style.display = 'flex';
    } catch (error) {
        console.error("Error fetching user details:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
};

function showModalTab(tabName) {
    const userData = window.currentViewingUser;
    modalTabContent.innerHTML = '';

    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });

    if (tabName === 'cart') {
        const cart = userData.cart || [];
        if (cart.length === 0) {
            modalTabContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: #888;">Cart is empty.</p>';
        } else {
            cart.forEach(item => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;';
                div.innerHTML = `
                    <span>${item.name} (${item.size})</span>
                    <span>Qty: ${item.quantity} | ₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
                `;
                modalTabContent.appendChild(div);
            });
        }
    } else if (tabName === 'wishlist') {
        const wishlist = userData.wishlist || [];
        if (wishlist.length === 0) {
            modalTabContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: #888;">Wishlist is empty.</p>';
        } else {
            wishlist.forEach(id => {
                const product = allProducts.find(p => p._id === id);
                const div = document.createElement('div');
                div.style.cssText = 'padding:10px; border-bottom:1px solid #eee;';
                div.innerHTML = product ? product.name : `Product ID: ${id}`;
                modalTabContent.appendChild(div);
            });
        }
    } else if (tabName === 'addresses') {
        const addresses = userData.addresses || [];
        if (addresses.length === 0) {
            modalTabContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: #888;">No saved addresses.</p>';
        } else {
            addresses.forEach((addr, idx) => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:15px; background:#f9f9f9; border-radius:8px; margin-bottom:10px;';
                div.innerHTML = `
                    <strong>${addr.name}</strong> (${addr.type || 'Home'})<br>
                    ${addr.address}, ${addr.city}, ${addr.state} - ${addr.pin}<br>
                    Phone: ${addr.phone}
                `;
                modalTabContent.appendChild(div);
            });
        }
    }
}

document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => showModalTab(btn.dataset.tab));
});

document.getElementById('closeUserModal').addEventListener('click', () => {
    userModal.style.display = 'none';
});

window.viewOrderItems = (orderId) => {
    const order = allOrders.find(o => o.orderId === orderId);
    const items = order ? (order.items || []) : [];
    document.getElementById('modalUserName').textContent = "Order Items";
    document.getElementById('modalUserEmail').textContent = order ? `Order ID: #${orderId}` : "";

    modalTabContent.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; gap:15px; padding:10px; border-bottom:1px solid #eee; align-items:center;';
        div.innerHTML = `
            <img src="${(item.images && item.images['1']) || 'https://placehold.co/50x50'}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
            <div style="flex:1;">
                <h4 style="margin:0;">${item.name}</h4>
                <p style="margin:0; font-size:0.85rem; color:#666;">Size: ${item.size} | Qty: ${item.quantity}</p>
            </div>
            <div style="font-weight:700;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
        `;
        modalTabContent.appendChild(div);
    });

    // Hide tabs for order items view
    document.querySelector('.modal-tab').parentElement.style.display = 'none';
    userModal.style.display = 'flex';
};

// Reset modal tabs display when closed
document.getElementById('closeUserModal').addEventListener('click', () => {
    document.querySelector('.modal-tab').parentElement.style.display = 'flex';
});

// --- ORDER STATUS UPDATES ---
window.updateOrderStatus = async (userUID, orderId, newStatus) => {
    if (!confirm(`Change order status to ${newStatus}?`)) return;

    loadingOverlay.style.display = 'flex';
    try {
        const userRef = doc(db, "users", userUID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            const orders = data.orders || [];
            const orderIdx = orders.findIndex(o => o.orderId === orderId);

            if (orderIdx > -1) {
                const oldStatus = orders[orderIdx].status;
                orders[orderIdx].status = newStatus;
                await updateDoc(userRef, { orders });

                // Send notification email
                await sendStatusUpdateEmail(orders[orderIdx], data.email);

                alert(`Status updated to ${newStatus}. Notification email sent.`);
                loadOrders();
            }
        }
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
    } finally {
        loadingOverlay.style.display = 'none';
    }
};

async function sendStatusUpdateEmail(order, userEmail) {
    try {
        const formData = new FormData();
        formData.append('_subject', `Update: Order ${order.orderId} status changed to ${order.status}`);
        formData.append('_template', 'table');
        formData.append('_captcha', 'false');

        formData.append('Order ID', order.orderId);
        formData.append('New Status', order.status);
        formData.append('Message', `Dear Customer, the status of your order ${order.orderId} has been updated to ${order.status}.`);
        formData.append('Total Amount', `₹${order.total.toLocaleString('en-IN')}`);

        // Use user email as CC or target
        formData.append('Customer Email', userEmail);

        await fetch('https://formsubmit.co/ajax/mohit8307521465@gmail.com', {
            method: 'POST',
            body: formData
        });
    } catch (err) {
        console.error("Email send failed:", err);
    }
}

// --- IMAGE HANDLING & FORM CRUD (keeping existing logic) ---
// ... (omitted for brevity, will be merged below)

// RE-INTEGRATING THE REMAINING LOGIC FROM ORIGINAL admin.js
// --- EXISTING PRODUCT FORM LOGIC ---

window.editProduct = (id) => {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;

    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productHindiName').value = product.hindiName || '';
    document.getElementById('productCategory').value = product.category || 'Other';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productOriginalPrice').value = product.originalPrice || '';
    document.getElementById('productQuantities').value = product.quantities_available ? product.quantities_available.join(', ') : '';

    currentImages = [];
    if (product.images) {
        Object.keys(product.images).sort().forEach(key => {
            currentImages.push(product.images[key]);
        });
    }
    renderImagePreviews();

    document.getElementById('formTitle').textContent = 'Edit Product';
    productFormContainer.classList.remove('hidden');
    productFormContainer.scrollIntoView({ behavior: 'smooth' });
};

window.deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    loadingOverlay.style.display = 'flex';
    try {
        await deleteDoc(doc(db, "products", id));
        loadProducts();
    } catch (error) {
        console.error("Error deleting:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
};

document.getElementById('addNewBtn').addEventListener('click', () => {
    resetForm();
    productFormContainer.classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Add New Product';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    productFormContainer.classList.add('hidden');
});

imageInput.addEventListener('change', async function () {
    const files = Array.from(this.files);
    if (files.length > 0) {
        if (currentImages.length + files.length > 5) {
            alert("Max 5 images.");
            return;
        }
        loadingOverlay.style.display = 'flex';
        for (const file of files) {
            const compressed = await compressImage(file);
            currentImages.push(compressed);
        }
        renderImagePreviews();
        loadingOverlay.style.display = 'none';
        this.value = '';
    }
});

function renderImagePreviews() {
    imagePreviewContainer.innerHTML = '';
    currentImages.forEach((imgData, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
            <img src="${imgData}">
            <button type="button" class="remove-img" onclick="window.removeImage(${index})">&times;</button>
        `;
        imagePreviewContainer.appendChild(item);
    });
}

window.removeImage = (index) => {
    currentImages.splice(index, 1);
    renderImagePreviews();
};

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentImages.length === 0) {
        alert("Please add at least one image.");
        return;
    }

    loadingOverlay.style.display = 'flex';
    const id = document.getElementById('productId').value;
    const isEdit = !!id;
    const docId = isEdit ? id : 'prod-' + Date.now();

    const name = document.getElementById('productName').value;
    const hindiName = document.getElementById('productHindiName').value;
    const category = document.getElementById('productCategory').value;
    const price = Number(document.getElementById('productPrice').value);
    const originalPrice = document.getElementById('productOriginalPrice').value ? Number(document.getElementById('productOriginalPrice').value) : null;
    const quantities = document.getElementById('productQuantities').value.split(',').map(s => s.trim()).filter(s => s);

    try {
        const imagesObject = {};
        currentImages.forEach((url, index) => {
            imagesObject[index + 1] = url;
        });

        const productData = {
            id: docId,
            name,
            hindiName,
            category,
            price,
            originalPrice,
            quantities_available: quantities,
            images: imagesObject,
            createdAt: isEdit ? (allProducts.find(p => p._id === id)?.createdAt || Date.now()) : Date.now()
        };

        await setDoc(doc(db, "products", docId), productData);
        productFormContainer.classList.add('hidden');
        resetForm();
        loadProducts();
        alert('Product saved!');
    } catch (error) {
        console.error("Error saving:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

function resetForm() {
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productOriginalPrice').value = '';
    currentImages = [];
    imagePreviewContainer.innerHTML = '';
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 800;
                if (width > max || height > max) {
                    if (width > height) {
                        height *= max / width;
                        width = max;
                    } else {
                        width *= max / height;
                        height = max;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

// --- COUPON MANAGEMENT ---
async function loadCoupons() {
    couponList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Loading coupons...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "coupons"));
        allCoupons = [];
        querySnapshot.forEach((doc) => {
            allCoupons.push({ _id: doc.id, ...doc.data() });
        });
        renderCoupons();
    } catch (error) {
        console.error("Error loading coupons:", error);
        couponList.innerHTML = '<p style="color: red; text-align: center;">Failed to load coupons.</p>';
    }
}

function renderCoupons() {
    couponList.innerHTML = '';
    if (allCoupons.length === 0) {
        couponList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No coupons created yet.</p>';
        return;
    }

    allCoupons.forEach(coupon => {
        const div = document.createElement('div');
        div.className = 'list-item';
        
        let formattedExpiry = 'No Expiry';
        if (coupon.expiryDate) {
            try {
                const dateObj = coupon.expiryDate.seconds ? new Date(coupon.expiryDate.seconds * 1000) : new Date(coupon.expiryDate);
                formattedExpiry = dateObj.toLocaleDateString();
            } catch (e) {
                formattedExpiry = coupon.expiryDate;
            }
        }

        div.innerHTML = `
            <div class="item-info" style="flex: 1;">
                <div style="width: 40px; height: 40px; background: #e0f2fe; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 1.25rem;">
                    <i class="fas fa-ticket-alt"></i>
                </div>
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <h4 style="margin: 0; font-family: monospace; font-size: 1.1rem; letter-spacing: 0.5px;">${coupon.code}</h4>
                        <span class="badge ${coupon.active ? 'badge-completed' : 'badge-cancelled'}" style="font-size: 0.7rem; padding: 2px 8px;">
                            ${coupon.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 0.85rem; color: #555;">
                        <strong>Discount:</strong> ${coupon.discountPercent}% | 
                        <strong>Min Order:</strong> ₹${coupon.minOrder || 0} | 
                        <strong>Expires:</strong> ${formattedExpiry}
                    </p>
                </div>
            </div>
            <div class="item-actions" style="display: flex; align-items: center; gap: 8px;">
                <button class="btn btn-outline" onclick="window.toggleCouponActive('${coupon._id}', ${coupon.active})" style="padding: 5px 12px; font-size: 0.8rem;">
                    <i class="fas ${coupon.active ? 'fa-eye-slash' : 'fa-eye'}"></i> ${coupon.active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-danger" onclick="window.deleteCoupon('${coupon._id}')" style="padding: 5px 12px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        couponList.appendChild(div);
    });
}

// Global actions for Coupon List
window.toggleCouponActive = async (id, currentStatus) => {
    loadingOverlay.style.display = 'flex';
    try {
        await updateDoc(doc(db, "coupons", id), {
            active: !currentStatus
        });
        loadCoupons();
    } catch (error) {
        console.error("Error toggling status:", error);
        alert("Failed to toggle active state.");
    } finally {
        loadingOverlay.style.display = 'none';
    }
};

window.deleteCoupon = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    loadingOverlay.style.display = 'flex';
    try {
        await deleteDoc(doc(db, "coupons", id));
        loadCoupons();
    } catch (error) {
        console.error("Error deleting coupon:", error);
        alert("Failed to delete coupon.");
    } finally {
        loadingOverlay.style.display = 'none';
    }
};

// Coupon Form Listeners
document.getElementById('addCouponBtn').addEventListener('click', () => {
    couponForm.reset();
    document.getElementById('couponId').value = '';
    document.getElementById('couponFormTitle').textContent = 'Add New Coupon';
    couponFormContainer.classList.remove('hidden');
});

document.getElementById('cancelCouponBtn').addEventListener('click', () => {
    couponFormContainer.classList.add('hidden');
});

couponForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.style.display = 'flex';
    
    const code = document.getElementById('couponCodeInput').value.trim().toUpperCase();
    const discountPercent = Number(document.getElementById('couponDiscount').value);
    const minOrder = Number(document.getElementById('couponMinOrder').value);
    const expiryDate = document.getElementById('couponExpiry').value;
    
    try {
        const couponData = {
            code,
            discountPercent,
            minOrder,
            expiryDate,
            active: true
        };
        
        const docId = code; // Use the coupon code as the document ID for simplicity and unique code check
        await setDoc(doc(db, "coupons", docId), couponData);
        
        couponFormContainer.classList.add('hidden');
        couponForm.reset();
        loadCoupons();
        alert('Coupon saved successfully!');
    } catch (error) {
        console.error("Error saving coupon:", error);
        alert('Failed to save coupon.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// --- RANDOM REVIEWS SEEDER ---
window.seedRandomReviews = async () => {
    if (!confirm("Are you sure you want to seed 2-8 random reviews on all products? This will delete all existing reviews first!")) return;

    loadingOverlay.style.display = 'flex';
    document.querySelector('#loadingOverlay p').textContent = "Seeding reviews... Please wait.";

    const namesPool = [
        "Amit Sharma", "Priya Patel", "Rohan Gupta", "Deepak Verma", "Neha Singh",
        "Sunita Rao", "Karan Malhotra", "Vikram Sen", "Ananya Das", "Suresh Kumar",
        "Meera Nair", "Arjun Reddy", "Kriti Joshi", "Sanjay Dutt", "Divya Pillai",
        "Rajesh Mehta", "Shalini Iyer", "Aditya Bose", "Pooja Hegde", "Rahul Mishra"
    ];

    const reviewsByRating = {
        3: [
            "Decent quality, but shipping took longer than expected.",
            "Taste is good, but the packaging could be improved.",
            "Alright product, but a bit pricey for the quantity.",
            "Average freshness. Satisfactory but not outstanding.",
            "Average dry fruits, normal taste. Nothing special but acceptable.",
            "The size of the nuts is average. Flavor is fine."
        ],
        4: [
            "Really fresh and tasty dry fruits. Good value for money.",
            "Very clean and crisp packaging. Taste is excellent.",
            "Quality is high and delivery was quick. Will buy again.",
            "Great taste and freshness. Happy with the purchase.",
            "Solid quality dry fruits. Clean and well sorted.",
            "Nice texture and flavor. The packaging is airtight."
        ],
        5: [
            "Absolutely premium quality! The best dry fruits I have ordered online.",
            "Super fresh, big sizes, and delicious taste. 10/5 stars!",
            "Excellent packaging, quick shipping, and outstanding premium dry fruits.",
            "Highly recommended! Incredibly tasty and fresh.",
            "Amazing taste and crispiness. Will order in bulk next time.",
            "Exceptional freshness and sweet, buttery flavor. Highly satisfied!"
        ]
    };

    try {
        console.log("Fetching products to seed reviews...");
        const productsSnapshot = await getDocs(collection(db, "products"));
        const products = [];
        productsSnapshot.forEach((docSnap) => {
            products.push({ id: docSnap.id, ...docSnap.data() });
        });

        console.log(`Found ${products.length} products to seed reviews for.`);

        for (const product of products) {
            console.log(`Processing product: ${product.name} (ID: ${product.id})`);

            // 1. Delete existing reviews for this product (best effort)
            try {
                const reviewsQuery = query(collection(db, "reviews"), where("productId", "==", product.id));
                const existingReviewsSnap = await getDocs(reviewsQuery);
                for (const docSnap of existingReviewsSnap.docs) {
                    await deleteDoc(doc(db, "reviews", docSnap.id));
                }
            } catch (delErr) {
                console.warn(`Could not clear old reviews for product ${product.id}:`, delErr);
            }

            // 2. Generate random reviews count (2 to 8)
            const reviewsCount = Math.floor(Math.random() * 7) + 2; // 2 to 8
            let ratingSum = 0;
            const generatedReviews = [];

            for (let i = 0; i < reviewsCount; i++) {
                // Pick rating (3 to 5)
                const rating = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
                ratingSum += rating;

                // Pick random name
                const userName = namesPool[Math.floor(Math.random() * namesPool.length)];

                // Pick random review comment
                const comments = reviewsByRating[rating];
                const reviewText = comments[Math.floor(Math.random() * comments.length)];

                // Pick random timestamp within the last 30 days
                const daysAgo = Math.floor(Math.random() * 30);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

                const reviewData = {
                    productId: product.id,
                    userId: auth.currentUser ? auth.currentUser.uid : "anonymous-seeder",
                    userName,
                    rating,
                    reviewText,
                    timestamp: date,
                    verifiedBuyer: true
                };

                generatedReviews.push(reviewData);
            }

            // 3. Write reviews to Firestore
            for (const review of generatedReviews) {
                await addDoc(collection(db, "reviews"), review);
            }

            // 4. Calculate aggregates
            const averageRating = parseFloat((ratingSum / reviewsCount).toFixed(1));

            // 5. Update product document
            await updateDoc(doc(db, "products", product.id), {
                averageRating,
                reviewCount: reviewsCount
            });
            console.log(`Seeded reviews for product ${product.name}. Count: ${reviewsCount}, Avg: ${averageRating}`);
        }

        alert("Successfully seeded 2-8 random reviews on all products!");
        loadProducts(); // Reload the UI list

    } catch (err) {
        console.error("Error seeding reviews:", err);
        alert("Failed to seed reviews: " + err.message);
    } finally {
        loadingOverlay.style.display = 'none';
        document.querySelector('#loadingOverlay p').textContent = "Processing...";
    }
};
