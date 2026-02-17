import cartService from './cart-service.js';

/**
 * Updates all cart count badges on the page
 */
function updateCartCount() {
    const cartItems = cartService.getCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Update all cart count badges (both desktop and mobile)
    const cartCountElements = document.querySelectorAll('.cart-count');

    cartCountElements.forEach(badge => {
        badge.textContent = totalItems;

        // Show or hide badge based on count
        if (totalItems > 0) {
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    });
}

// Listen for cart changes
cartService.addListener(() => {
    updateCartCount();
});

// Initial update
updateCartCount();
