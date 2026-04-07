/**
 * Image Helper Utility
 * Supports both local WebP images and base64 fallback
 */

// Product ID to local WebP image mapping (using simple text with spaces only)
const localImageMapping = {
    // Almonds
    'alm-001': 'assets/products/american-badam-giri/American-Almonds-Badam-Giri-Premium-Quality-Kernels-Online.webp',
    'alm-002': 'assets/products/badam-with-shell/Badam-with-Shell-Premium-Almonds-Fresh-Natural.webp',
    'alm-003': 'assets/products/kagzi-badam/Kagzi Badam Soft Shell Almonds Premium Quality.webp',
    'alm-004': 'assets/products/kashmiri-giri-almonds/Kashmiri-Almonds-Badam-Giri-Rich-Premium-Quality.webp',
    'alm-005': 'assets/products/akhrot-giri-white/Akhrot Giri White.webp',
    'alm-006': 'assets/products/paper-shell-almond/Paper Shell Almond.webp',
    
    // Other Dry Fruits
    'dry-001': 'assets/products/chilloza-pine-nuts/Chilgoza Pine Nuts Premium Dry Fruits Online.webp',
    'dry-002': 'assets/products/anjeer-fig/Premium Anjeer Dried Figs Sweet Natural.webp',
    'dry-003': 'assets/products/kishmish/Kishmish Raisins Fresh Naturally Sweet.webp',
    'dry-004': 'assets/products/mix-dry-fruit-murabba/Mixed Dry Fruit Murabba Healthy Traditional Sweet.webp',
    'dry-005': 'assets/products/panch-mewa/Panch Mewa Mix Premium Dry Fruits Blend.webp',
    'dry-006': 'assets/products/pista-roasted/Roasted Pista Pistachios Crunchy Premium.webp',
    'dry-007': 'assets/products/turkel-apricot/Turkish Apricots Premium Dried Khubani.webp',
    'dry-008': 'assets/products/khumani-white/White Khumani Dried Apricots Soft Natural.webp',
    'dry-009': 'assets/products/blueberry/Dried Blueberries Premium Antioxidant Rich.webp',
    'dry-010': 'assets/products/cashew/Cashew Nuts Kaju Premium Quality Whole.webp',
    
    // Walnuts
    'wal-002': 'assets/products/kashmiri-walnut-giri/Kashmiri-Walnut-Kernels-Akhrot-Giri-Premium-Quality.webp',
    'wal-003': 'assets/products/krela-akhrot/Karela Akhrot Walnuts Natural Healthy.webp',
    'wal-004': 'assets/products/silver-queen-walnuts/Silver Queen Walnuts Premium Grade Quality.webp',
    'wal-005': 'assets/products/snow-white-akhrot-giri/Snow White Akhrot Giri Premium Quality Walnuts.webp',
    'wal-006': 'assets/products/super-walnuts-shell/Walnuts-with-Shell-Super-Quality-Akhrot.webp',
    'wal-007': 'assets/products/superior-quality-walnuts-shell/Superior-Quality-Walnuts-with-Shell-Premium-Grade.webp',
    'wal-008': 'assets/products/kashmir-regular-walnuts/A1KashmiriRegularWalnutsPremiumQuality.webp',
    'wal-009': 'assets/products/walnuts-superior-quality/Medium Size Walnuts Superior Quality Premium Grade.webp',
    
    // SEO Product ID Mappings (for product names used in SEO data)
    'american-badam-giri': 'assets/products/american-badam-giri/American-Almonds-Badam-Giri-Premium-Quality-Kernels-Online.webp',
    'badam-with-shell': 'assets/products/badam-with-shell/Badam-with-Shell-Premium-Almonds-Fresh-Natural.webp',
    'kagzi-badam': 'assets/products/kagzi-badam/Kagzi Badam Soft Shell Almonds Premium Quality.webp',
    'kashmiri-giri-almonds': 'assets/products/kashmiri-giri-almonds/Kashmiri-Almonds-Badam-Giri-Rich-Premium-Quality.webp',
    'chilloza-pine-nuts': 'assets/products/chilloza-pine-nuts/Chilgoza Pine Nuts Premium Dry Fruits Online.webp',
    'anjeer-fig': 'assets/products/anjeer-fig/Premium Anjeer Dried Figs Sweet Natural.webp',
    'kishmish': 'assets/products/kishmish/Kishmish Raisins Fresh Naturally Sweet.webp',
    'mix-dry-fruit-murabba': 'assets/products/mix-dry-fruit-murabha/Mixed Dry Fruit Murabba Healthy Traditional Sweet.webp',
    'panch-mewa': 'assets/products/panch-mewa/Panch Mewa Mix Premium Dry Fruits Blend.webp',
    'pista-roasted': 'assets/products/pista-roasted/Roasted Pista Pistachios Crunchy Premium.webp',
    'turkel-apricot': 'assets/products/turkel-apricot/Turkish Apricots Premium Dried Khubani.webp',
    'khumani-white': 'assets/products/khumani-white/White Khumani Dried Apricots Soft Natural.webp',
    'blueberry': 'assets/products/blueberry/Dried Blueberries Premium Antioxidant Rich.webp',
    'cashew': 'assets/products/cashew/Cashew Nuts Kaju Premium Quality Whole.webp',
    'kashmiri-walnut-giri': 'assets/products/kashmiri-walnut-giri/Kashmiri-Walnut-Kernels-Akhrot-Giri-Premium-Quality.webp',
    'krela-akhrot': 'assets/products/krela-akhrot/Karela Akhrot Walnuts Natural Healthy.webp',
    'silver-queen-walnuts': 'assets/products/silver-queen-walnuts/Silver Queen Walnuts Premium Grade Quality.webp',
    'super-walnuts-with-shell': 'assets/products/super-walnuts-shell/Walnuts-with-Shell-Super-Quality-Akhrot.webp',
    'superior-quality-walnuts-with-shell': 'assets/products/superior-quality-walnuts-shell/Superior-Quality-Walnuts-with-Shell-Premium-Grade.webp',
    'akhrot-giri-white': 'assets/products/akhrot-giri-white/Akhrot Giri White.webp',
    'walnuts-superior-quality-medium': 'assets/products/walnuts-superior-quality/Medium Size Walnuts Superior Quality Premium Grade.webp',
    'snow-white-akhrot-giri': 'assets/products/snow-white-akhrot-giri/Snow White Akhrot Giri Premium Quality Walnuts.webp'
};

