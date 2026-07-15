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

// --- VARIANTS LOGIC ---
window.addVariantRow = function(weight = '', price = '', originalPrice = '') {
    const variantsContainer = document.getElementById('variantsContainer');
    if (!variantsContainer) return;
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Weight</label>
            <input type="text" class="var-weight" list="weightSuggestions" value="${weight}" required placeholder="e.g. 250g">
        </div>
        <div class="form-group">
            <label>Price (₹)</label>
            <input type="number" class="var-price" value="${price}" required min="0">
        </div>
        <div class="form-group">
            <label>MRP (₹)</label>
            <input type="number" class="var-original-price" value="${originalPrice}" min="0" placeholder="Optional">
        </div>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="padding: 10px; height: 42px; align-self: flex-end;"><i class="fas fa-trash"></i></button>
    `;
    variantsContainer.appendChild(row);
}

window.updateWeightSuggestions = function(products) {
    const weightSuggestions = document.getElementById('weightSuggestions');
    if(!weightSuggestions) return;
    const weights = new Set();
    products.forEach(p => {
        if(p.variants) {
            p.variants.forEach(v => weights.add(v.weight));
        } else if(p.quantities_available) {
            p.quantities_available.forEach(w => weights.add(w));
        }
    });
    weightSuggestions.innerHTML = '';
    weights.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        weightSuggestions.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const addVariantBtn = document.getElementById('addVariantBtn');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => window.addVariantRow());
    }
});
// ----------------------


// Admin Emails
const ADMIN_EMAILS = ["haryalidryfruits@gmail.com", "mohit8307521465@gmail.com", "ravinder.cgwb@gmail.com"];

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
        if (window.updateWeightSuggestions) window.updateWeightSuggestions(allProducts);
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
        productList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666; padding: 2rem;">No products found.</td></tr>';
        return;
    }

    allProducts.forEach(product => {
        const imgUrl = product.images && product.images['1'] ? product.images['1'] : 'https://placehold.co/100x100?text=No+Img';
        
        // Build badges
        const tagsHtml = (product.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join('');
        const groupsHtml = (product.groups || []).map(g => `<span class="group-badge">${g}</span>`).join('');
        const hasShortcuts = product.longDescription && (product.longDescription.nutritionKey || product.longDescription.storageKey);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${imgUrl}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;">
            </td>
            <td>
                <div class="prod-title">${product.name}</div>
                <div class="prod-meta"><strong>Short:</strong> ${product.shortTitle || 'N/A'}</div>
                <div class="prod-meta" style="color: #888;">${product.shortDescription || 'No description'}</div>
                ${hasShortcuts ? '<div class="prod-meta"><i class="fas fa-bolt" style="color:#fc9220;"></i> Has Shortcuts</div>' : ''}
            </td>
            <td>
                <div class="prod-meta"><strong>Cat:</strong> ${product.category}</div>
                <div style="margin-top: 4px;">${tagsHtml}</div>
                <div style="margin-top: 4px;">${groupsHtml}</div>
            </td>
            <td>
                <div class="prod-title">₹${product.price}</div>
                ${product.originalPrice ? `<div class="prod-meta" style="text-decoration: line-through;">MRP: ₹${product.originalPrice}</div>` : ''}
                <div class="prod-meta"><strong>Sizes:</strong> ${(product.quantities_available || []).join(', ')}</div>
            </td>
            <td style="text-align: right;">
                <button class="btn btn-outline" onclick="window.editProduct('${product._id}')" style="padding: 6px 10px; margin-bottom: 4px; width: 100%; justify-content: center;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="window.deleteProduct('${product._id}')" style="padding: 6px 10px; width: 100%; justify-content: center;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        productList.appendChild(tr);
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
const productModalOverlay = document.getElementById('productModalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');

window.editProduct = (id) => {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;

    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productShortTitle').value = product.shortTitle || '';
    document.getElementById('productHindiName').value = product.hindiName || '';
    
    // Tag inputs
    window.setTagValues('categoryTagInput', product.category ? [product.category] : ['Other Dry Fruits']);
    window.setTagValues('keywordsTagInput', product.keywords || []);
    window.setTagValues('tagsTagInput', product.tags || []);
    window.setTagValues('groupsTagInput', product.groups || []);
    
    const variantsContainer = document.getElementById('variantsContainer');
    if (variantsContainer) variantsContainer.innerHTML = '';
    
    const getLegacyPriceForSize = (basePrice, size) => {
        const bp = parseFloat(basePrice) || 0;
        if (!size) return bp;
        const s = size.toLowerCase().replace(/\s+/g, '').replace('gm', 'g');
        if (s.includes('500g')) return bp * 2;
        if (s.includes('1kg')) return bp * 4;
        if (s.includes('2kg')) return bp * 8;
        return bp * 1;
    };

    if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => {
            window.addVariantRow(v.weight, v.price, v.originalPrice || '');
        });
    } else if (product.quantities_available && product.quantities_available.length > 0) {
        product.quantities_available.forEach(qty => {
            const price = getLegacyPriceForSize(product.price, qty);
            const originalPrice = product.originalPrice ? getLegacyPriceForSize(product.originalPrice, qty) : '';
            window.addVariantRow(qty, price, originalPrice);
        });
    } else {
        window.addVariantRow('250g', product.price || '', product.originalPrice || '');
    }
    
    document.getElementById('productShortDescription').value = product.shortDescription || '';
    
    // Handle Long Description Object vs String
    let longDescText = '';
    let nutKey = '';
    let storKey = '';
    if (product.longDescription) {
        if (typeof product.longDescription === 'object') {
            longDescText = product.longDescription.details || '';
            nutKey = product.longDescription.nutritionKey || '';
            storKey = product.longDescription.storageKey || '';
        } else {
            longDescText = product.longDescription;
        }
    }
    document.getElementById('productLongDescription').value = longDescText;
    document.getElementById('productNutritionKey').value = nutKey;
    document.getElementById('productStorageKey').value = storKey;

    currentImages = [];
    if (product.images) {
        Object.keys(product.images).sort().forEach(key => {
            currentImages.push(product.images[key]);
        });
    }
    renderImagePreviews();

    productModalOverlay.classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Edit Product';
    window.scrollTo(0, 0);
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
    productModalOverlay.classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Add New Product';
});

const closeModal = () => {
    productModalOverlay.classList.add('hidden');
};

document.getElementById('cancelBtn').addEventListener('click', closeModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
productModalOverlay.addEventListener('click', (e) => {
    if (e.target === productModalOverlay) closeModal();
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

    const name = document.getElementById('productName').value.trim();
    const shortTitle = document.getElementById('productShortTitle').value.trim();
    const hindiName = document.getElementById('productHindiName').value.trim();
    
    const categoryTags = window.getTagValues('categoryTagInput');
    const category = categoryTags.length > 0 ? categoryTags[0] : 'Other Dry Fruits';
    
    // Gather variants
    const variantsContainer = document.getElementById('variantsContainer');
    const variantRows = variantsContainer ? variantsContainer.querySelectorAll('.variant-row') : [];
    const variants = [];
    variantRows.forEach(row => {
        const weight = row.querySelector('.var-weight').value.trim();
        const price = Number(row.querySelector('.var-price').value);
        const originalPriceInput = row.querySelector('.var-original-price').value;
        const originalPrice = originalPriceInput ? Number(originalPriceInput) : null;
        
        if(weight && price > 0) {
            let discount = 0;
            if (originalPrice && originalPrice > price) {
                discount = Math.round(((originalPrice - price) / originalPrice) * 100);
            }
            variants.push({ weight, price, originalPrice, discount });
        }
    });

    if(variants.length === 0) {
        alert("Please add at least one valid variant with a weight and price.");
        loadingOverlay.style.display = 'none';
        return;
    }
    
    const shortDescription = document.getElementById('productShortDescription').value.trim();
    const details = document.getElementById('productLongDescription').value.trim();
    const nutritionKey = document.getElementById('productNutritionKey').value;
    const storageKey = document.getElementById('productStorageKey').value;
    
    const keywords = window.getTagValues('keywordsTagInput').map(s => s.toLowerCase());
    const tags = window.getTagValues('tagsTagInput');
    const groups = window.getTagValues('groupsTagInput');

    // discount calculated per variant

    try {
        const imagesObject = {};
        currentImages.forEach((url, index) => {
            imagesObject[index + 1] = url;
        });

        const productData = {
            id: docId,
            name,
            shortTitle,
            hindiName,
            category,
            variants,
            price: variants[0]?.price || 0,
            originalPrice: variants[0]?.originalPrice || null,
            discount: variants[0]?.discount || 0,
            quantities_available: variants.map(v => v.weight),
            shortDescription,
            longDescription: {
                details,
                nutritionKey: nutritionKey || null,
                storageKey: storageKey || null
            },
            keywords,
            tags,
            groups,
            images: imagesObject,
            lastUpdated: new Date().toISOString(),
            createdAt: isEdit ? (allProducts.find(p => p._id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
        };

        await setDoc(doc(db, "products", docId), productData);
        productModalOverlay.classList.add('hidden');
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
    document.getElementById('productShortTitle').value = '';
    document.getElementById('productShortDescription').value = '';
    document.getElementById('productLongDescription').value = '';
    document.getElementById('productNutritionKey').value = '';
    document.getElementById('productStorageKey').value = '';
    
    window.setTagValues('categoryTagInput', []);
    const variantsContainer = document.getElementById('variantsContainer');
    if (variantsContainer) variantsContainer.innerHTML = '';
    window.addVariantRow();
    window.setTagValues('keywordsTagInput', []);
    window.setTagValues('tagsTagInput', []);
    window.setTagValues('groupsTagInput', []);
    
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
        couponList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666; padding: 2rem;">No coupons created yet.</td></tr>';
        return;
    }

    allCoupons.forEach(coupon => {
        const tr = document.createElement('tr');
        
        let formattedExpiry = 'No Expiry';
        if (coupon.expiryDate) {
            try {
                const dateObj = coupon.expiryDate.seconds ? new Date(coupon.expiryDate.seconds * 1000) : new Date(coupon.expiryDate);
                formattedExpiry = dateObj.toLocaleDateString();
            } catch (e) {
                formattedExpiry = coupon.expiryDate;
            }
        }
        
        const discountStr = coupon.discountFlat ? `₹${coupon.discountFlat} OFF` : `${coupon.discountPercent}% OFF`;
        
        let eligibilityStr = 'Everyone';
        if (coupon.eligibility) {
            if (coupon.eligibility.type === 'new_users') eligibilityStr = `New Users (<${coupon.eligibility.threshold}d)`;
            else if (coupon.eligibility.type === 'first_order') eligibilityStr = 'First Order Only';
            else if (coupon.eligibility.type === 'profile_completion') eligibilityStr = 'Profile Completed';
            else if (coupon.eligibility.type === 'total_spent') eligibilityStr = `Spent > ₹${coupon.eligibility.threshold}`;
            else if (coupon.eligibility.type === 'specific_users') eligibilityStr = 'Specific Users';
        }
        
        const maxUses = coupon.maxUsesGlobally || '∞';
        const timesUsed = coupon.timesUsed || 0;
        const limitsStr = `<div style="font-size: 0.85rem;">Used: ${timesUsed}/${maxUses}</div>
                           <div style="font-size: 0.85rem; color: #666;">Min Order: ₹${coupon.minOrder || 0}</div>`;

        tr.innerHTML = `
            <td>
                <h4 style="margin: 0; font-family: monospace; font-size: 1.1rem; letter-spacing: 0.5px; color: var(--primary-dark);">${coupon.code}</h4>
            </td>
            <td style="font-weight: 600;">${discountStr}</td>
            <td><span class="badge" style="background: #e0f2fe; color: #0284c7;">${eligibilityStr}</span></td>
            <td>${limitsStr}</td>
            <td>
                <span class="badge ${coupon.active ? 'badge-completed' : 'badge-cancelled'}">
                    ${coupon.active ? 'Active' : 'Inactive'}
                </span>
                <div style="font-size: 0.8rem; margin-top: 4px; color: #888;">Expires: ${formattedExpiry}</div>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn btn-outline" onclick="window.toggleCouponActive('${coupon._id}', ${coupon.active})" style="padding: 5px 10px;">
                        <i class="fas ${coupon.active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button class="btn btn-danger" onclick="window.deleteCoupon('${coupon._id}')" style="padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        couponList.appendChild(tr);
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

// Coupon Modal Elements
const couponModalOverlay = document.getElementById('couponModalOverlay');
const closeCouponModalBtn = document.getElementById('closeCouponModalBtn');
const cancelCouponBtnModal = document.getElementById('cancelCouponBtnModal');
// couponForm is already declared at the top of the file

// Eligibility Type change listener
const couponEligibilityType = document.getElementById('couponEligibilityType');
const eligibilityThresholdContainer = document.getElementById('eligibilityThresholdContainer');
const eligibilityThresholdLabel = document.getElementById('eligibilityThresholdLabel');
const eligibilityUidsContainer = document.getElementById('eligibilityUidsContainer');

couponEligibilityType.addEventListener('change', (e) => {
    const val = e.target.value;
    eligibilityThresholdContainer.style.display = 'none';
    eligibilityUidsContainer.style.display = 'none';
    
    if (val === 'new_users') {
        eligibilityThresholdContainer.style.display = 'block';
        eligibilityThresholdLabel.textContent = 'Days since registration';
        document.getElementById('couponEligibilityThreshold').placeholder = 'e.g. 7';
    } else if (val === 'total_spent') {
        eligibilityThresholdContainer.style.display = 'block';
        eligibilityThresholdLabel.textContent = 'Minimum Total Spent (₹)';
        document.getElementById('couponEligibilityThreshold').placeholder = 'e.g. 1000';
    } else if (val === 'specific_users') {
        eligibilityUidsContainer.style.display = 'block';
    }
});

function openCouponModal() {
    couponForm.reset();
    document.getElementById('couponId').value = '';
    document.getElementById('couponTimesUsed').value = '0';
    document.getElementById('couponFormTitle').textContent = 'Add New Coupon';
    couponEligibilityType.dispatchEvent(new Event('change')); // reset UI
    couponModalOverlay.classList.remove('hidden');
}

function closeCouponModal() {
    couponModalOverlay.classList.add('hidden');
}

document.getElementById('addCouponBtn').addEventListener('click', openCouponModal);
closeCouponModalBtn.addEventListener('click', closeCouponModal);
cancelCouponBtnModal.addEventListener('click', closeCouponModal);

// Seed Default Campaigns
document.getElementById('seedCouponsBtn')?.addEventListener('click', async () => {
    if (!confirm('This will automatically create 5 default smart campaigns (Welcome1, Welcome7, Welcome30, VIP1000, ProfileReward). Proceed?')) return;
    loadingOverlay.style.display = 'flex';
    
    const defaultCoupons = [
        {
            code: 'WELCOME1', active: true, discountPercent: 20, discountFlat: 0, minOrder: 0, 
            expiryDate: null, maxUsesGlobally: null, maxUsesPerUser: 1, timesUsed: 0,
            restrictedCategories: [], restrictedTags: [], eligibility: { type: 'new_users', threshold: 1 }
        },
        {
            code: 'WELCOME7', active: true, discountPercent: 15, discountFlat: 0, minOrder: 500, 
            expiryDate: null, maxUsesGlobally: null, maxUsesPerUser: 1, timesUsed: 0,
            restrictedCategories: [], restrictedTags: [], eligibility: { type: 'new_users', threshold: 7 }
        },
        {
            code: 'WELCOME30', active: true, discountPercent: 10, discountFlat: 0, minOrder: 800, 
            expiryDate: null, maxUsesGlobally: null, maxUsesPerUser: 1, timesUsed: 0,
            restrictedCategories: [], restrictedTags: [], eligibility: { type: 'new_users', threshold: 30 }
        },
        {
            code: 'VIP1000', active: true, discountPercent: 0, discountFlat: 200, minOrder: 1500, 
            expiryDate: null, maxUsesGlobally: null, maxUsesPerUser: null, timesUsed: 0,
            restrictedCategories: [], restrictedTags: [], eligibility: { type: 'total_spent', threshold: 1000 }
        },
        {
            code: 'PROFILEPRO', active: true, discountPercent: 10, discountFlat: 0, minOrder: 0, 
            expiryDate: null, maxUsesGlobally: null, maxUsesPerUser: 1, timesUsed: 0,
            restrictedCategories: [], restrictedTags: [], eligibility: { type: 'profile_completion' }
        }
    ];

    try {
        for (const coupon of defaultCoupons) {
            await setDoc(doc(db, "coupons", coupon.code), coupon);
        }
        loadCoupons();
        alert('Default campaigns generated successfully!');
    } catch (error) {
        console.error("Error seeding coupons:", error);
        alert('Failed to generate campaigns.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

couponForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.style.display = 'flex';
    
    const code = document.getElementById('couponCodeInput').value.trim().toUpperCase();
    const active = document.getElementById('couponActive').checked;
    
    const discountType = document.getElementById('couponDiscountType').value;
    const discountVal = Number(document.getElementById('couponDiscountValue').value);
    
    let discountPercent = 0;
    let discountFlat = 0;
    if (discountType === 'percent') discountPercent = discountVal;
    if (discountType === 'flat') discountFlat = discountVal;
    
    const minOrder = Number(document.getElementById('couponMinOrder').value) || 0;
    const expiryDate = document.getElementById('couponExpiry').value;
    const maxUsesGlobally = Number(document.getElementById('couponMaxUsesGlobally').value) || null;
    const maxUsesPerUser = Number(document.getElementById('couponMaxUsesPerUser').value) || 1;
    const timesUsed = Number(document.getElementById('couponTimesUsed').value) || 0;
    
    const restrictCatsStr = document.getElementById('couponRestrictedCategories').value.trim();
    const restrictTagsStr = document.getElementById('couponRestrictedTags').value.trim();
    
    const restrictedCategories = restrictCatsStr ? restrictCatsStr.split(',').map(s=>s.trim()) : [];
    const restrictedTags = restrictTagsStr ? restrictTagsStr.split(',').map(s=>s.trim()) : [];
    
    // Eligibility
    const eligType = couponEligibilityType.value;
    const eligThreshold = Number(document.getElementById('couponEligibilityThreshold').value) || 0;
    const uidsStr = document.getElementById('couponAllowedUids').value.trim();
    const allowedUids = uidsStr ? uidsStr.split(',').map(s=>s.trim()) : [];
    
    const eligibility = { type: eligType };
    if (eligType === 'new_users' || eligType === 'total_spent') {
        eligibility.threshold = eligThreshold;
    } else if (eligType === 'specific_users') {
        eligibility.allowedUids = allowedUids;
    }
    
    try {
        const couponData = {
            code,
            active,
            discountPercent,
            discountFlat,
            minOrder,
            expiryDate,
            maxUsesGlobally,
            maxUsesPerUser,
            timesUsed,
            restrictedCategories,
            restrictedTags,
            eligibility
        };
        
        // Remove undefined/nulls if preferred, but Firestore handles them ok or we can just send.
        const docId = code; 
        await setDoc(doc(db, "coupons", docId), couponData);
        
        closeCouponModal();
        loadCoupons();
        // Removed alert per style, list reloads cleanly.
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

// --- TAG INPUT SYSTEM ---
window.tagInputState = {};

function initTagInputs() {
    const containers = document.querySelectorAll('.tag-input-container');
    containers.forEach(container => {
        const id = container.id;
        window.tagInputState[id] = [];
        
        container.innerHTML = `
            <div class="pills-wrapper" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
            <input type="text" class="tag-input" placeholder="${container.dataset.placeholder || ''}">
            <div class="tag-suggestions"></div>
        `;
        
        const input = container.querySelector('.tag-input');
        const suggestionsDiv = container.querySelector('.tag-suggestions');
        const maxTags = parseInt(container.dataset.max) || Infinity;
        
        const getSuggestions = (query) => {
            const set = new Set();
            let prop = '';
            if (id === 'categoryTagInput') prop = 'category';
            if (id === 'keywordsTagInput') prop = 'keywords';
            if (id === 'tagsTagInput') prop = 'tags';
            if (id === 'groupsTagInput') prop = 'groups';
            
            allProducts.forEach(p => {
                if (Array.isArray(p[prop])) {
                    p[prop].forEach(v => set.add(v));
                } else if (typeof p[prop] === 'string' && p[prop].trim() !== '') {
                    set.add(p[prop]);
                }
            });
            
            const existing = window.tagInputState[id].map(t => t.toLowerCase());
            return Array.from(set).filter(s => 
                s.toLowerCase().includes(query.toLowerCase()) && !existing.includes(s.toLowerCase())
            ).sort().slice(0, 5);
        };
        
        const renderSuggestions = (query) => {
            const matches = getSuggestions(query);
            if (matches.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }
            suggestionsDiv.innerHTML = matches.map((m, idx) => 
                `<div class="tag-suggestion-item ${idx===0?'active':''}">${m}</div>`
            ).join('');
            suggestionsDiv.style.display = 'block';
        };
        
        const addTag = (val) => {
            const trimmed = val.trim();
            if (!trimmed) return;
            if (window.tagInputState[id].length >= maxTags) {
                if (maxTags === 1) {
                    window.tagInputState[id] = [trimmed]; // Replace for single
                } else {
                    return;
                }
            } else if (!window.tagInputState[id].some(t => t.toLowerCase() === trimmed.toLowerCase())) {
                window.tagInputState[id].push(trimmed);
            }
            input.value = '';
            renderPills();
            suggestionsDiv.style.display = 'none';
        };
        
        const renderPills = () => {
            const wrapper = container.querySelector('.pills-wrapper');
            wrapper.innerHTML = window.tagInputState[id].map(tag => `
                <span class="tag-pill">
                    ${tag}
                    <span class="remove-tag" data-tag="${tag}">&times;</span>
                </span>
            `).join('');
            
            if (window.tagInputState[id].length >= maxTags && maxTags > 1) {
                input.style.display = 'none';
            } else {
                input.style.display = 'block';
            }
        };
        
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const tagToRemove = e.target.dataset.tag;
                window.tagInputState[id] = window.tagInputState[id].filter(t => t !== tagToRemove);
                renderPills();
            } else if (e.target.classList.contains('tag-suggestion-item')) {
                addTag(e.target.textContent);
            } else {
                input.focus();
            }
        });
        
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.includes(',')) {
                const parts = val.split(',');
                parts.forEach(p => addTag(p));
                e.target.value = '';
            } else {
                renderSuggestions(val);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const active = suggestionsDiv.querySelector('.active');
                if (active && suggestionsDiv.style.display === 'block') {
                    addTag(active.textContent);
                } else {
                    addTag(input.value);
                }
            } else if (e.key === 'Backspace' && input.value === '') {
                window.tagInputState[id].pop();
                renderPills();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const items = Array.from(suggestionsDiv.querySelectorAll('.tag-suggestion-item'));
                const idx = items.findIndex(el => el.classList.contains('active'));
                if (idx > -1 && idx < items.length - 1) {
                    items[idx].classList.remove('active');
                    items[idx + 1].classList.add('active');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const items = Array.from(suggestionsDiv.querySelectorAll('.tag-suggestion-item'));
                const idx = items.findIndex(el => el.classList.contains('active'));
                if (idx > 0) {
                    items[idx].classList.remove('active');
                    items[idx - 1].classList.add('active');
                }
            }
        });
        
        input.addEventListener('focus', () => renderSuggestions(input.value));
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    });
}

window.getTagValues = (id) => {
    return window.tagInputState[id] || [];
};

window.setTagValues = (id, values) => {
    if (!window.tagInputState) window.tagInputState = {};
    window.tagInputState[id] = [...values];
    const container = document.getElementById(id);
    if (container) {
        const wrapper = container.querySelector('.pills-wrapper');
        const input = container.querySelector('.tag-input');
        const maxTags = parseInt(container.dataset.max) || Infinity;
        if (wrapper) {
            wrapper.innerHTML = window.tagInputState[id].map(tag => `
                <span class="tag-pill">
                    ${tag}
                    <span class="remove-tag" data-tag="${tag}">&times;</span>
                </span>
            `).join('');
            if (window.tagInputState[id].length >= maxTags && maxTags > 1) {
                input.style.display = 'none';
            } else {
                input.style.display = 'block';
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initTagInputs();

    const applySeoBtn = document.getElementById('applySeoBtn');
    if (applySeoBtn) {
        applySeoBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to apply the SEO updates to all 8 products?')) return;
            applySeoBtn.disabled = true;
            applySeoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
            try {
                const productsUpdates = {
                    "prod-1781540888057": {
                        "name": "Sanora Almonds – Pure Crunch with Everyday Nourishment",
                        "shortTitle": "Sanora Almonds",
                        "hindiName": "बादाम",
                        "shortDescription": "Premium quality California and Sanora almonds. Handpicked, crunchy, and packed with nutrition for a healthy lifestyle.",
                        "category": "Almonds",
                        "keywords": ["almonds", "badam", "giri", "sanora badam", "premium almonds", "california badam"],
                        "tags": ["Premium Quality", "100% Natural", "Best Seller"],
                        "groups": ["Daily", "Family", "Kids"],
                        "longDescription": {
                            "nutritionKey": "ALMONDS",
                            "storageKey": "DEFAULT",
                            "details": "Indulge in the rich taste and superior crunch of Maharaja's Premium Sanora Almonds. Sourced from the finest orchards, these almonds are carefully sorted to ensure only the highest quality kernels reach you. Perfect as a daily morning ritual, a quick energy-boosting snack, or an addition to your favorite recipes.\n📦 Premium Extra Bold Size\n💰 Best Price and Quality Guaranteed\n👉 Order Online for Fast Delivery\n✔ 100% natural, raw, and preservative-free\n✔ Rich in plant-based protein, dietary fiber, and healthy monounsaturated fats\n✔ Excellent source of Vitamin E, magnesium, and essential antioxidants\n✔ Helps support heart health, brain function, and skin glow\nEnjoy the premium crunch of fresh almonds every day to boost your health and vitality."
                        }
                    },
                    "prod-1783856830710": {
                        "name": "100% Natural Kashmiri Mamra Badam – Premium Single-Tree Almonds",
                        "shortTitle": "Kasmiri Badam",
                        "hindiName": "कश्मीरी बादाम",
                        "shortDescription": "Authentic Kashmiri almonds known for their rich oil content, sweet taste, and high nutritional value.",
                        "category": "Almonds",
                        "keywords": ["mamra", "kashmiri badam", "mamra giri", "kashmiri mamra", "single tree badam", "oil rich badam"],
                        "tags": ["Kashmiri Special", "Organic Choice", "Superfood"],
                        "groups": ["Students", "Gym", "Elderly"],
                        "longDescription": {
                            "nutritionKey": "ALMONDS",
                            "storageKey": "DEFAULT",
                            "details": "Experience the pure goodness of authentic Kashmiri Badam. Unlike regular almonds, Kashmiri almonds are smaller in size but contain a significantly higher natural oil content, giving them a rich, sweet flavor and superior health benefits. Sourced directly from the valleys of Kashmir, these single-tree almonds are 100% natural.\n📦 100% Authentic Valley Sourced\n💰 Pure and Rich Natural Oils\n👉 Hand-picked Premium Selection\n✔ Small-sized but highly potent Mamra-grade kernels\n✔ Abundant in natural almond oil for brain development and heart health\n✔ No chemical treatment or artificial polish\n✔ Rich source of dietary fiber, iron, calcium, and vitamin E\nRegular consumption of Kashmiri Badam is highly recommended for children, seniors, and active individuals for sharp memory and strong immunity."
                        }
                    },
                    "prod-1783857199555": {
                        "name": "Premium Seedless Green Kismis – Juicy & Sweet Long Raisins",
                        "shortTitle": "Kismis",
                        "hindiName": "किशमिश",
                        "shortDescription": "Sweet, juicy, and premium seedless green raisins. A delicious natural source of iron, potassium, and instant energy.",
                        "category": "Raisins",
                        "keywords": ["kismis", "raisins", "green kismis", "seedless raisins", "kishmish", "sweet dry fruit"],
                        "tags": ["Juicy & Sweet", "Sun Dried", "Hygienically Packed"],
                        "groups": ["Daily", "Snacks", "Baking"],
                        "longDescription": {
                            "nutritionKey": "RAISINS",
                            "storageKey": "DEFAULT",
                            "details": "Treat yourself to the natural sweetness and chewiness of Maharaja's Premium Kismis. These seedless green raisins are naturally sun-dried to lock in their natural sweetness, vitamins, and minerals. They are soft, sweet, and juicy, making them a perfect healthy alternative to sugary sweets.\n📦 Extra long and seedless green grade\n💰 Premium Grade and Sweet Taste\n👉 Hand-sorted and Hygienically Packed\n✔ 100% natural, sweet, and free from artificial color or sulfur\n✔ Loaded with natural dietary fiber, aiding in digestion\n✔ Rich in iron, potassium, and natural antioxidants for blood health\n✔ Ideal for snacking, baking, oatmeal, or traditional Indian desserts\nIncorporate these premium raisins into your daily diet for a natural energy boost and healthy digestion."
                        }
                    },
                    "prod-1783857358162": {
                        "name": "Premium Roasted & Lightly Salted Pista – Jumbo Crunchy Pistachios",
                        "shortTitle": "Pista",
                        "hindiName": "पिस्ता",
                        "shortDescription": "Premium roasted and lightly salted pistachios in shells. A crunchy, protein-rich, and healthy snack.",
                        "category": "Pistachios",
                        "keywords": ["pista", "pistachios", "salted pista", "roasted pistachios", "jumbo pista", "crunchy pista"],
                        "tags": ["Perfectly Roasted", "Lightly Salted", "High Protein"],
                        "groups": ["Gym", "Snacks", "Travel"],
                        "longDescription": {
                            "nutritionKey": "PISTACHIOS",
                            "storageKey": "DEFAULT",
                            "details": "Enjoy the crunch and rich, buttery flavor of Maharaja's Premium Roasted & Salted Pistachios. These pistachios are lightly salted and roasted to perfection, highlighting their natural flavor while maintaining a delightful crunch. Encased in easy-to-open shells, they make a fun and highly nutritious snack.\n📦 Premium Jumbo Size Shells\n💰 Perfectly Roasted and Lightly Salted\n👉 Premium Dry Fruit Snack\n✔ Lightly dry-roasted to preserve natural nutritional value\n✔ Rich in protein, dietary fiber, and healthy unsaturated fats\n✔ Excellent source of Vitamin B6, potassium, and antioxidants\n✔ Supports weight management, heart health, and muscle recovery\nPistachios are the perfect guilt-free snack for office, travel, or parties. Crack open a shell and savor the premium taste!"
                        }
                    },
                    "prod-1784045962433": {
                        "name": "Premium Cashew Nuts W320 – Rich, Buttery & Crisp Kaju",
                        "shortTitle": "Cashew W320",
                        "hindiName": "काजू",
                        "shortDescription": "Jumbo-sized, premium grade W320 white whole cashews. Creamy, crispy, and packed with energy and healthy fats.",
                        "category": "Cashew",
                        "keywords": ["cashew", "kaju", "w320 cashew", "whole cashew", "white kaju", "creamy kaju"],
                        "tags": ["Jumbo Size", "Grade W320", "White Wholes"],
                        "groups": ["Daily", "Cooking", "Festive"],
                        "longDescription": {
                            "nutritionKey": "CASHEWS",
                            "storageKey": "DEFAULT",
                            "details": "Discover the rich, buttery flavor of Maharaja's Premium Cashew Nuts W320. Sourced from the finest farms, our W320 grade cashews are whole, large, and naturally creamy. Perfect for cooking, garnishing desserts, or snacking directly from the pack to boost your daily nutrition.\n📦 Grade W320 Jumbo Size\n💰 Crispy and Creamy Whole Nuts\n👉 Quality Sorted and Hygienically Packed\n✔ 100% natural white wholes, raw and unsalted\n✔ Rich in plant-based protein, magnesium, and copper\n✔ Good source of heart-healthy monounsaturated fatty acids\n✔ Ideal for vegan milk, gravies, baking, and healthy daily snacking\nAdd a handful of premium cashews to your diet for instant energy and a delicious crunch."
                        }
                    },
                    "prod-1784046100587": {
                        "name": "Premium Phool Makhana – Organic Fox Nuts (Lotus Seeds)",
                        "shortTitle": "Phool Makhana",
                        "hindiName": "मखाना",
                        "shortDescription": "Handpicked, organic puffed lotus seeds (makhana). A low-calorie, gluten-free superfood snack rich in calcium and protein.",
                        "category": "Makhana",
                        "keywords": ["makhana", "fox nuts", "lotus seeds", "phool makhana", "roasted makhana", "diet snack"],
                        "tags": ["Organic Superfood", "Gluten Free", "Low Calorie"],
                        "groups": ["Gym", "Weight Loss", "Fasting"],
                        "longDescription": {
                            "nutritionKey": "MIXED",
                            "storageKey": "DEFAULT",
                            "details": "Enjoy the light, crunchy, and highly nutritious Maharaja's Premium Phool Makhana. Also known as Fox Nuts or Lotus Seeds, our makhana is sourced from traditional wetland farms, hand-cleaned, and dried to perfection. A perfect guilt-free snack that is low in calories but exceptionally high in health benefits.\n📦 Handpicked Extra Bold Size\n💰 Organic and Natural Superfood\n👉 Low-Calorie Crispy Snacking\n✔ 100% natural, gluten-free, and rich in calcium\n✔ High in protein and fiber to support muscle strength and digestion\n✔ Low glycemic index, making it ideal for blood sugar management\n✔ Roast with a pinch of salt or ghee for a delicious healthy snack\nMake Phool Makhana your go-to snacking partner for weight management and daily wellness."
                        }
                    },
                    "prod-1784046285252": {
                        "name": "Kashmiri Akhrot Giri – Premium Half-Kernel Walnut Wholes",
                        "shortTitle": "Akhrot Giri",
                        "hindiName": "अखरोट",
                        "shortDescription": "Premium light-colored Kashmiri walnut halves. Fresh, crunchy, and exceptionally rich in Omega-3 fatty acids for brain health.",
                        "category": "Walnuts",
                        "keywords": ["akhrot", "walnuts", "akhrot giri", "walnut kernels", "brain food", "kashmiri walnut"],
                        "tags": ["Kashmiri Grade", "Omega-3 Rich", "Premium Halves"],
                        "groups": ["Students", "Daily", "Elderly"],
                        "longDescription": {
                            "nutritionKey": "WALNUTS",
                            "storageKey": "REFRIGERATE",
                            "details": "Fuel your mind with Maharaja's Premium Kashmiri Akhrot Giri. Sourced directly from the orchards of Kashmir, these walnut kernels are raw, untreated, and sorted as light-colored halves. Packed with brain-boosting nutrients and natural oils, they are a wholesome addition to your daily routine.\n📦 Premium Light Halves (Kashmiri Grade)\n💰 Rich in Omega-3 and Heart-Healthy Oils\n👉 Direct from Kashmiri Orchards\n✔ 100% natural, chemical-free raw walnut kernels\n✔ Excellent source of alpha-linolenic acid (ALA) and Omega-3\n✔ Rich in antioxidants, vitamin E, and essential minerals\n✔ Supports brain development, memory power, and cardiovascular health\nEat 2-3 walnut halves daily to nourish your brain and protect your heart."
                        }
                    },
                    "prod-1784046366280": {
                        "name": "Premium Turkish Anjeer – Soft, Sweet & Juicy Dried Figs",
                        "shortTitle": "Anjeer",
                        "hindiName": "अंजीर",
                        "shortDescription": "Premium quality dried figs (anjeer). Sweet, soft, juicy, and naturally rich in dietary fiber, iron, and calcium.",
                        "category": "Anjeer",
                        "keywords": ["anjeer", "figs", "dried figs", "turkish anjeer", "soft figs", "sweet anjeer"],
                        "tags": ["Jumbo Size", "Naturally Sweet", "Rich in Iron"],
                        "groups": ["Daily", "Women Health", "Digestion"],
                        "longDescription": {
                            "nutritionKey": "FIGS",
                            "storageKey": "DEFAULT",
                            "details": "Savor the natural sweetness and soft texture of Maharaja's Premium Anjeer. These dried figs are hand-selected for their size, moisture level, and flavor profile. Natural, sun-dried, and free from added sugars, they are one of the healthiest traditional sweet treats available.\n📦 Selected Jumbo Size Dried Figs\n💰 Soft and Naturally Sweet\n👉 Rich Source of Fiber and Iron\n✔ 100% natural, preservative-free, and sun-dried\n✔ Exceptionally high in dietary fiber to promote digestive health\n✔ Good source of iron, calcium, and potassium for bone strength\n✔ Helps naturally boost energy levels and maintain healthy hemoglobin\nSoak 2-3 figs in water overnight for maximum health benefits and enhanced digestion."
                        }
                    }
                };
                for (const [docId, updateData] of Object.entries(productsUpdates)) {
                    await updateDoc(doc(db, "products", docId), updateData);
                }
                alert('All products successfully updated with SEO-optimized details!');
                loadProducts();
            } catch (error) {
                console.error("Error applying SEO updates:", error);
                alert('Failed to apply SEO updates: ' + error.message);
            } finally {
                applySeoBtn.disabled = false;
                applySeoBtn.innerHTML = '<i class="fas fa-magic"></i> Apply SEO Updates';
            }
        });
    }
});
