import wishlistService from './wishlist-service.js';
import cartService from './cart-service.js';
import router from './router.js';
import { getProductImageUrl } from './image-helper.js';

function renderStarsHTML(rating) {
    let html = '';
    const fullStars = Math.floor(rating);
    const hasHalf = (rating - fullStars) >= 0.3 && (rating - fullStars) <= 0.8;
    const extraFull = (rating - fullStars) > 0.8 ? 1 : 0;
    
    const finalFullStars = fullStars + extraFull;
    for (let i = 1; i <= 5; i++) {
        if (i <= finalFullStars) {
            html += '<i class="fas fa-star"></i>';
        } else if (i === finalFullStars + 1 && hasHalf) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    return html;
}

export function createProductCard(product) {
    // Generate SEO-friendly URL using router
    const seoUrl = router.generateProductUrl(product.name, product.id);
    
    // Determine badge (New, Best Seller, or Discount)
    let badgeHtml = '';
    const originalPrice = product.originalPrice || 0;
    const sellingPrice = product.price || 0;
    
    if (product.isNew) {
        badgeHtml = '<span class="card-badge">New</span>';
    } else if (originalPrice > sellingPrice) {
        const discountPercent = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
        if (discountPercent >= 30) {
            badgeHtml = `<span class="card-badge red"><i class="fa-solid fa-fire"></i> HOT DEAL</span>`;
        } else {
            badgeHtml = `<span class="card-badge green"><i class="fa-solid fa-percent" style="font-size: 0.9em; margin-right: 4px;"></i>${discountPercent}% OFF</span>`;
        }
    } else if (product.discount) {
        badgeHtml = `<span class="card-badge green"><i class="fa-solid fa-percent" style="font-size: 0.9em; margin-right: 4px;"></i>-${product.discount}%</span>`;
    } else if (product.category) {
        badgeHtml = `<span class="card-badge" style="background: #e0e0e0; color: #1b1b1b;">${product.category}</span>`;
    }

    // Image handling - Use new image helper with fallback
    const imageUrl = getProductImageUrl(product.id, product.images, 1);

    // Size Options
    const sizes = product.quantities_available || ['250g', '500g', '1kg'];
    const defaultSize = sizes[0] || 'Select';

    // Generate Custom Options HTML
    const customOptionsHtml = sizes.map(size =>
        `<div class="custom-option" data-value="${size}" onclick="selectCardOption(this, '${size}', event)">${size}</div>`
    ).join('');

    const isWishlisted = wishlistService.isInWishlist(product.id);

    // Get current quantity in cart for the default size
    const cartItems = cartService.getCart();
    const existingItem = cartItems.find(item => item.id === product.id && item.size === cartService.normalizeSize(defaultSize));
    const currentQty = existingItem ? existingItem.quantity : 0;

    // Generate Savings Pill or Premium Badge
    let savingsPillHtml = '';
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    if (hasDiscount) {
        savingsPillHtml = `<div class="card-savings-pill" onclick="navigateToProduct('${product.name}', '${product.id}')"><i class="fa-solid fa-ticket"></i>Save <span class="savings-amount">₹${(product.originalPrice - product.price).toLocaleString('en-IN')}</span></div>`;
    } else {
        let label = 'Fresh Stock';
        let iconClass = 'fa-leaf';
        
        // Since isPremium is true on all products in Firestore, we filter based on price thresholds and premium keywords
        const lowerName = (product.name || '').toLowerCase();
        const lowerShort = (product.shortTitle || '').toLowerCase();
        const isActuallyPremium = (product.price >= 300 && (lowerName.includes('premium') || lowerName.includes('kashmiri') || lowerName.includes('snow white') || lowerShort.includes('premium') || lowerShort.includes('kashmiri'))) || product.price > 400;
        
        if (isActuallyPremium) {
            label = 'Premium Choice';
            iconClass = 'fa-crown';
        } else if (product.category === 'Walnuts' || product.category === 'Almonds' || product.category === 'Pistachios' || product.category === 'Cashews') {
            label = 'Handpicked';
            iconClass = 'fa-star';
        } else {
            label = 'Best Value';
            iconClass = 'fa-award';
        }
        savingsPillHtml = `<div class="card-savings-pill gold-pill" onclick="navigateToProduct('${product.name}', '${product.id}')"><i class="fa-solid ${iconClass}"></i>${label}</div>`;
    }

    // Generate star rating HTML if the product has ratings
    let ratingHtml = '';
    if (product.reviewCount && product.reviewCount > 0) {
        const avg = product.averageRating || 0;
        ratingHtml = `
            <div class="card-rating" onclick="navigateToProduct('${product.name}', '${product.id}')">
                <div class="card-stars">
                    ${renderStarsHTML(avg)}
                </div>
                <span class="card-rating-text">${avg.toFixed(1)} <span class="card-rating-count">(${product.reviewCount})</span></span>
            </div>
        `;
    }

    // Construct HTML
    const cardHtml = `
        <div class="product-card" id="product-card-${product.id}" data-id="${product.id}" data-base-price="${product.price}" data-original-price="${product.originalPrice || ''}">
            ${badgeHtml}
            <div class="card-wishlist ${isWishlisted ? 'active wishlisted-hidden' : ''} ${currentQty > 0 ? 'in-cart' : ''}" onclick="toggleWishlist('${product.id}', this, event)">
                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
            </div>
            <div class="card-image-container" onclick="navigateToProduct('${product.name}', '${product.id}')">
                <div class="card-image" style="background-image: url('${imageUrl}');"></div>
            </div>
            
            <div class="card-content">
                <div class="card-title" title="${product.name}" onclick="navigateToProduct('${product.name}', '${product.id}')">${product.shortTitle || product.name}</div>
                <div class="card-hindi-name" onclick="navigateToProduct('${product.name}', '${product.id}')">${product.hindiName || 'Premium Quality'}</div>
                ${ratingHtml}
                <div class="card-description">${product.shortDescription || 'Premium quality ' + product.category.toLowerCase() + ' with rich nutrients and great taste.'}</div>
                
                <div class="card-options">
                    <div class="custom-select-wrapper size-selector" onclick="toggleCardDropdown(this, event)">
                        <div class="custom-select-trigger">
                            <span data-selected="${defaultSize}">${defaultSize}</span>
                            <i class="fas fa-chevron-up arrow"></i>
                        </div>
                        <div class="custom-options">
                            ${customOptionsHtml}
                        </div>
                    </div>
                </div>

                <div class="card-price-container">
                    <div class="price-main">
                        ${hasDiscount ? `<span class="card-original-price">₹${product.originalPrice}</span>` : ''}
                        <div class="card-price">₹${product.price}</div>
                    </div>
                    ${savingsPillHtml}
                </div>
                
                <div class="card-footer">
                    <div class="card-action-container">
                        <button class="card-add-btn" style="display: ${currentQty > 0 ? 'none' : 'flex'}" onclick="handleAddToCart('${product.id}', this, event)">
                            <span>Add</span>
                            <i class="fa-solid fa-cart-shopping"></i>
                        </button>
                        
                        <div class="card-qty-selector" style="display: ${currentQty > 0 ? 'flex' : 'none'}">
                            <button class="qty-btn minus" onclick="decrementCardQty('${product.id}', this, event)">-</button>
                            <span class="qty-value">${currentQty}</span>
                            <button class="qty-btn plus" onclick="incrementCardQty('${product.id}', this, event)">+</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return cardHtml;
}

/**
 * Generate SEO-friendly product URL from product name and ID
 */
function generateSeoProductUrl(productName, productId) {
    // This function is kept for backward compatibility
    return router.generateProductUrl(productName, productId);
}

// Global navigation function for product cards
window.navigateToProduct = function(productName, productId) {
    const slug = router.createSlug(productName);
    
    // If we're on product page, just update the hash
    if (window.location.pathname.includes('product.html')) {
        router.navigateToProduct(slug, productId);
        // Reload the page with new hash to fetch new product
        window.location.reload();
    } else {
        // Navigate to product page with hash
        window.location.href = `product.html#/${slug}?id=${productId}`;
    }
};