/**
 * Get product image URL with fallback system
 * @param {string} productId - Product ID
 * @param {Object} productImages - Product images object from database
 * @param {number} imageIndex - Image index (default: 1)
 * @returns {string} Image URL
 */
function getProductImageUrl(productId, productImages = {}, imageIndex = 1) {
    // First try to get local WebP image
    const localImagePath = localImageMapping[productId];
    if (localImagePath) {
        // Add cache-busting parameter for mixed dry fruit murabba to force refresh
        if (productId && (productId.includes('mix') || productId.includes('murabba'))) {
            return localImagePath + '?v=' + Date.now();
        }
        return localImagePath;
    }
    
    // Fallback to base64 from database
    if (productImages && productImages[imageIndex]) {
        return productImages[imageIndex];
    }
    
    // Final fallback to Maharaja placeholder
    return 'https://placehold.co/400x400?text=Maharaja';
}

/**
 * Get all product images with fallback
 * @param {string} productId - Product ID  
 * @param {Object} productImages - Product images object from database
 * @returns {Array} Array of image URLs
 */
function getAllProductImages(productId, productImages = {}) {
    const images = [];
    
    // First try local image
    const localImagePath = localImageMapping[productId];
    if (localImagePath) {
        images.push(localImagePath);
    }
    
    // Then add base64 images if they exist
    if (productImages) {
        Object.keys(productImages)
            .sort()
            .forEach(key => {
                const base64Image = productImages[key];
                if (base64Image && !images.includes(base64Image)) {
                    images.push(base64Image);
                }
            });
    }
    
    // Ensure at least one image
    if (images.length === 0) {
        images.push('https://placehold.co/400x400?text=Maharaja');
    }
    
    return images;
}

/**
 * Check if product has local image
 * @param {string} productId - Product ID
 * @returns {boolean} True if local image exists
 */
function hasLocalImage(productId) {
    return !!localImageMapping[productId];
}

/**
 * Get product thumbnail with fallback
 * @param {string} productId - Product ID
 * @param {Object} productImages - Product images object from database
 * @returns {string} Thumbnail URL
 */
function getProductThumbnail(productId, productImages = {}) {
    return getProductImageUrl(productId, productImages, 1);
}

export {
    getProductImageUrl,
    getAllProductImages,
    hasLocalImage,
    getProductThumbnail,
    localImageMapping
};
