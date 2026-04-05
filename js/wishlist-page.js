import wishlistService from './wishlist-service.js';
import cartService from './cart-service.js';
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const wishlistList = document.querySelector('.wishlist-list');
    const emptyMsg = document.getElementById('emptyWishlist');

    if (!wishlistList || !emptyMsg) return;

    wishlistService.addListener(async (wishlistIds, isLoaded) => {
        if (!isLoaded) {
            emptyMsg.style.display = 'none';
            wishlistList.style.display = 'block';
            showWishlistSkeletons();
            return;
        }

        if (!wishlistIds || wishlistIds.length === 0) {
            wishlistList.innerHTML = '';
            wishlistList.style.display = 'none';
            emptyMsg.style.display = 'block';
            return;
        }

        emptyMsg.style.display = 'none';
        wishlistList.style.display = 'block';

        const products = [];
        const productPromises = wishlistIds.map(async (id) => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                }
            } catch (err) {
                console.error("Error fetching product:", id, err);
            }
            return null;
        });

        const results = await Promise.all(productPromises);
        results.forEach(p => {
            if (p) products.push(p);
        });

        renderWishlist(products);
    });

    function renderWishlist(products) {
        if (products.length === 0) {
            wishlistList.style.display = 'none';
            emptyMsg.style.display = 'block';
            return;
        }

        const headerHtml = `
            <div class="wishlist-headers">
                <div class="wishlist-header-product">Product</div>
                <div class="wishlist-header-price">Price</div>
                <div class="wishlist-header-stock">Status</div>
                <div class="wishlist-header-action">Action</div>
                <div class="wishlist-header-remove"></div>
            </div>
        `;

        let itemsHtml = headerHtml;
        products.forEach(product => {
            const imageUrl = (product.images && product.images['1']) ? product.images['1'] : 'https://placehold.co/100x100?text=Maharaja';

            itemsHtml += `
            <div class="wishlist-item" data-id="${product.id}">
                <div class="wishlist-item-product">
                    <div class="wishlist-item-thumbnail" style="background-image: url('${imageUrl}')"></div>
                    <div class="wishlist-item-details">
                        <div class="wishlist-item-name">${product.name}</div>
                        <div class="wishlist-item-category">${product.category || 'Dry Fruits'}</div>
                    </div>
                </div>
                <div class="wishlist-item-controls">
                    <div class="wishlist-item-price-stock-row">
                        <div class="wishlist-item-price">₹${product.price}</div>
                        <div class="wishlist-item-stock">
                            <span class="stock-status">In Stock</span>
                        </div>
                    </div>
                    <div class="wishlist-item-actions">
                        <button class="wishlist-add-btn" onclick="wishlistAddToCart('${product.id}', '${product.name}', ${product.price}, '${imageUrl}')">Add</button>
                        <button class="wishlist-buy-btn" onclick="wishlistBuyNow('${product.id}', '${product.name}', ${product.price}, '${imageUrl}')">Buy</button>
                    </div>
                    <div class="wishlist-item-remove">
                        <button class="remove-wishlist-item" onclick="removeFromWishlist('${product.id}')" title="Remove from wishlist">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        });

        wishlistList.innerHTML = itemsHtml;
    }

    function showWishlistSkeletons() {
        const headerHtml = `
            <div class="wishlist-headers">
                <div class="wishlist-header-product">Product</div>
                <div class="wishlist-header-price">Price</div>
                <div class="wishlist-header-stock">Status</div>
                <div class="wishlist-header-action">Action</div>
                <div class="wishlist-header-remove"></div>
            </div>
        `;

        let skeletonsHtml = headerHtml;
        for (let i = 0; i < 3; i++) {
            skeletonsHtml += `
            <div class="wishlist-item">
                <div class="wishlist-item-product">
                    <div class="wishlist-item-thumbnail skeleton"></div>
                    <div class="wishlist-item-details">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text" style="width: 40%"></div>
                    </div>
                </div>
                <div class="wishlist-item-controls">
                    <div class="wishlist-item-price-stock-row">
                        <div class="skeleton skeleton-text" style="width: 60px; height: 20px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60px; height: 24px; border-radius: 20px;"></div>
                    </div>
                    <div class="wishlist-item-actions">
                        <div class="skeleton skeleton-btn" style="width: 40px; height: 28px; border-radius: 15px;"></div>
                        <div class="skeleton skeleton-btn" style="width: 40px; height: 28px; border-radius: 15px;"></div>
                    </div>
                    <div class="wishlist-item-remove">
                        <div class="skeleton skeleton-circle" style="width: 32px; height: 32px;"></div>
                    </div>
                </div>
            </div>
            `;
        }
        wishlistList.innerHTML = skeletonsHtml;
    }

    // Global handlers for the onclick attributes
    window.wishlistAddToCart = async (id, name, price, imageUrl) => {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '...';

            await cartService.addToCart({
                id: id,
                name: name,
                price: price,
                images: { '1': imageUrl }
            }, 1, '250g'); // Default to 1 unit, 250g

            btn.innerHTML = '✓ Added';
            btn.style.backgroundColor = '#27ae60';

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                btn.style.backgroundColor = '';
            }, 2000);
        } catch (error) {
            console.error("Error adding to cart:", error);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    window.wishlistBuyNow = async (id, name, price, imageUrl) => {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '...';

            // Add to cart first
            await cartService.addToCart({
                id: id,
                name: name,
                price: price,
                images: { '1': imageUrl }
            }, 1, '250g');

            // Redirect to cart page for checkout
            btn.innerHTML = '✓ Added';
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 500);
        } catch (error) {
            console.error("Error with buy now:", error);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    window.removeFromWishlist = async (id) => {
        if (confirm('Remove this item from your wishlist?')) {
            await wishlistService.toggleWishlist(id);
        }
    };
});
