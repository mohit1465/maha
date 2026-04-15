import wishlistService from './wishlist-service.js';
import cartService from './cart-service.js';
import router from './router.js';
import { getProductImageUrl } from './image-helper.js';

/**
 * Product Card Renderer
 * Generates HTML for product cards with rich interactions.
 */

export function createProductCard(product) {
    // Generate SEO-friendly URL using router
    const seoUrl = router.generateProductUrl(product.name, product.id);
    
    // Determine badge (New, Best Seller, or Discount)
    let badgeHtml = '';
    if (product.isNew) {
        badgeHtml = '<span class="card-badge">New</span>';
    } else if (product.discount) {
        badgeHtml = `<span class="card-badge green">-${product.discount}%</span>`;
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

    // Construct HTML
    const cardHtml = `
        <div class="product-card" id="product-card-${product.id}" data-id="${product.id}" data-base-price="${product.price}">
            ${badgeHtml}
            <div class="card-wishlist ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product.id}', this, event)">
                <i class="fas fa-heart"></i>
            </div>
            
            <div class="card-image-container" onclick="navigateToProduct('${product.name}', '${product.id}')">
                <div class="card-image" style="background-image: url('${imageUrl}');"></div>
            </div>
            
            <div class="card-content">
                <div class="card-title" title="${product.name}">${product.shortTitle || product.name}</div>
                <div class="card-hindi-name">${product.hindiName || 'Premium Quality'}</div>
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
                
                <div class="card-footer">
                    <div class="card-price">₹${product.price}</div>
                    
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
export function createMinimalProductCard(product) {
    const imageUrl = getProductImageUrl(product.id, product.images, 1);
    const seoUrl = router.generateProductUrl(product.name, product.id);

    return `
        <div class="minimal-product-card" onclick="navigateToProduct('${product.name}', '${product.id}')">
            <div class="minimal-card-image-container">
                <div class="minimal-card-image" style="background-image: url('${imageUrl}');"></div>
            </div>
            <div class="minimal-card-content">
                <div class="minimal-card-title">${product.shortTitle || product.name}</div>
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

    if (qty > 0) {
        if (addBtn) addBtn.style.display = 'none';
        if (qtySelector) qtySelector.style.display = 'flex';
        if (qtyValue) qtyValue.textContent = qty;
    } else {
        if (addBtn) addBtn.style.display = 'flex';
        if (qtySelector) qtySelector.style.display = 'none';
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
};

window.handleAddToCart = async function (productId, btnElement, event) {
    if (event) event.stopPropagation();

    const card = btnElement.closest('.product-card');
    const size = card.querySelector('.size-selector .custom-select-trigger span').dataset.selected;
    const basePrice = parseFloat(card.dataset.basePrice);
    const productName = card.querySelector('.card-title').textContent;
    const productImage = card.querySelector('.card-image').style.backgroundImage.slice(5, -2).replace(/"/g, "");

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
        }
    });
});