/**
 * Minimal Product Card Renderer for Home Page
 * Shows only image and name.
 */
export function createMinimalProductCard(product, subtitle = "Top Rated") {
    const imageUrl = getProductImageUrl(product.id, product.images, 1);
    const seoUrl = router.generateProductUrl(product.name, product.id);

    return `
        <div class="minimal-product-card" onclick="navigateToProduct('${product.name}', '${product.id}')">
            <div class="minimal-card-image-container">
                <div class="minimal-card-image" style="background-image: url('${imageUrl}');"></div>
            </div>
            <div class="minimal-card-content">
                <div class="minimal-card-title">${product.shortTitle || product.name}</div>
                <div class="minimal-card-subtitle">${subtitle}</div>
            </div>
        </div>
    `;
}

// Global Custom Dropdown Functions
window.toggleCardDropdown = function (wrapper, event) {
    event.stopPropagation();
    document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
        if (el !== wrapper) el.classList.remove('open');
    });
    wrapper.classList.toggle('open');
};

window.selectCardOption = function (option, value, event) {
    event.stopPropagation();
    const wrapper = option.closest('.custom-select-wrapper');
    const triggerSpan = wrapper.querySelector('.custom-select-trigger span');
    triggerSpan.textContent = value;
    triggerSpan.dataset.selected = value;

    wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    wrapper.classList.remove('open');

    // Live Price Update Logic
    const card = option.closest('.product-card');
    if (card) {
        updateCardLivePrice(card);
        // Also update the quantity selector UI based on the new size
        updateCardQtyUI(card);
    }
};

