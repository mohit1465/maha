/**
 * Maharaja Dry Fruits — Global Smart Search Overlay
 * js/search-overlay.js
 *
 * Self-contained module. Drop the CSS + this script into any page.
 * Intercepts the .header-search-input, shows blurred overlay + results panel.
 */

import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getProductImageUrl } from './image-helper.js';
import router from './router.js';
import { getProducts as getProductsFromCache } from './data-cache.js';

/* ── Constants ──────────────────────────────────────────── */
const LS_RECENT_SEARCHES  = 'maha_recent_searches';   // string[]
const LS_RECENTLY_VIEWED  = 'maha_recently_viewed';   // {id,name,price,image}[]
const LS_SEARCH_COUNTS    = 'maha_search_counts';     // {term: count}
const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_VIEWED   = 12;
const MAX_LIVE_RESULTS    = 8;

const MOST_SEARCHED_SEED = [];

const CATEGORY_ICONS = {
    'Almonds':          'fas fa-seedling',
    'Walnuts':          'fas fa-circle',
    'Cashews':          'fas fa-leaf',
    'Pistachios':       'fas fa-spa',
    'Other Dry Fruits': 'fas fa-apple-alt',
};

/* ── localStorage helpers ───────────────────────────────── */
function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ── Recent Searches API ────────────────────────────────── */
function getRecentSearches() { return lsGet(LS_RECENT_SEARCHES, []); }

function addRecentSearch(term) {
    term = term.trim();
    if (!term) return;
    let list = getRecentSearches().filter(t => t.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    lsSet(LS_RECENT_SEARCHES, list.slice(0, MAX_RECENT_SEARCHES));
    // Track counts
    const counts = lsGet(LS_SEARCH_COUNTS, {});
    counts[term.toLowerCase()] = (counts[term.toLowerCase()] || 0) + 1;
    lsSet(LS_SEARCH_COUNTS, counts);
}

function removeRecentSearch(term) {
    lsSet(LS_RECENT_SEARCHES, getRecentSearches().filter(t => t !== term));
}

function clearAllRecentSearches() { lsSet(LS_RECENT_SEARCHES, []); }

/* ── Recently Viewed API ────────────────────────────────── */
function getRecentlyViewed() { return lsGet(LS_RECENTLY_VIEWED, []); }

export function addRecentlyViewed(product) {
    // Called from product.js when a product page loads
    const item = {
        id:    product.id,
        name:  product.name || product.shortTitle,
        price: product.price,
        image: getProductImageUrl(product.id, product.images, 1),
        url:   `product.html#/${router.createSlug(product.name)}?id=${product.id}`,
    };
    let list = getRecentlyViewed().filter(p => p.id !== item.id);
    list.unshift(item);
    lsSet(LS_RECENTLY_VIEWED, list.slice(0, MAX_RECENT_VIEWED));
}

/* ── Most Searched Builder (from product tags + names + search counts) ────── */
function getMostSearched(allProducts) {
    const counts = lsGet(LS_SEARCH_COUNTS, {});
    
    // Build list from product categories, tags, and names
    const productTerms = new Set();
    
    allProducts.forEach(p => {
        // Add category
        if (p.category) productTerms.add(p.category);
        
        // Add tags
        if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(tag => productTerms.add(tag));
        }
        
        // Add keywords
        if (p.keywords && Array.isArray(p.keywords)) {
            p.keywords.forEach(keyword => productTerms.add(keyword));
        }
        
        // Add short title (often contains product type)
        if (p.shortTitle) productTerms.add(p.shortTitle);
    });
    
    // Convert to array with icons
    const categoryIcons = {
        'Almonds': 'fas fa-seedling',
        'Walnuts': 'fas fa-circle',
        'Cashews': 'fas fa-leaf',
        'Pistachios': 'fas fa-spa',
        'Raisins': 'fas fa-grape',
        'Dates': 'fas fa-calendar',
        'Figs': 'fas fa-apple-alt',
        'Apricots': 'fas fa-lemon',
        'MAKHANA': 'fas fa-water',
        'Other Dry Fruits': 'fas fa-basket-shopping'
    };
    
    const productTermsArray = Array.from(productTerms).map(term => ({
        term: term,
        icon: categoryIcons[term] || 'fas fa-fire'
    }));
    
    // Add user-searched terms with high counts
    const extra = Object.entries(counts)
        .filter(([t]) => counts[t] >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([term]) => ({ 
            term: term.charAt(0).toUpperCase() + term.slice(1), 
            icon: 'fas fa-fire' 
        }));

    // Combine and limit to 14 items
    const combined = [...productTermsArray, ...extra];
    const unique = [];
    const seen = new Set();
    
    for (const item of combined) {
        const key = item.term.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }
    
    return unique.slice(0, 14);
}

