import cartService from './cart-service.js';
import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const cartList = document.querySelector('.cart-list');
    const subtotalDisplay = document.querySelector('.total-value');
    const summarySubtotal = document.querySelector('.summary-value');
    const buyAllButton = document.querySelector('.buy-all-btn');
    const checkoutSection = document.getElementById('checkoutSection');
    const cartSummaryBar = document.querySelector('.cart-summary-bar');
    const checkoutForm = document.getElementById('checkoutForm');
    const backToCartBtn = document.getElementById('backToCart');

    cartService.addListener((cartItems, isLoaded) => {
        if (!isLoaded) {
            showCartSkeletons();
        } else {
            renderCart(cartItems);
            updateTotals();
        }
    });

    function renderCart(items) {
        if (!cartList) return;

        // Keep the headers
        const headerHtml = `
            <div class="cart-headers">
                <div class="cart-header-product">Product</div>
                <div class="cart-header-quantity">Quantity</div>
                <div class="cart-header-size">Size</div>
                <div class="cart-header-price">Price</div>
            </div>
        `;

        if (items.length === 0) {
            cartList.innerHTML = headerHtml + '<div style="padding: 40px; text-align: center;">Your cart is empty</div>';
            if (buyAllButton) buyAllButton.disabled = true;
            return;
        }

        if (buyAllButton) buyAllButton.disabled = false;

        let itemsHtml = headerHtml;
        items.forEach(item => {
            const imageUrl = (item.images && item.images['1']) ? item.images['1'] : 'assets/placeholder.png';
            itemsHtml += `
            <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
                <div class="cart-item-product">
                    <div class="cart-item-thumbnail" style="background-image: url('${imageUrl}')"></div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-category">${item.category || 'Dry Fruits'}</div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" onclick="updateQty('${item.id}', '${item.size}', -1)">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn plus" onclick="updateQty('${item.id}', '${item.size}', 1)">+</button>
                    </div>
                    <div class="cart-item-size">
                        <select class="size-select" onchange="changeSize('${item.id}', '${item.size}', this.value)">
                            ${['250g', '500g', '1kg'].map(size => {
                const isSelected = item.size.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, ''));
                return `<option value="${size}" ${isSelected ? 'selected' : ''}>${size}</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div class="cart-item-price">
                        <div class="unit-price" style="font-size: 0.8em; color: #666;">₹${item.price.toLocaleString('en-IN')} / ${item.size}</div>
                        ₹${(item.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                    <div class="cart-item-remove">
                        <button class="remove-item" onclick="removeItem('${item.id}', '${item.size}')" title="Remove item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        });

        // Add total row at the bottom
        const subtotal = cartService.getTotal();
        itemsHtml += `
            <div class="cart-total">
                <div class="total-label">Total</div>
                <div class="total-value">₹${subtotal.toLocaleString('en-IN')}</div>
            </div>
        `;

        cartList.innerHTML = itemsHtml;
    }

    function updateTotals() {
        const subtotal = cartService.getTotal();
        if (subtotalDisplay) subtotalDisplay.textContent = '₹' + subtotal.toLocaleString('en-IN');
        if (summarySubtotal) summarySubtotal.textContent = '₹' + subtotal.toLocaleString('en-IN');
    }

    window.updateQty = (id, size, delta) => {
        const item = cartService.getCart().find(i => i.id === id && i.size === size);
        if (item) {
            const newQty = Math.max(1, item.quantity + delta);
            cartService.updateQuantity(id, size, newQty);
        }
    };

    window.removeItem = (id, size) => {
        cartService.removeFromCart(id, size);
    };

    window.changeSize = (id, oldSize, newSize) => {
        cartService.updateSize(id, oldSize, newSize);
    };

    // Checkout Flow Logic
    if (buyAllButton) {
        buyAllButton.addEventListener('click', async function () {
            // Show checkout section
            cartList.style.display = 'none';
            cartSummaryBar.classList.add('hidden');
            checkoutSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Autofill profile data
            autofillProfile();
        });
    }

    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', function () {
            cartList.style.display = 'block';
            cartSummaryBar.classList.remove('hidden');
            checkoutSection.style.display = 'none';
        });
    }

    async function autofillProfile() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Map Firestore fields to form inputs
                const form = checkoutForm;
                if (form['name']) form['name'].value = `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || '';
                if (form['email']) form['email'].value = data.email || user.email || '';
                if (form['phone']) form['phone'].value = data.phone || '';
                if (form['address']) form['address'].value = data.address || '';
                if (form['city']) form['city'].value = data.city || '';
                if (form['state']) form['state'].value = data.state || '';
                if (form['pin']) form['pin'].value = data.pin || '';
            }
        } catch (error) {
            console.error("Error autofilling profile:", error);
        }
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

                // Collect shipping details
                const formData = new FormData(this);
                const shippingDetails = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    address: formData.get('address'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    pin: formData.get('pin')
                };

                const orderId = await cartService.placeOrder(shippingDetails);
                if (orderId) {
                    window.location.href = `orders.html?success=true&orderId=${orderId}`;
                }
            } catch (error) {
                console.error("Order placement failed:", error);
                alert("Failed to place order. Please try again.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    function showCartSkeletons() {
        if (!cartList) return;

        const headerHtml = `
            <div class="cart-headers">
                <div class="cart-header-product">Product</div>
                <div class="cart-header-quantity">Quantity</div>
                <div class="cart-header-size">Size</div>
                <div class="cart-header-price">Price</div>
            </div>
        `;

        let skeletonsHtml = headerHtml;
        for (let i = 0; i < 2; i++) {
            skeletonsHtml += `
            <div class="cart-item">
                <div class="cart-item-product">
                    <div class="cart-item-thumbnail skeleton"></div>
                    <div class="cart-item-details">
                        <div class="skeleton skeleton-title" style="width: 70%"></div>
                        <div class="skeleton skeleton-text" style="width: 40%"></div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-quantity" style="display: flex; gap: 5px; align-items: center;">
                        <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
                        <div class="skeleton skeleton-text" style="width: 20px; margin-bottom: 0;"></div>
                        <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
                    </div>
                    <div class="cart-item-size">
                        <div class="skeleton skeleton-text" style="width: 60px; height: 32px; border-radius: 8px;"></div>
                    </div>
                    <div class="cart-item-price">
                        <div class="skeleton skeleton-text" style="width: 50%; margin-left: auto;"></div>
                        <div class="skeleton skeleton-title" style="width: 70%; margin-left: auto;"></div>
                    </div>
                    <div class="cart-item-remove">
                        <div class="skeleton skeleton-circle" style="width: 32px; height: 32px; margin-left: auto;"></div>
                    </div>
                </div>
            </div>
            `;
        }

        // Dummy total row
        skeletonsHtml += `
            <div class="cart-total">
                <div class="total-label">Total</div>
                <div class="skeleton skeleton-title" style="width: 100px; margin-bottom: 0;"></div>
            </div>
        `;

        cartList.innerHTML = skeletonsHtml;
    }
});