/**
 * Updates the quantity selector UI visibility and value based on what's in the cart for the selected size
 */
function updateCardQtyUI(card) {
    if (!card) return;
    
    const productId = card.dataset.id;
    if (!productId) return;
    
    const sizeSelector = card.querySelector('.size-selector .custom-select-trigger span');
    if (!sizeSelector || !sizeSelector.dataset.selected) return;
    
    const size = sizeSelector.dataset.selected;
    const normalizedSize = cartService.normalizeSize(size);

    const cartItems = cartService.getCart();
    const item = cartItems.find(i => i.id === productId && i.size === normalizedSize);
    const qty = item ? item.quantity : 0;

    const addBtn = card.querySelector('.card-add-btn');
    const qtySelector = card.querySelector('.card-qty-selector');
    const qtyValue = card.querySelector('.qty-value');
    const wishlistBtn = card.querySelector('.card-wishlist');

    if (qty > 0) {
        if (addBtn) addBtn.style.display = 'none';
        if (qtySelector) qtySelector.style.display = 'flex';
        if (qtyValue) qtyValue.textContent = qty;
        if (wishlistBtn) wishlistBtn.classList.add('in-cart');
    } else {
        if (addBtn) addBtn.style.display = 'flex';
        if (qtySelector) qtySelector.style.display = 'none';
        if (wishlistBtn) wishlistBtn.classList.remove('in-cart');
    }
}

/**
 * Updates the price displayed on the card based on selected size and current quantity (if in cart or default to 1)
 */