/* ── Highlight match ────────────────────────────────────── */
function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

/* ── DOM Builder ────────────────────────────────────────── */
function buildOverlayDOM() {
    const backdrop = document.createElement('div');
    backdrop.id    = 'searchOverlayBackdrop';
    backdrop.className = 'search-overlay-backdrop';

    const panel = document.createElement('div');
    panel.id    = 'searchOverlayPanel';
    panel.className = 'search-overlay-panel';
    panel.innerHTML = `
        <div class="search-overlay-bar">
            <input
                type="text"
                id="searchOverlayInput"
                class="search-overlay-input"
                placeholder="Search for dry fruits, nuts, seeds…"
                autocomplete="off"
                spellcheck="false"
            />
            <button type="button" id="searchOverlayClear" class="search-overlay-clear" aria-label="Clear">
                <i class="fas fa-times"></i>
            </button>
            <button type="button" id="searchOverlaySubmit" class="search-overlay-submit" aria-label="Search">
                <i class="fas fa-search"></i>
            </button>
        </div>
        <div class="search-overlay-results" id="searchOverlayResults"></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    return { backdrop, panel };
}

/* ── Render helpers ─────────────────────────────────────── */
function renderRecentSearches(container, query) {
    const terms = getRecentSearches();
    if (!terms.length) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="sor-section" id="sorSectionRecent">
            <div class="sor-section-header">
                <div class="sor-section-title"><i class="fas fa-clock"></i> Recent Searches</div>
                <button class="sor-clear-all" id="sorClearAllSearches">Clear all</button>
            </div>
            <div class="sor-chips" id="sorChipsContainer">
                ${terms.map(t => `
                    <div class="sor-chip" data-term="${t}">
                        <i class="fas fa-history"></i>
                        <span>${t}</span>
                        <button class="sor-chip-remove" data-term="${t}" aria-label="Remove ${t}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
}

