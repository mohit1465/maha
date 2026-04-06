/**
 * Client-side router for SEO-friendly URLs
 * Uses hash-based routing for static server compatibility
 * Handles URLs like product.html#/premium-badam-with-shell-almonds?id=xyz
 */

class Router {
    constructor() {
        this.routes = {};
        this.init();
    }

    init() {
        // Parse current URL hash
        this.parseCurrentHash();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.parseCurrentHash();
        });
        
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.parseCurrentHash();
        });
    }

    parseCurrentHash() {
        const hash = window.location.hash;
        console.log('Router parsing hash:', hash);
        
        // Check if we have a product hash like #/premium-badam-with-shell-almonds?id=xyz
        if (hash.startsWith('#/')) {
            // Extract slug and query params
            const hashWithoutPrefix = hash.substring(2); // Remove '#/'
            const [slug, queryParams] = hashWithoutPrefix.split('?');
            
            console.log('Hash without prefix:', hashWithoutPrefix);
            console.log('Slug:', slug);
            console.log('Query params:', queryParams);
            
            if (slug) {
                this.currentSlug = slug;
                
                // Parse query parameters
                if (queryParams) {
                    const urlParams = new URLSearchParams(queryParams);
                    this.currentProductId = urlParams.get('id');
                    console.log('Extracted product ID:', this.currentProductId);
                }
                
                console.log('Router detected slug:', slug, 'ID:', this.currentProductId);
            }
        }
    }

    /**
     * Navigate to a product with SEO-friendly URL using hash
     */
    navigateToProduct(slug, productId) {
        const newHash = `#/${slug}?id=${productId}`;
        
        // Update URL hash without page reload
        window.location.hash = newHash;
        
        // Store current values
        this.currentSlug = slug;
        this.currentProductId = productId;
    }

    /**
     * Get current product slug
     */
    getCurrentSlug() {
        return this.currentSlug || null;
    }

    /**
     * Get current product ID
     */
    getCurrentProductId() {
        return this.currentProductId || null;
    }

    /**
     * Generate SEO-friendly product URL using hash
     */
    generateProductUrl(productName, productId) {
        const slug = this.createSlug(productName);
        return `product.html#/${slug}?id=${productId}`;
    }

    /**
     * Generate canonical URL for SEO (without hash)
     */
    generateCanonicalUrl(productName, productId) {
        const slug = this.createSlug(productName);
        return `https://mohit1465.github.io/maha/product.html/${slug}?id=${productId}`;
    }

    /**
     * Create URL-friendly slug from product name
     */
    createSlug(productName) {
        return productName
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
    }
}

// Create global router instance
const router = new Router();

// Export for use in other modules
export default router;