function updateCardLivePrice(card) {
    if (!card) return;
    
    const basePrice = card.dataset.basePrice;
    if (!basePrice) return;
    
    const sizeSelector = card.querySelector('.size-selector .custom-select-trigger span');
    if (!sizeSelector || !sizeSelector.dataset.selected) return;
    
    const size = sizeSelector.dataset.selected;
    const basePriceNum = parseFloat(basePrice);

    // Get quantity from UI or default to 1 for price preview
    const qtySelector = card.querySelector('.card-qty-selector');
    let qty = 1;
    if (qtySelector && qtySelector.style.display !== 'none') {
        const qtyValue = card.querySelector('.qty-value');
        if (qtyValue) {
            qty = parseInt(qtyValue.textContent) || 1;
        }
    }

    const unitPrice = cartService.getPriceForSize(basePriceNum, size);
    const totalPrice = unitPrice * qty;

    const priceDisplay = card.querySelector('.card-price');
    if (priceDisplay) {
        priceDisplay.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;
    }

    // Update Original Price and Savings Pill if they exist
    const originalPrice = card.dataset.originalPrice;
    if (originalPrice) {
        const originalPriceNum = parseFloat(originalPrice);
        const scaledOriginal = cartService.getPriceForSize(originalPriceNum, size);
        const totalOriginal = scaledOriginal * qty;
        
        const originalDisplay = card.querySelector('.card-original-price');
        if (originalDisplay) {
            originalDisplay.textContent = `₹${totalOriginal.toLocaleString('en-IN')}`;
        }

        const savingsPill = card.querySelector('.card-savings-pill');
        if (savingsPill && !savingsPill.classList.contains('gold-pill')) {
            const savings = totalOriginal - totalPrice;
            if (savings > 0) {
                savingsPill.innerHTML = `<i class="fa-solid fa-ticket"></i>Save <span class="savings-amount">₹${Math.round(savings).toLocaleString('en-IN')}</span>`;
            }
        }
    }
}

window.addEventListener('click', function () {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
        el.classList.remove('open');
    });
});

window.toggleWishlist = async function (productId, element, event) {
    if (event) event.stopPropagation();
    const added = await wishlistService.toggleWishlist(productId);
    element.classList.toggle('active', added);
    const heartIcon = element.querySelector('i');
    if (heartIcon) {
        heartIcon.className = added ? 'fas fa-heart' : 'far fa-heart';
    }
    
    if (added) {
        // Wait for the heartbeat animation (0.35s) to complete before hiding
        setTimeout(() => {
            element.classList.add('wishlisted-hidden');
        }, 400);
    } else {
        element.classList.remove('wishlisted-hidden');
    }
};

window.handleAddToCart = async function (productId, btnElement, event) {
    if (event) event.stopPropagation();

    const card = btnElement.closest('.product-card');
    const size = card.querySelector('.size-selector .custom-select-trigger span').dataset.selected;
    const basePrice = parseFloat(card.dataset.basePrice);
    const productName = card.querySelector('.card-title').textContent;
    
    // Robust background image URL extraction
    const bgImg = card.querySelector('.card-image').style.backgroundImage;
    const productImage = bgImg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');

    // Trigger the beautiful fly-to-cart animation
    flyToCartAnimation(card, productImage);

    await cartService.addToCart({
        id: productId,
        name: productName,
        basePrice: basePrice,
        price: basePrice,
        images: { '1': productImage }
    }, 1, size);

    // UI will be updated via existing listeners if the core logic is reactive, 
    // but for immediate feedback on the card:
    updateCardQtyUI(card);
    updateCardLivePrice(card);
};

/**
 * Renders a floating clone of the product image flying to the active cart icon in a smooth parabolic-like arc.
 */