function renderRecentlyViewed(container) {
    const products = getRecentlyViewed();
    if (!products.length) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="sor-section">
            <div class="sor-section-header">
                <div class="sor-section-title"><i class="fas fa-eye"></i> Recently Viewed</div>
            </div>
            <div class="sor-products-scroll">
                ${products.map(p => `
                    <a href="${p.url}" class="sor-product-card" data-product-url="${p.url}">
                        <img class="sor-product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='assets/MAHARAJA logo.png';">
                        <div class="sor-product-info">
                            <div class="sor-product-name">${p.name}</div>
                            <div class="sor-product-price">₹${p.price}</div>
                        </div>
                    </a>
                `).join('')}
            </div>
        </div>
    `);
}

function renderLiveResults(container, products, categories, query) {
    const productMatches = products
        .filter(p => {
            const q = query.toLowerCase();
            return (p.name && p.name.toLowerCase().includes(q)) ||
                   (p.hindiName && p.hindiName.toLowerCase().includes(q)) ||
                   (p.category && p.category.toLowerCase().includes(q)) ||
                   (p.tags && p.tags.some && p.tags.some(t => t.toLowerCase().includes(q)));
        })
        .slice(0, MAX_LIVE_RESULTS);

    const categoryMatches = [...new Set(
        products
            .filter(p => p.category && p.category.toLowerCase().includes(query.toLowerCase()))
            .map(p => p.category)
    )].slice(0, 3);

    const totalResults = productMatches.length + categoryMatches.length;

    let html = `
        <div class="sor-section">
            <div class="sor-section-header">
                <div class="sor-section-title"><i class="fas fa-search"></i> Results for "${query}"</div>
                ${totalResults > 0 ? `<span class="sor-result-badge">${totalResults} found</span>` : ''}
            </div>
    `;

    if (totalResults === 0) {
        html += `
            <div class="sor-empty">
                <i class="fas fa-search"></i>
                No results for "<strong>${query}</strong>". Try a different keyword.
            </div>
        `;
    } else {
        html += `<div class="sor-results-list">`;

        // Category matches first
        categoryMatches.forEach(cat => {
            const icon = CATEGORY_ICONS[cat] || 'fas fa-th-large';
            html += `
                <a href="search.html?category=${encodeURIComponent(cat)}" class="sor-result-item" data-navigate="search.html?category=${encodeURIComponent(cat)}">
                    <div class="sor-result-thumb icon-thumb"><i class="${icon}"></i></div>
                    <div class="sor-result-text">
                        <div class="sor-result-name">${highlight(cat, query)}</div>
                        <div class="sor-result-sub">Browse category</div>
                    </div>
                    <span class="sor-result-badge category">Category</span>
                </a>
            `;
        });

        // Product matches
        productMatches.forEach(p => {
            const imgSrc = getProductImageUrl(p.id, p.images, 1);
            const url = `product.html#/${router.createSlug(p.name)}?id=${p.id}`;
            const discount = (p.originalPrice && p.originalPrice > p.price)
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : null;
            html += `
                <a href="${url}" class="sor-result-item" data-navigate="${url}" data-product-id="${p.id}">
                    <img class="sor-result-thumb" src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.classList.add('icon-thumb');this.outerHTML='<div class=\\'sor-result-thumb icon-thumb\\'><i class=\\'fas fa-box\\'></i></div>'">
                    <div class="sor-result-text">
                        <div class="sor-result-name">${highlight(p.name, query)}</div>
                        <div class="sor-result-sub">₹${p.price}${p.category ? ' · ' + p.category : ''}</div>
                    </div>
                    ${discount ? `<span class="sor-result-badge">${discount}% OFF</span>` : ''}
                </a>
            `;
        });

        html += `</div>`;

        // See all link
        html += `
            <a href="search.html?q=${encodeURIComponent(query)}" class="sor-result-item" style="margin-top:6px;justify-content:center;color:#fc6e20;font-size:13px;font-weight:700;" data-navigate="search.html?q=${encodeURIComponent(query)}">
                See all results for "${query}" <i class="fas fa-arrow-right" style="margin-left:6px;font-size:11px;"></i>
            </a>
        `;
    }

    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
}

