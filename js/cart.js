import cartService from './cart-service.js';
import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getProductImageUrl } from './image-helper.js';

document.addEventListener('DOMContentLoaded', function () {
    const cartList = document.querySelector('.cart-list');
    const subtotalDisplay = document.querySelector('.total-value');
    const summarySubtotal = document.querySelector('.summary-value');
    const buyAllButton = document.querySelector('.buy-all-btn');
    const checkoutSection = document.getElementById('checkoutSection');
    const cartSummaryBar = document.querySelector('.cart-summary-bar');
    const checkoutForm = document.getElementById('checkoutForm');
    const backToCartBtn = document.getElementById('backToCart');

    let checkoutItems = []; // Track items being purchased
    let appliedDiscount = 0; // Discount percentage
    const cartView = document.getElementById('cartView');

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
                <div class="cart-header-actions"></div>
            </div>
        `;

        if (items.length === 0) {
            cartList.innerHTML = headerHtml + `
                <div style="padding: 60px 20px; text-align: center;">
                    <i class="fa-solid fa-cart-shopping" style="font-size: 64px; color: #f0f0f0; margin-bottom: 20px; display: block;"></i>
                    <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 10px; color: #1b1b1b;">Your cart is empty</h2>
                    <p style="color: #666; margin-bottom: 30px;">Add some delicious dry fruits to your cart and they will show up here.</p>
                    <a href="search.html" style="display: inline-block; padding: 14px 35px; text-decoration: none; background: var(--gradient-brand); color: white; border-radius: 50px; font-weight: 700; box-shadow: 0 10px 20px rgba(252, 110, 32, 0.2); transition: all 0.3s ease;">Shop Now</a>
                </div>
            `;
            if (buyAllButton) buyAllButton.disabled = true;
            return;
        }

        if (buyAllButton) buyAllButton.disabled = false;

        let itemsHtml = headerHtml;
        items.forEach(item => {
            const imageUrl = getProductImageUrl(item.id, item.images, 1);
            itemsHtml += `
            <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
                <!-- Desktop: Grid Layout -->
                <div class="cart-item-product" style="cursor: pointer;" onclick="window.location.href='product.html?id=${item.id}'">
                    <div class="cart-item-thumbnail" style="background-image: url('${imageUrl}')"></div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.shortTitle || item.name}</div>
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
                            ${['250g', '500g', '1kg', '2kg'].map(size => {
                const isSelected = item.size.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, ''));
                return `<option value="${size}" ${isSelected ? 'selected' : ''}>${size}</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div class="cart-item-price-row">
                        <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
                        <div class="unit-price">₹${item.price.toLocaleString('en-IN')} / ${item.size}</div>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <button class="buy-item-btn" onclick="buyItem('${item.id}', '${item.size}')">Buy</button>
                    <button class="remove-item" onclick="removeItem('${item.id}', '${item.size}')" title="Remove item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                
                <!-- Mobile: Custom Layout -->
                <div class="mobile-layout">
                    <!-- Mobile Row 1: Image > Name/Category > Price -->
                    <div class="mobile-row-1">
                        <div class="cart-item-product" style="cursor: pointer;" onclick="window.location.href='product.html?id=${item.id}'">
                            <div class="cart-item-thumbnail" style="background-image: url('${imageUrl}')"></div>
                            <div class="cart-item-details">
                                <div class="cart-item-name">${item.shortTitle || item.name}</div>
                                <div class="cart-item-category">${item.category || 'Dry Fruits'}</div>
                            </div>
                        </div>
                        <div class="cart-item-price-row">
                            <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
                            <div class="unit-price">₹${item.price.toLocaleString('en-IN')} / ${item.size}</div>
                        </div>
                    </div>
                    <!-- Mobile Row 2: Quantity > Size > Actions -->
                    <div class="mobile-row-2">
                        <div class="cart-item-quantity">
                            <button class="quantity-btn minus" onclick="updateQty('${item.id}', '${item.size}', -1)">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn plus" onclick="updateQty('${item.id}', '${item.size}', 1)">+</button>
                        </div>
                        <div class="cart-item-size">
                            <select class="size-select" onchange="changeSize('${item.id}', '${item.size}', this.value)">
                                ${['250g', '500g', '1kg', '2kg'].map(size => {
                    const isSelected = item.size.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, ''));
                    return `<option value="${size}" ${isSelected ? 'selected' : ''}>${size}</option>`;
                }).join('')}
                            </select>
                        </div>
                        <div class="cart-item-actions">
                            <button class="buy-item-btn" onclick="buyItem('${item.id}', '${item.size}')">Buy</button>
                            <button class="remove-item" onclick="removeItem('${item.id}', '${item.size}')" title="Remove item">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });

        // Add total row at the bottom
        const subtotal = cartService.getTotal();
        const totalSavings = items.reduce((total, item) => {
            const savingsPerUnit = (item.originalPrice || item.price) - item.price;
            return total + (savingsPerUnit * item.quantity);
        }, 0);

        itemsHtml += `
            <div class="cart-total">
                <div class="total-label">Subtotal</div>
                <div class="total-value">₹${subtotal.toLocaleString('en-IN')}</div>
            </div>
            ${totalSavings > 0 ? `
            <div class="cart-savings-total" style="display: flex; justify-content: space-between; padding: 10px 0; color: #27ae60; font-weight: 600; font-size: 16px;">
                <span>Total Savings</span>
                <span>- ₹${totalSavings.toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
        `;

        cartList.innerHTML = itemsHtml;
    }

    function updateTotals() {
        const items = cartService.getCart();
        const subtotal = cartService.getTotal();
        const totalSavings = items.reduce((total, item) => {
            const savingsPerUnit = (item.originalPrice || item.price) - item.price;
            return total + (savingsPerUnit * item.quantity);
        }, 0);

        if (subtotalDisplay) subtotalDisplay.textContent = '₹' + subtotal.toLocaleString('en-IN');
        if (summarySubtotal) summarySubtotal.textContent = '₹' + subtotal.toLocaleString('en-IN');
        
        const savingsDisplay = document.querySelector('.summary-savings');
        if (savingsDisplay) {
            if (totalSavings > 0) {
                savingsDisplay.style.display = 'flex';
                savingsDisplay.querySelector('.savings-value').textContent = '-₹' + totalSavings.toLocaleString('en-IN');
            } else {
                savingsDisplay.style.display = 'none';
            }
        }
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

    window.buyItem = (id, size) => {
        const item = cartService.getCart().find(i => i.id === id && i.size === size);
        if (item) {
            checkoutItems = [item];
            showCheckout();
        }
    };

    function showCheckout() {
        if (!cartView || !checkoutSection) return;

        // Push state for back button handling
        history.pushState({ view: 'shipping' }, 'Shipping Details', '#shipping');

        // Toggle Views with Animation
        cartView.classList.replace('view-active', 'view-hidden');
        checkoutSection.style.display = 'block';
        setTimeout(() => {
            checkoutSection.classList.add('view-active');
            checkoutSection.classList.remove('view-hidden');
        }, 10);
        
        cartSummaryBar.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Update Breadcrumb
        document.querySelectorAll('.checkout-only').forEach(el => el.style.display = 'inline');
        document.getElementById('breadcrumbCart').classList.remove('current');

        appliedDiscount = 0; // Reset discount on new checkout
        renderCheckoutSummary();
        autofillProfile();
        initPaymentSelection();
        initCouponLogic();
    }

    window.hideCheckout = () => {
        if (!cartView || !checkoutSection) return;

        // Toggle Views with Animation
        checkoutSection.classList.replace('view-active', 'view-hidden');
        cartView.classList.add('view-active');
        cartView.classList.remove('view-hidden');
        
        setTimeout(() => {
            checkoutSection.style.display = 'none';
        }, 500);

        cartSummaryBar.classList.remove('hidden');
        
        // Update Breadcrumb
        document.querySelectorAll('.checkout-only').forEach(el => el.style.display = 'none');
        document.getElementById('breadcrumbCart').classList.add('current');
    };

    // Handle Browser Back Button
    window.onpopstate = function(event) {
        if (checkoutSection && checkoutSection.style.display === 'block') {
            hideCheckout();
        }
    };

    window.handleBreadcrumbCart = () => {
        if (checkoutSection && checkoutSection.style.display === 'block') {
            history.back(); // Use history back to handle both breadcrumb and browser button
        }
    };

    function renderCheckoutSummary() {
        const listContainer = document.getElementById('checkoutItemsList');
        const itemCountBadge = document.querySelector('.item-count-badge');
        if (!listContainer) return;

        itemCountBadge.textContent = `${checkoutItems.length} Item${checkoutItems.length !== 1 ? 's' : ''}`;

        listContainer.innerHTML = checkoutItems.map(item => `
            <div class="checkout-mini-item">
                <div class="mini-item-thumb" style="background-image: url('${getProductImageUrl(item.id, item.images, 1)}')">
                    <div class="mini-qty-badge">${item.quantity}</div>
                </div>
                <div class="mini-item-info">
                    <div class="mini-item-name">${item.shortTitle || item.name}</div>
                    <div class="mini-item-meta">${item.size}</div>
                </div>
                <div class="mini-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
            </div>
        `).join('');

        updateCheckoutTotals();
    }

    function initCouponLogic() {
        const applyBtn = document.getElementById('applyCouponBtn');
        const couponInput = document.getElementById('couponCode');
        const messageDiv = document.getElementById('couponMessage');

        if (!applyBtn) return;

        applyBtn.onclick = () => {
            const code = couponInput.value.trim().toUpperCase();
            messageDiv.className = 'coupon-message';
            
            if (!code) {
                messageDiv.textContent = 'Please enter a code';
                messageDiv.classList.add('error');
                return;
            }

            // Simple demo coupon logic
            const coupons = {
                'MAHARAJA10': 10,
                'WELCOME20': 20,
                'FESTIVE15': 15,
                'FREESHIP': 0 // Just example
            };

            if (coupons.hasOwnProperty(code)) {
                appliedDiscount = coupons[code];
                messageDiv.textContent = `Coupon applied! ${appliedDiscount}% discount added.`;
                messageDiv.classList.add('success');
                updateCheckoutTotals();
            } else {
                appliedDiscount = 0;
                messageDiv.textContent = 'Invalid coupon code';
                messageDiv.classList.add('error');
                updateCheckoutTotals();
            }
        };
    }

    function updateCheckoutTotals() {
        const subtotal = checkoutItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const discountAmount = Math.floor(subtotal * (appliedDiscount / 100));
        const grandTotal = subtotal - discountAmount;

        document.getElementById('checkoutSubtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        
        const discountRow = document.getElementById('discountRow');
        const discountDisplay = document.getElementById('checkoutDiscount');
        if (appliedDiscount > 0) {
            discountRow.classList.remove('hidden');
            discountDisplay.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
        } else {
            discountRow.classList.add('hidden');
        }

        document.getElementById('checkoutGrandTotal').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
    }

    function initPaymentSelection() {
        const options = document.querySelectorAll('.payment-option');
        const submitBtn = document.querySelector('.place-order-btn');
        
        options.forEach(option => {
            option.onclick = () => {
                options.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Update button text
                if (radio.value === 'online') {
                    submitBtn.textContent = 'Pay & Place Order';
                } else {
                    submitBtn.textContent = 'Place Order';
                }
            };
        });
    }

    // Checkout Flow Logic
    if (buyAllButton) {
        buyAllButton.addEventListener('click', function () {
            checkoutItems = cartService.getCart();
            showCheckout();
        });
    }

    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', function () {
            history.back();
        });
    }

    async function autofillProfile() {
        const user = auth.currentUser;
        if (!user) return;

        const addressWrapper = document.getElementById('savedAddressesWrapper');
        const addressBubbles = document.getElementById('addressBubbles');

        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // 1. Basic Profile Autofill
                const form = checkoutForm;
                if (form['name']) form['name'].value = `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || '';
                if (form['email']) form['email'].value = data.email || user.email || '';
                if (form['phone']) form['phone'].value = data.phone || '';

                // 2. Saved Addresses Handling
                const savedAddresses = data.addresses || [];
                if (savedAddresses.length > 0 && addressWrapper && addressBubbles) {
                    addressWrapper.style.display = 'block';
                    addressBubbles.innerHTML = savedAddresses.map((addr, index) => {
                        let icon = 'fa-map-marker-alt';
                        const typeLabel = (addr.type || '').toLowerCase();
                        if (typeLabel.includes('home')) icon = 'fa-home';
                        else if (typeLabel.includes('office') || typeLabel.includes('work')) icon = 'fa-briefcase';
                        else if (typeLabel.includes('gym')) icon = 'fa-dumbbell';
                        else if (typeLabel.includes('other')) icon = 'fa-tag';

                        return `
                            <div class="address-bubble" onclick="applySavedAddress(${index})">
                                <i class="fas ${icon}"></i> ${addr.type || 'Address ' + (index + 1)}
                            </div>
                        `;
                    }).join('');

                    // Make applySavedAddress available globally for the onclick handler
                    window.applySavedAddress = (index) => {
                        const addr = savedAddresses[index];
                        if (addr) {
                            if (form['name']) form['name'].value = addr.name || form['name'].value;
                            if (form['phone']) form['phone'].value = addr.phone || form['phone'].value;
                            if (form['address']) form['address'].value = addr.address || '';
                            if (form['city']) form['city'].value = addr.city || '';
                            if (form['state']) form['state'].value = addr.state || '';
                            if (form['pin']) form['pin'].value = addr.pin || '';

                            // Highlight selected bubble
                            document.querySelectorAll('.address-bubble').forEach((b, i) => {
                                b.classList.toggle('selected', i === index);
                            });
                        }
                    };
                } else if (addressWrapper) {
                    addressWrapper.style.display = 'none';
                }
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
            const paymentMethod = this.querySelector('input[name="payment-method"]:checked').value;

            try {
                // Collect shipping details first
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

                const subtotal = checkoutItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                const discountAmount = Math.floor(subtotal * (appliedDiscount / 100));
                const finalTotal = subtotal - discountAmount;

                if (paymentMethod === 'online') {
                    const options = {
                        "key": "rzp_test_SbrDHadYKj1cvw", // User provided key
                        "amount": finalTotal * 100, // Amount in paise
                        "currency": "INR",
                        "name": "Maharaja Dry Fruits",
                        "description": appliedDiscount > 0 ? `Order with ${appliedDiscount}% Discount` : "Order for Dry Fruits",
                        "image": "assets/MAHARAJA logo.png",
                        "handler": async function (response) {
                            submitBtn.disabled = true;
                            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

                            try {
                                const paymentData = {
                                    paymentId: response.razorpay_payment_id,
                                    method: 'Online (Razorpay)',
                                    status: 'Paid',
                                    subtotal: subtotal,
                                    discount: discountAmount,
                                    total: finalTotal
                                };

                                const orderId = await cartService.placeOrder(shippingDetails, checkoutItems, paymentData);
                                if (orderId) {
                                    window.location.href = `orders.html?success=true&orderId=${orderId}`;
                                }
                            } catch (err) {
                                console.error("Order completion failed:", err);
                                alert("Payment successful but order placement failed. Please contact support.");
                            }
                        },
                        "prefill": {
                            "name": shippingDetails.name,
                            "email": shippingDetails.email,
                            "contact": shippingDetails.phone
                        },
                        "theme": {
                            "color": "#fc6e20"
                        },
                        "modal": {
                            "ondismiss": function() {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = originalText;
                            }
                        }
                    };
                    const rzp = new Razorpay(options);
                    rzp.open();
                } else {
                    // Cash on Delivery flow
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

                    const paymentData = {
                        method: 'Cash on Delivery',
                        status: 'Pending',
                        subtotal: subtotal,
                        discount: discountAmount,
                        total: finalTotal
                    };

                    const orderId = await cartService.placeOrder(shippingDetails, checkoutItems, paymentData);
                    if (orderId) {
                        window.location.href = `orders.html?success=true&orderId=${orderId}`;
                    }
                }
            } catch (error) {
                console.error("Checkout process failed:", error);
                alert("Something went wrong. Please try again.");
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
                <div class="cart-header-actions"></div>
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
                    <div class="cart-item-quantity" style="display: flex; gap: 5px; align-items: center; justify-content: center;">
                        <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
                        <div class="skeleton skeleton-text" style="width: 20px; margin-bottom: 0;"></div>
                        <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
                    </div>
                    <div class="cart-item-size">
                        <div class="skeleton skeleton-text" style="width: 60px; height: 32px; border-radius: 8px;"></div>
                    </div>
                </div>
                <div class="cart-item-price">
                    <div class="skeleton skeleton-text" style="width: 50%; margin-left: auto; margin-right: auto;"></div>
                    <div class="skeleton skeleton-title" style="width: 70%; margin-left: auto; margin-right: auto;"></div>
                </div>
                <div class="cart-item-actions">
                    <div class="skeleton" style="width: 50px; height: 28px; border-radius: 20px; display: inline-block;"></div>
                    <div class="skeleton skeleton-circle" style="width: 32px; height: 32px; display: inline-block; margin-left: 8px;"></div>
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