export function flyToCartAnimation(card, productImage) {
    if (!productImage) return;

    // Find the source image element
    const sourceImgEl = card.querySelector('.card-image');
    if (!sourceImgEl) return;

    // Find the target cart element (desktop or mobile)
    let targetCart = document.querySelector('.header-icons a[data-section="cart"]');
    if (window.innerWidth <= 768) {
        const mobileNavCart = document.querySelector('.mobile-nav-icons a[data-section="cart"]');
        if (mobileNavCart && window.getComputedStyle(mobileNavCart.parentElement).display !== 'none') {
            targetCart = mobileNavCart;
        }
    }
    if (!targetCart) return;

    // Get positions
    const imgRect = sourceImgEl.getBoundingClientRect();
    const cartRect = targetCart.getBoundingClientRect();

    // Create flyer element
    const flyer = document.createElement('div');
    flyer.className = 'cart-flyer';
    flyer.style.backgroundImage = `url('${productImage}')`;
    flyer.style.left = `${imgRect.left}px`;
    flyer.style.top = `${imgRect.top}px`;
    flyer.style.width = `${imgRect.width}px`;
    flyer.style.height = `${imgRect.height}px`;

    document.body.appendChild(flyer);

    // Force reflow
    flyer.offsetWidth;

    // Calculate translation target (middle-to-middle alignment)
    const targetX = cartRect.left + (cartRect.width / 2) - (imgRect.width / 2);
    const targetY = cartRect.top + (cartRect.height / 2) - (imgRect.height / 2);

    // Apply styles to trigger CSS transition
    flyer.style.transform = `translate(${targetX - imgRect.left}px, ${targetY - imgRect.top}px) scale(0.08) rotate(360deg)`;
    flyer.style.opacity = '0.2';
    flyer.style.borderRadius = '50%';

    // Remove flyer after transition completion
    flyer.addEventListener('transitionend', () => {
        flyer.remove();
        
        // Add bounce animation class to all visible cart count badges
        const badges = document.querySelectorAll('.cart-count');
        badges.forEach(badge => {
            badge.classList.remove('cart-count-bounce');
            badge.offsetWidth; // Force layout reflow to restart animation
            badge.classList.add('cart-count-bounce');
            
            // Clean up class after animation finishes
            setTimeout(() => {
                badge.classList.remove('cart-count-bounce');
            }, 600);
        });
    });
}

window.incrementCardQty = async function (productId, btnElement, event) {
    if (event) event.stopPropagation();
    const card = btnElement.closest('.product-card');
    const size = card.querySelector('.size-selector .custom-select-trigger span').dataset.selected;
    const normalizedSize = cartService.normalizeSize(size);

    const cartItems = cartService.getCart();
    const item = cartItems.find(i => i.id === productId && i.size === normalizedSize);

    if (item) {
        await cartService.updateQuantity(productId, size, item.quantity + 1);
        updateCardQtyUI(card);
        updateCardLivePrice(card);
    }
};

window.decrementCardQty = async function (productId, btnElement, event) {
    if (event) event.stopPropagation();
    const card = btnElement.closest('.product-card');
    const size = card.querySelector('.size-selector .custom-select-trigger span').dataset.selected;
    const normalizedSize = cartService.normalizeSize(size);

    const cartItems = cartService.getCart();
    const item = cartItems.find(i => i.id === productId && i.size === normalizedSize);

    if (item) {
        const newQty = item.quantity - 1;
        if (newQty <= 0) {
            await cartService.removeFromCart(productId, size);
        } else {
            await cartService.updateQuantity(productId, size, newQty);
        }
        updateCardQtyUI(card);
        updateCardLivePrice(card);
    }
};

// Listen for global cart updates to sync all cards
cartService.addListener(() => {
    document.querySelectorAll('.product-card').forEach(card => {
        if (card && card.dataset.id) {
            updateCardQtyUI(card);
            updateCardLivePrice(card);
        }
    });
});

// Listen for wishlist updates to sync heart icons
wishlistService.addListener((wishlistItems) => {
    document.querySelectorAll('.product-card').forEach(card => {
        if (!card || !card.dataset.id) return;
        
        const productId = card.dataset.id;
        const heartBtn = card.querySelector('.card-wishlist');
        if (heartBtn) {
            const isWishlisted = wishlistItems.includes(productId);
            heartBtn.classList.toggle('active', isWishlisted);
            const heartIcon = heartBtn.querySelector('i');
            if (heartIcon) {
                heartIcon.className = isWishlisted ? 'fas fa-heart' : 'far fa-heart';
            }
            if (isWishlisted) {
                heartBtn.classList.add('wishlisted-hidden');
            } else {
                heartBtn.classList.remove('wishlisted-hidden');
            }
        }
    });
});