function renderMostSearched(container, allProducts) {
    const tags = getMostSearched(allProducts);
    container.insertAdjacentHTML('beforeend', `
        <div class="sor-section">
            <div class="sor-section-header">
                <div class="sor-section-title"><i class="fas fa-fire"></i> Most Searched</div>
            </div>
            <div class="sor-popular-grid">
                ${tags.map(t => `
                    <div class="sor-popular-tag" data-term="${t.term}">
                        <i class="${t.icon}"></i> ${t.term}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="sor-footer-hint">
            <span><kbd>Esc</kbd> Close</span>
            <span><kbd>Enter</kbd> Search all</span>
        </div>
    `);
}

/* ── Main init ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const headerInput = document.querySelector('.header-search-input');
    if (!headerInput) return;

    // Build overlay DOM immediately so search bar works even before data loads
    const { backdrop, panel } = buildOverlayDOM();
    const overlayInput  = document.getElementById('searchOverlayInput');
    const overlayResults = document.getElementById('searchOverlayResults');
    const overlayClear  = document.getElementById('searchOverlayClear');
    const overlaySubmit = document.getElementById('searchOverlaySubmit');

    let allProducts = [];
    let isOpen      = false;
    let debounceTimer = null;
    let productsLoaded = false;

    // Render panel with whatever products we have (may be empty initially)
    function renderPanel(query) {
        overlayResults.innerHTML = '';

        if (query.length >= 2) {
            renderLiveResults(overlayResults, allProducts, [], query);
            if (productsLoaded) renderMostSearched(overlayResults, allProducts);
        } else {
            renderRecentSearches(overlayResults, query);
            renderRecentlyViewed(overlayResults);
            if (productsLoaded) renderMostSearched(overlayResults, allProducts);
        }

        attachResultListeners();
    }

    function attachResultListeners() {
        overlayResults.querySelectorAll('.sor-chip').forEach(chip => {
            chip.addEventListener('click', e => {
                if (e.target.closest('.sor-chip-remove')) return;
                const term = chip.dataset.term;
                overlayInput.value = term;
                overlayClear.classList.add('visible');
                renderPanel(term);
            });
        });

        overlayResults.querySelectorAll('.sor-chip-remove').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                removeRecentSearch(btn.dataset.term);
                renderPanel(overlayInput.value.trim());
            });
        });

        const clearAllBtn = document.getElementById('sorClearAllSearches');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                clearAllRecentSearches();
                renderPanel(overlayInput.value.trim());
            });
        }

        overlayResults.querySelectorAll('.sor-popular-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const term = tag.dataset.term;
                overlayInput.value = term;
                overlayClear.classList.add('visible');
                renderPanel(term);
            });
        });

        overlayResults.querySelectorAll('[data-navigate]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                const url = el.dataset.navigate;
                const productId = el.dataset.productId;

                if (productId) {
                    const product = allProducts.find(p => p.id === productId);
                    if (product) addRecentlyViewed(product);
                }

                const currentQuery = overlayInput.value.trim();
                if (currentQuery.length >= 2) addRecentSearch(currentQuery);

                close();
                window.location.href = url;
            });
        });
    }

    /* ── Open / Close ─────────────────────────────────── */
    function open() {
        if (isOpen) return;
        isOpen = true;
        backdrop.classList.add('active');
        panel.classList.add('active');
        overlayInput.value = headerInput.value || '';
        setTimeout(() => overlayInput.focus(), 60);
        renderPanel(overlayInput.value.trim());
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        backdrop.classList.remove('active');
        panel.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Attach open/close listeners immediately
    headerInput.addEventListener('focus', e => {
        e.preventDefault();
        open();
        headerInput.blur();
    });

    headerInput.addEventListener('click', e => {
        if (!isOpen) open();
    });

    backdrop.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen) close();
    });

    // Also allow opening from the search button (needed for home page collapsed search)
    // But skip on search page to avoid conflict with live search
    const isSearchPage = window.location.pathname.includes('search.html');
    const searchBtn = document.querySelector('.header-search-btn');
    if (searchBtn && !isSearchPage) {
        searchBtn.addEventListener('click', e => {
            e.preventDefault();
            open();
        });
    }

    /* ── Overlay Input Events ───────────────────────── */
    overlayInput.addEventListener('input', () => {
        const q = overlayInput.value;
        overlayClear.classList.toggle('visible', q.length > 0);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => renderPanel(q.trim()), 150);
    });

    overlayClear.addEventListener('click', () => {
        overlayInput.value = '';
        overlayClear.classList.remove('visible');
        overlayInput.focus();
        renderPanel('');
    });

    overlaySubmit.addEventListener('click', () => submitSearch());

    overlayInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitSearch();
        if (e.key === 'Escape') close();
    });

    function submitSearch() {
        const q = overlayInput.value.trim();
        if (!q) return;
        addRecentSearch(q);
        close();
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }

    // Render initial empty state
    renderPanel('');

    // Fetch products in background (non-blocking)
    async function loadProducts() {
        try {
            allProducts = await getProductsFromCache();
            productsLoaded = true;
            console.log('[SearchOverlay] Products loaded:', allProducts.length);
        } catch (e) {
            console.warn('[SearchOverlay] Product fetch failed, trying direct fetch', e);
            try {
                const snap = await getDocs(collection(db, 'products'));
                snap.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
                productsLoaded = true;
            } catch (fallbackError) {
                console.error('[SearchOverlay] Direct fetch also failed:', fallbackError);
            }
        }

        // Re-render if overlay is open so user sees results
        if (isOpen) {
            renderPanel(overlayInput.value.trim());
        }
    }

    loadProducts();
});
