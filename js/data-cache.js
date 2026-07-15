import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FIRESTORE_TIMEOUT = 4000; // 4 seconds timeout for Firestore calls
let productsCache = null;
let categoriesCache = null;
let cacheTimestamp = null;

function withTimeout(promise, timeoutMs = FIRESTORE_TIMEOUT) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore request timed out')), timeoutMs)
        )
    ]);
}

/**
 * Get products from cache or fetch from Firebase
 */
export async function getProducts(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && productsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('[DataCache] Using cached products');
        return productsCache;
    }

    try {
        console.log('[DataCache] Fetching products from Firebase...');
        const querySnapshot = await withTimeout(getDocs(collection(db, "products")));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        productsCache = products;
        categoriesCache = null;
        cacheTimestamp = now;

        console.log('[DataCache] Products fetched and cached:', products.length);
        return products;
    } catch (error) {
        console.error('[DataCache] Error fetching products:', error);

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

    if (!forceRefresh && categoriesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('[DataCache] Using cached categories');
        return categoriesCache;
    }

    const products = await getProducts(forceRefresh);

    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

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
