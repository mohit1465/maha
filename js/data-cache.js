import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Shared cache for Firebase data to avoid duplicate requests
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let productsCache = null;
let categoriesCache = null;
let cacheTimestamp = null;

/**
 * Get products from cache or fetch from Firebase
 */
export async function getProducts(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && productsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('[DataCache] Using cached products');
        return productsCache;
    }

    try {
        console.log('[DataCache] Fetching products from Firebase...');
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // Update cache
        productsCache = products;
        categoriesCache = null; // Invalidate categories cache
        cacheTimestamp = now;
        
        console.log('[DataCache] Products fetched and cached:', products.length);
        return products;
    } catch (error) {
        console.error('[DataCache] Error fetching products:', error);
        
        // Return cached data if available even if expired
        if (productsCache) {
            console.log('[DataCache] Using expired cached products due to error');
            return productsCache;
        }
        
        throw error;
    }
}

/**
 * Get categories from cache or derive from products
 */
export async function getCategories(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached categories if still valid
    if (!forceRefresh && categoriesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('[DataCache] Using cached categories');
        return categoriesCache;
    }

    // Get products first
    const products = await getProducts(forceRefresh);
    
    // Derive categories from products
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    
    // Update cache
    categoriesCache = categories;
    cacheTimestamp = now;
    
    console.log('[DataCache] Categories derived:', categories.length);
    return categories;
}

/**
 * Clear cache manually if needed
 */
export function clearCache() {
    console.log('[DataCache] Clearing cache');
    productsCache = null;
    categoriesCache = null;
    cacheTimestamp = null;
}

/**
 * Preload data in background
 */
export async function preloadData() {
    try {
        await getProducts();
        console.log('[DataCache] Data preloaded successfully');
    } catch (error) {
        console.warn('[DataCache] Preload failed, will load on demand:', error);
    }
}
