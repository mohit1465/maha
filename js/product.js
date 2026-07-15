// Product Section Functionality
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createProductCard } from './card-renderer.js';
import cartService from './cart-service.js';
import wishlistService from './wishlist-service.js';
import router from './router.js';
import { getProductImageUrl, getAllProductImages } from './image-helper.js';

function withTimeout(promise, timeoutMs = 4000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        )
    ]);
}

document.addEventListener('DOMContentLoaded', async function () {
    const productSection = document.querySelector('.product-main, .product-section');

    // Get product ID from URL (handle multiple formats)
    let productId = null;

    // 1. Try hash-based routing first (new SEO-friendly format)
    const hashProductId = router.getCurrentProductId();
    if (hashProductId) {
        productId = hashProductId;
    }

    // 2. Fallback to query parameters (old format)
    if (!productId) {
        const urlParams = new URLSearchParams(window.location.search);
        productId = urlParams.get('id');
    }

    // 3. Alternative: try to extract from hash string directly
    if (!productId) {
        const hashMatch = window.location.hash.match(/id=([^&]+)/);
        if (hashMatch) {
            productId = hashMatch[1];
        }
    }

    // Initialize product section
    async function initProduct() {
        console.log('Initializing product with ID:', productId);

        if (!productId) {
            // No product ID, redirect to search or home?
            console.error("No product ID provided");
            const productGrid = document.querySelector('.product-detail-grid');
            if (productGrid) {
                productGrid.classList.remove('skeleton-loading-active');
                productGrid.innerHTML = '<div class="error-msg">No product ID provided</div>';
            }
            return;
        }

        try {
            console.log('Fetching product from Firebase with ID:', productId);
            const docRef = doc(db, "products", productId);
            const docSnap = await withTimeout(getDoc(docRef));

            if (docSnap.exists()) {
                const product = docSnap.data();
                console.log('Product loaded successfully:', product);

                // Track this product as recently viewed (for search overlay)
                try {
                    const { addRecentlyViewed } = await import('./search-overlay.js');
                    addRecentlyViewed({ id: productId, ...product });
                } catch (e) { /* search-overlay not loaded on this page */ }

                // Update page title and meta description for SEO
                updatePageSeo(product);

                populateProductDetails(product);
                setupThumbnails();
                setupVariants(product);
                setupQuantitySelector(product);
                setupActionButtons(product);
                setupFixedActionBar(product);

                // Add reactive cart updates for product detail page quantity & add to cart button
                cartService.addListener(() => {
                    updateQtyAndCartUI(product);
                });
                updateQtyAndCartUI(product);

                setupImageZoom();
                setupAdditionalInteractions();

                // Load similar products
                renderSimilarProducts(product, productId);

                // Update breadcrumb
                const breadcrumbCurrent = document.querySelector('.breadcrumb-item.current');
                if (breadcrumbCurrent) {
                    breadcrumbCurrent.textContent = product.shortTitle || product.name;
                }
                initReviews(product);

                // Remove skeleton loading state after image loads
                const productGrid = document.querySelector('.product-detail-grid');
                if (productGrid) {
                    const mainImage = document.getElementById('mainImage');
                    if (mainImage) {
                        let classRemoved = false;
                        const removeSkeleton = () => {
                            if (!classRemoved) {
                                classRemoved = true;
                                productGrid.classList.remove('skeleton-loading-active');
                            }
                        };
                        
                        // Fallback timeout of 2.5 seconds
                        const timeoutId = setTimeout(removeSkeleton, 2500);

                        if (mainImage.complete) {
                            clearTimeout(timeoutId);
                            removeSkeleton();
                        } else {
                            mainImage.addEventListener('load', () => {
                                clearTimeout(timeoutId);
                                removeSkeleton();
                            });
                            mainImage.addEventListener('error', () => {
                                clearTimeout(timeoutId);
                                removeSkeleton();
                            });
                        }
                    } else {
                        productGrid.classList.remove('skeleton-loading-active');
                    }
                }
            } else {
                console.log("No such product!");
                const productGrid = document.querySelector('.product-detail-grid');
                if (productGrid) {
                    productGrid.classList.remove('skeleton-loading-active');
                    productGrid.innerHTML = '<div class="error-msg">Product not found</div>';
                }
            }
        } catch (error) {
            console.error("Error getting document:", error);
            const productGrid = document.querySelector('.product-detail-grid');
            if (productGrid) {
                productGrid.classList.remove('skeleton-loading-active');
                productGrid.innerHTML = '<div class="error-msg">Error loading product</div>';
            }
        }
    }

    const ProductShortcuts = {
        storage: {
            DEFAULT: "Store in an airtight container in a cool, dry place away from direct sunlight.",
            REFRIGERATE: "Keep refrigerated in an airtight container to preserve crunch and freshness."
        },
        nutrition: {
            ALMONDS: "Rich in Protein, Vitamin E, Magnesium, and heart-healthy fats.",
            WALNUTS: "Excellent source of Omega-3 fatty acids, antioxidants, and brain-boosting nutrients.",
            PINE_NUTS: "Packed with heart-healthy fats, iron, and energy-boosting nutrients.",
            FIGS: "High in dietary fiber, natural sugars, and essential minerals for digestive health.",
            RAISINS: "Rich in iron, potassium, and natural antioxidants.",
            PISTACHIOS: "High in protein, fiber, and eye-protecting antioxidants.",
            APRICOTS: "Excellent source of Vitamin A, Vitamin C, and dietary fiber.",
            BLUEBERRIES: "A true superfood packed with powerful antioxidants and vitamins.",
            CASHEWS: "Rich in heart-healthy monounsaturated fats, zinc, and copper.",
            MAKHANA: "Low in calories, high in protein, calcium, and essential antioxidants for clean snacking.",
            MIXED: "A perfectly balanced blend of essential vitamins, minerals, and natural energy."
        }
    };

    /**
     * Format the long description nicely for UX
     */
    function formatLongDescription(descData) {
        if (!descData) return '';

        let text = typeof descData === 'object' ? descData.details : descData;
        if (!text) text = '';

        const lines = text.split('\n').filter(line => line.trim() !== '');

        let html = '<div class="formatted-description">';
        let inList = false;
        let listHtml = '';
        let inHighlights = false;

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Detect bullet points
            if (trimmed.startsWith('✔') || trimmed.startsWith('✅') || trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
                if (inHighlights) {
                    html += '</div>';
                    inHighlights = false;
                }
                if (!inList) {
                    inList = true;
                    listHtml = '<ul class="product-features-list">';
                }
                const content = trimmed.substring(1).trim();
                listHtml += `<li><i class="fas fa-check-circle check-icon"></i> <span>${content}</span></li>`;
            }
            // Detect highlights/tags
            else if (trimmed.match(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u) &&
                (trimmed.includes('Available') || trimmed.includes('grade') || trimmed.includes('Order') || trimmed.length < 50)) {

                if (inList) {
                    html += listHtml + '</ul>';
                    inList = false;
                }
                if (!inHighlights) {
                    html += '<div class="product-highlights-box">';
                    inHighlights = true;
                }

                const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+)\s*(.*)/u);

                if (emojiMatch) {
                    const originalEmoji = emojiMatch[1];
                    const content = emojiMatch[2];

                    let faIcon = 'fas fa-star';
                    if (originalEmoji.includes('💰') || content.toLowerCase().includes('price') || content.toLowerCase().includes('₹') || content.toLowerCase().includes('available')) {
                        faIcon = 'fas fa-tag';
                    } else if (originalEmoji.includes('📦') || content.toLowerCase().includes('grade') || content.toLowerCase().includes('quality')) {
                        faIcon = 'fas fa-medal';
                    } else if (originalEmoji.includes('👉') || content.toLowerCase().includes('order') || content.toLowerCase().includes('buy')) {
                        faIcon = 'fas fa-bolt';
                    }

                    html += `<div class="highlight-item"><div class="highlight-icon"><i class="${faIcon}"></i></div><div class="highlight-text">${content}</div></div>`;
                } else {
                    html += `<div class="highlight-item"><div class="highlight-icon"><i class="fas fa-check-circle"></i></div><div class="highlight-text">${trimmed.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/u, '').trim()}</div></div>`;
                }
            }
            else {
                if (inList) {
                    html += listHtml + '</ul>';
                    inList = false;
                }
                if (inHighlights) {
                    html += '</div>';
                    inHighlights = false;
                }

                if (index === 0) {
                    html += `<p class="product-lead-text">${trimmed}</p>`;
                } else {
                    html += `<p>${trimmed}</p>`;
                }
            }
        });

        if (inList) {
            html += listHtml + '</ul>';
        }
        if (inHighlights) {
            html += '</div>';
        }

        // Add dynamically resolved shortcuts if they exist
        if (typeof descData === 'object') {
            if (descData.nutritionKey && ProductShortcuts.nutrition[descData.nutritionKey]) {
                html += `
                <div class="product-info-shortcut nutrition">
                    <i class="fas fa-leaf" style="color: #4CAF50;"></i>
                    <span><strong>Nutrition:</strong> ${ProductShortcuts.nutrition[descData.nutritionKey]}</span>
                </div>`;
            }
            if (descData.storageKey && ProductShortcuts.storage[descData.storageKey]) {
                html += `
                <div class="product-info-shortcut storage">
                    <i class="fas fa-snowflake" style="color: #2196F3;"></i>
                    <span><strong>Storage:</strong> ${ProductShortcuts.storage[descData.storageKey]}</span>
                </div>`;
            }
        }

        html += '</div>';
        return html;
    }

    /**
     * Update page SEO elements based on product data
     */
    function updatePageSeo(product) {
        // Generate SEO-optimized title
        const seoTitle = generateSeoTitle(product);
        document.title = seoTitle;

        // Update or create meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = generateSeoDescription(product);

        // Update canonical URL
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        const canonicalUrl = router.generateCanonicalUrl(product.name, product.id);
        canonicalLink.href = canonicalUrl;
    }

    /**
     * Generate SEO-optimized product title
     */
    function generateSeoTitle(product) {
        const baseTitle = `${product.name} – Fresh & Natural | Buy Online in India`;
        const prefix = product.isPremium ? 'Premium ' : '';
        return `${prefix}${baseTitle}`;
    }

    /**
    /**
     * Generate SEO-optimized product description
     */
    function generateSeoDescription(product) {
        const benefits = product.benefits || 'Rich in nutrients and perfect for healthy snacking';
        const priceInfo = product.price ? `Available at just ₹${product.price}` : 'Available at best price';
        return `Experience the richness of ${product.name.toLowerCase()}, carefully selected for freshness and taste. ${benefits}. ${priceInfo}. Multiple sizes available. Order now and enjoy farm-fresh quality delivered to your doorstep.`;
    }

    const NutritionDetails = {
        ALMONDS: { Protein: "21g", Fats: "50g", Carbs: "22g", Fiber: "12g", Calories: "579 kcal" },
        WALNUTS: { Protein: "15g", Fats: "65g", Carbs: "14g", Fiber: "7g", Calories: "654 kcal" },
        PINE_NUTS: { Protein: "14g", Fats: "68g", Carbs: "13g", Fiber: "4g", Calories: "673 kcal" },
        FIGS: { Protein: "3g", Fats: "0.9g", Carbs: "64g", Fiber: "10g", Calories: "249 kcal" },
        RAISINS: { Protein: "3g", Fats: "0.5g", Carbs: "79g", Fiber: "4g", Calories: "299 kcal" },
        PISTACHIOS: { Protein: "20g", Fats: "45g", Carbs: "28g", Fiber: "10g", Calories: "562 kcal" },
        APRICOTS: { Protein: "3.4g", Fats: "0.5g", Carbs: "63g", Fiber: "7g", Calories: "241 kcal" },
        BLUEBERRIES: { Protein: "3g", Fats: "1g", Carbs: "80g", Fiber: "6g", Calories: "330 kcal" },
        CASHEWS: { Protein: "18g", Fats: "44g", Carbs: "30g", Fiber: "3.3g", Calories: "553 kcal" },
        MAKHANA: { Protein: "9.7g", Fats: "1.2g", Carbs: "77g", Fiber: "14.5g", Calories: "347 kcal" },
        MIXED: { Protein: "15g", Fats: "48g", Carbs: "25g", Fiber: "8g", Calories: "560 kcal" }
    };

    const StorageDetails = {
        DEFAULT: [
            "Store in a cool & dry place away from sunlight.",
            "Transfer to an airtight container after opening.",
            "Best consumed within 6 months of packaging."
        ],
        REFRIGERATE: [
            "Keep refrigerated in an airtight container to preserve crunch and freshness.",
            "Avoid exposure to moisture and high humidity.",
            "Best consumed within 6 to 9 months."
        ]
    };

    function populateProductDetails(product) {
        // Title (including Hindi name if present)
        const titleElement = document.querySelector('.product-detail-title');
        if (titleElement) {
            if (product.hindiName) {
                titleElement.innerHTML = `${product.name} <span class="product-hindi-name" style="font-family: 'Inter', sans-serif; font-size: 0.6em; color: #888; margin-left: 10px; font-weight: normal;">(${product.hindiName})</span>`;
            } else {
                titleElement.textContent = product.name;
            }
        }
        
        // Category and tags badges
        const metaContainer = document.querySelector('.product-detail-meta');
        if (metaContainer) {
            // Keep original category and rating elements
            const categoryEl = metaContainer.querySelector('.product-detail-category');
            const ratingEl = metaContainer.querySelector('.product-detail-rating');
            metaContainer.innerHTML = '';
            
            if (categoryEl) {
                categoryEl.textContent = product.category;
                metaContainer.appendChild(categoryEl);
            }
            
            // Append product tags as beautiful badges
            if (product.tags && Array.isArray(product.tags)) {
                product.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'product-tag-badge';
                    tagSpan.textContent = tag;
                    metaContainer.appendChild(tagSpan);
                });
            }
            
            if (ratingEl) {
                metaContainer.appendChild(ratingEl);
            }
        }
        
        // Rating
        const ratingElement = document.getElementById('productAvgRatingVal');
        if (ratingElement) ratingElement.textContent = product.rating || '4.5';

        // Description
        const descElement = document.getElementById('productOverview');
        if (descElement) {
            if (product.longDescription) {
                descElement.innerHTML = formatLongDescription(product.longDescription);
            } else if (product.shortDescription) {
                descElement.textContent = product.shortDescription;
            } else {
                descElement.textContent = 'Premium quality ' + product.category.toLowerCase() + '.';
            }
        }

        // Dynamic Specifications Section
        const specsCard = document.getElementById('productSpecsCard');
        const specsGrid = document.getElementById('specsGrid');
        if (specsCard && specsGrid) {
            specsCard.style.display = 'block';
            const shelfLife = product.category.toLowerCase().includes('fruit') || product.category.toLowerCase().includes('nut') ? '6 Months' : '3 Months';
            const packaging = product.name.toLowerCase().includes('jar') ? 'Sealed Premium Pet Jar' : 'Premium Sealed Pouch';
            specsGrid.innerHTML = `
                <div class="product-spec-item"><span>Brand</span><strong>Maharaja Dry Fruits</strong></div>
                <div class="product-spec-item"><span>Category</span><strong>${product.category}</strong></div>
                <div class="product-spec-item"><span>Shelf Life</span><strong>${shelfLife}</strong></div>
                <div class="product-spec-item"><span>Diet Type</span><strong>Vegetarian</strong></div>
                <div class="product-spec-item"><span>Packaging</span><strong>${packaging}</strong></div>
                <div class="product-spec-item"><span>Origin</span><strong>India</strong></div>
            `;
        }

        // Dynamic Nutrition Facts Section
        const nutKey = product.longDescription?.nutritionKey;
        const nutritionCard = document.getElementById('productNutritionCard');
        const nutritionGrid = document.getElementById('nutritionGrid');
        
        if (nutKey && NutritionDetails[nutKey]) {
            if (nutritionCard) nutritionCard.style.display = 'block';
            if (nutritionGrid) {
                const data = NutritionDetails[nutKey];
                nutritionGrid.innerHTML = Object.entries(data).map(([key, val]) => `
                    <div class="product-nutrition-item">
                        <span>${key}</span>
                        <strong>${val}</strong>
                    </div>
                `).join('');
            }
        } else {
            if (nutritionCard) nutritionCard.style.display = 'none';
        }

        // Dynamic Storage Instructions Section
        const storKey = product.longDescription?.storageKey;
        const storageCard = document.getElementById('productStorageCard');
        const storageList = document.getElementById('storageList');
        
        if (storKey && StorageDetails[storKey]) {
            if (storageCard) storageCard.style.display = 'block';
            if (storageList) {
                const list = StorageDetails[storKey];
                storageList.innerHTML = list.map(item => `<li>${item}</li>`).join('');
            }
        } else {
            if (storageCard) storageCard.style.display = 'none';
        }

        // Images
        const mainImage = document.getElementById('mainImage');
        const thumbnailsContainer = document.getElementById('thumbnailColumn');
        if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';

        const allImages = getAllProductImages(productId, product.images);
        if (allImages.length > 0 && mainImage) {
            mainImage.src = allImages[0];
            mainImage.alt = product.name;

            allImages.forEach((imgUrl, index) => {
                const thumb = document.createElement('img');
                thumb.className = `thumbnail-image ${index === 0 ? 'active' : ''}`;
                thumb.src = imgUrl;
                thumb.addEventListener('click', function () {
                    document.querySelectorAll('.thumbnail-image').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    mainImage.src = imgUrl;
                    
                    if (typeof window.updateThumbnailStack === 'function') {
                        window.updateThumbnailStack();
                    }
                });
                if (thumbnailsContainer) thumbnailsContainer.appendChild(thumb);
            });
            
            if (typeof window.updateThumbnailStack === 'function') {
                window.updateThumbnailStack();
            }

            // Center if fits, left-align if it exceeds container width
            if (thumbnailsContainer) {
                setTimeout(() => {
                    if (thumbnailsContainer.scrollWidth > thumbnailsContainer.clientWidth) {
                        thumbnailsContainer.style.justifyContent = 'flex-start';
                    } else {
                        thumbnailsContainer.style.justifyContent = 'center';
                    }
                }, 100);
            }
        }
        
        syncProductDetails(product);
    }

    function updatePriceDisplay(price, originalPrice = null) {
        const mainPrice = document.getElementById('productPriceDisplay');
        const origPrice = document.getElementById('productOriginalPriceDisplay');
        const discountBadge = document.getElementById('productDiscountDisplay');
        const mobilePrice = document.getElementById('mobilePriceVal');

        if (mainPrice) mainPrice.textContent = `₹${price.toLocaleString('en-IN')}`;
        if (mobilePrice) mobilePrice.textContent = `₹${price.toLocaleString('en-IN')}`;

        if (originalPrice && originalPrice > price) {
            if (origPrice) {
                origPrice.textContent = `₹${originalPrice.toLocaleString('en-IN')}`;
                origPrice.style.display = 'inline-block';
            }
            if (discountBadge) {
                const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
                discountBadge.textContent = `${discountPercent}% OFF`;
                discountBadge.style.display = 'inline-block';
            }
        } else {
            if (origPrice) origPrice.style.display = 'none';
            if (discountBadge) discountBadge.style.display = 'none';
        }
    }

    function getVariantPrice(product, size) {
        const activePill = document.querySelector('.product-variant-pill.active');
        if (activePill && activePill.dataset.price) {
            return { 
                price: parseFloat(activePill.dataset.price), 
                originalPrice: activePill.dataset.originalPrice !== "null" ? parseFloat(activePill.dataset.originalPrice) : null 
            };
        }
        if (product.variants && product.variants.length > 0) {
            const variant = product.variants.find(v => v.weight.toLowerCase() === size.toLowerCase());
            if (variant) {
                return { price: variant.price, originalPrice: variant.originalPrice };
            }
        }
        return { price: product.price, originalPrice: product.originalPrice };
    }

    function getProductQuantity() {
        const activeVariant = document.querySelector('.product-variant-pill.active .var-weight');
        const selectedSize = activeVariant ? activeVariant.textContent : '250g';
        const normalizedSize = cartService.normalizeSize(selectedSize);

        const cartItems = cartService.getCart();
        const existingItem = cartItems.find(item => item.id === productId && item.size === normalizedSize);
        return existingItem ? existingItem.quantity : 1;
    }

    function updateQtyAndCartUI(product) {
        const desktopCapsule = document.getElementById('productQtyCapsule');
        const mobileCapsule = document.getElementById('productQtyCapsuleMobile');
        const desktopAddToCartBtn = document.getElementById('mainAddToCartBtn');
        const mobileAddToCartWrapper = document.querySelector('.product-mobile-cart-btn-wrapper');

        const activeVariant = document.querySelector('.product-variant-pill.active .var-weight');
        const selectedSize = activeVariant ? activeVariant.textContent : '250g';
        const normalizedSize = cartService.normalizeSize(selectedSize);

        const cartItems = cartService.getCart();
        const existingItem = cartItems.find(item => item.id === product.id && item.size === normalizedSize);
        const qtyInCart = existingItem ? existingItem.quantity : 0;

        if (qtyInCart > 0) {
            if (desktopCapsule) {
                desktopCapsule.style.display = 'flex';
                const valEl = desktopCapsule.querySelector('.product-qty-val');
                if (valEl) valEl.textContent = qtyInCart;
            }
            if (mobileCapsule) {
                mobileCapsule.style.display = 'flex';
                const valEl = mobileCapsule.querySelector('.product-qty-val');
                if (valEl) valEl.textContent = qtyInCart;
            }
            if (desktopAddToCartBtn) {
                desktopAddToCartBtn.style.display = 'none';
            }
            if (mobileAddToCartWrapper) {
                mobileAddToCartWrapper.style.display = 'none';
            }
        } else {
            if (desktopCapsule) {
                desktopCapsule.style.display = 'none';
                const valEl = desktopCapsule.querySelector('.product-qty-val');
                if (valEl) valEl.textContent = 1;
            }
            if (mobileCapsule) {
                mobileCapsule.style.display = 'none';
                const valEl = mobileCapsule.querySelector('.product-qty-val');
                if (valEl) valEl.textContent = 1;
            }
            if (desktopAddToCartBtn) {
                desktopAddToCartBtn.style.display = '';
            }
            if (mobileAddToCartWrapper) {
                mobileAddToCartWrapper.style.display = '';
            }
        }
        syncProductDetails(product);
        updateGoToCartFloat(product);
    }

    function updateGoToCartFloat(product) {
        const floatEl = document.getElementById('mobileGoToCartFloat');
        if (!floatEl) return;

        const cartItems = cartService.getCart();
        const productCount = cartItems.length;

        if (productCount > 0) {
            floatEl.style.display = 'flex';
            const countEl = document.getElementById('floatCartCount');
            if (countEl) countEl.textContent = productCount;

            // Set product image dynamically
            const floatImg = document.getElementById('floatCartImg');
            if (floatImg) {
                const mainImage = document.getElementById('mainImage');
                if (mainImage && mainImage.src) {
                    floatImg.src = mainImage.src;
                }
            }
        } else {
            floatEl.style.display = 'none';
        }
    }

    function syncProductDetails(product) {
        const currentQuantity = getProductQuantity();

        const activeVariant = document.querySelector('.product-variant-pill.active .var-weight');
        const selectedSize = activeVariant ? activeVariant.textContent : '250g';
        
        const variantData = getVariantPrice(product, selectedSize);
        const totalPrice = variantData.price * currentQuantity;
        let totalOriginalPrice = variantData.originalPrice ? variantData.originalPrice * currentQuantity : null;
        
        updatePriceDisplay(totalPrice, totalOriginalPrice);

        const mobileUnit = document.getElementById('mobileUnitVal');
        if (mobileUnit) mobileUnit.textContent = `${currentQuantity} x ${selectedSize}`;
    }

    function setupVariants(product) {
        const optionsContainer = document.getElementById('variantOptions');
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';

        const getLegacyPriceForSize = (basePrice, size) => {
            const bp = parseFloat(basePrice) || 0;
            if (!size) return bp;
            const s = size.toLowerCase().replace(/\s+/g, '').replace('gm', 'g');
            if (s.includes('500g')) return bp * 2;
            if (s.includes('1kg')) return bp * 4;
            if (s.includes('2kg')) return bp * 8;
            return bp * 1;
        };

        let variants = [];
        if (product.variants && product.variants.length > 0) {
            // Filter out variants that have empty weight or invalid price
            variants = product.variants.filter(v => v && v.weight && typeof v.weight === 'string' && v.weight.trim() !== '' && parseFloat(v.price) > 0);
        } else if (product.quantities_available && product.quantities_available.length > 0) {
            // Filter out empty/invalid quantities
            variants = product.quantities_available
                .filter(q => q && typeof q === 'string' && q.trim() !== '')
                .map(q => {
                    const price = getLegacyPriceForSize(product.price || 0, q);
                    const originalPrice = product.originalPrice ? getLegacyPriceForSize(product.originalPrice, q) : null;
                    return { weight: q, price, originalPrice };
                });
        }

        // If no variants defined anywhere, create one based on base product properties
        if (variants.length === 0) {
            variants = [{
                weight: product.weight || '250g',
                price: product.price || 0,
                originalPrice: product.originalPrice || null
            }];
        }

        variants.forEach((v, index) => {
            const normalizedQty = cartService.normalizeSize(v.weight);
            const priceNum = parseFloat(v.price) || 0;
            const origPriceNum = parseFloat(v.originalPrice) || 0;
            const discountPercent = (origPriceNum > priceNum) ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) : 0;
            const hasDiscount = discountPercent > 0;

            const btn = document.createElement('div');
            btn.className = `product-variant-pill ${index === 0 ? 'active' : ''} ${hasDiscount ? 'has-discount' : ''}`;
            btn.dataset.price = v.price;
            btn.dataset.originalPrice = v.originalPrice;
            
            let html = '';
            if (hasDiscount) {
                html += `<div class="var-discount-tag">Save ${discountPercent}%</div>`;
            }
            html += `<div class="var-weight-box"><span class="var-weight">${normalizedQty}</span></div>`;

            btn.innerHTML = html;

            btn.addEventListener('click', function () {
                optionsContainer.querySelectorAll('.product-variant-pill').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateQtyAndCartUI(product);
            });
            optionsContainer.appendChild(btn);
        });
        
        // Initial sync to set price for the first active variant
        updateQtyAndCartUI(product);
    }

    function setupQuantitySelector(product) {
        const desktopCapsule = document.getElementById('productQtyCapsule');
        const mobileCapsule = document.getElementById('productQtyCapsuleMobile');

        const updateCartQty = async (change) => {
            const activeVariant = document.querySelector('.product-variant-pill.active .var-weight');
            const selectedSize = activeVariant ? activeVariant.textContent : '250g';
            const normalizedSize = cartService.normalizeSize(selectedSize);

            const cartItems = cartService.getCart();
            const existingItem = cartItems.find(item => item.id === product.id && item.size === normalizedSize);
            
            if (existingItem) {
                const newQty = existingItem.quantity + change;
                if (newQty <= 0) {
                    await cartService.removeFromCart(product.id, selectedSize);
                } else {
                    if (newQty > 10) return;
                    await cartService.updateQuantity(product.id, selectedSize, newQty);
                }
                if (typeof cartService.notifyListeners === 'function') {
                    cartService.notifyListeners();
                }
            }
        };

        const setupCapsuleEvents = (capsule) => {
            if (!capsule) return;
            const minusBtn = capsule.querySelector('.minus');
            const plusBtn = capsule.querySelector('.plus');

            if (!minusBtn || !plusBtn) return;

            minusBtn.addEventListener('click', () => {
                updateCartQty(-1);
            });

            plusBtn.addEventListener('click', () => {
                updateCartQty(1);
            });
        };

        setupCapsuleEvents(desktopCapsule);
        setupCapsuleEvents(mobileCapsule);
    }

    async function handleBuyNow(product) {
        const size = document.querySelector('.product-variant-pill.active .var-weight')?.textContent || '250g';
        const qty = getProductQuantity();
        
        const buyNowData = {
            id: product.id,
            name: product.name,
            shortTitle: product.shortTitle,
            price: product.price,
            images: product.images,
            category: product.category,
            size: size,
            qty: qty
        };
        
        sessionStorage.setItem('buyNowData', JSON.stringify(buyNowData));
        window.location.href = 'cart.html?buyNow=true';
    }

    function setupActionButtons(product) {
        const mainAddToCartBtn = document.getElementById('mainAddToCartBtn');
        const mobileAddToCartBtn = document.getElementById('mobileAddToCartBtn');
        const wishlistBtn = document.getElementById('imageWishlistBtn');

        const handleAddToCart = async () => {
            const size = document.querySelector('.product-variant-pill.active .var-weight')?.textContent || '250g';
            try {
                await cartService.addToCart(product, 1, size);
                if (typeof cartService.notifyListeners === 'function') {
                    cartService.notifyListeners();
                }
            } catch (error) {
                console.error("Error adding to cart:", error);
            }
        };

        if (mainAddToCartBtn) {
            mainAddToCartBtn.addEventListener('click', handleAddToCart);
        }
        if (mobileAddToCartBtn) {
            mobileAddToCartBtn.addEventListener('click', handleAddToCart);
        }

        document.getElementById('mainBuyNowBtn')?.addEventListener('click', () => handleBuyNow(product));
        document.getElementById('mobileBuyNowBtn')?.addEventListener('click', () => handleBuyNow(product));

        // Wishlist toggle
        if (wishlistBtn) {
            const updateWishlistUI = () => {
                const inWishlist = wishlistService.isInWishlist(product.id);
                const icon = wishlistBtn.querySelector('i');
                if (inWishlist) {
                    icon.className = 'fas fa-heart';
                    wishlistBtn.classList.add('active');
                } else {
                    icon.className = 'far fa-heart';
                    wishlistBtn.classList.remove('active');
                }
            };

            updateWishlistUI();

            wishlistBtn.addEventListener('click', async () => {
                try {
                    await wishlistService.toggleWishlist(product.id);
                    updateWishlistUI();
                } catch (error) {
                    console.error("Error toggling wishlist:", error);
                }
            });
        }
    }

    function setupFixedActionBar(product) {
        // Redundant with new design
    }

    function setupImageZoom() {
        const container = document.getElementById('zoomContainer');
        const img = document.getElementById('mainImage');
        
        if (!container || !img) return;
        
        const isZoomEnabled = () => window.innerWidth >= 1024;

        container.addEventListener('mousemove', function(e) {
            if (!isZoomEnabled()) return;
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = 'scale(2.2)';
        });
        
        container.addEventListener('mouseleave', function() {
            img.style.transform = 'scale(1)';
            img.style.transformOrigin = 'center center';
        });
    }

    function setupAdditionalInteractions() {
        const copyBtn = document.getElementById('inlineCopyCouponBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const couponCode = 'MAHARAJA50';
                const originalHTML = copyBtn.innerHTML;
                
                const performCopyFeedback = () => {
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(couponCode).then(performCopyFeedback);
                }
            });
        }

        const ratingSummary = document.getElementById('productRatingSummary');
        if (ratingSummary) {
            ratingSummary.addEventListener('click', function () {
                const reviewsSection = document.querySelector('.reviews-section');
                if (reviewsSection) reviewsSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    function syncQuantity(value) {
    }

    function updateTotalPrice(basePrice, quantity, baseOriginalPrice = null) {
    }

    function setupThumbnails() {
    }

// --- DYNAMIC REVIEWS & STAR RATINGS ---
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

function updateSchemaSEO(product, avgRating, totalReviews, reviewsList) {
    let schemaScript = document.querySelector('script[type="application/ld+json"]');
    if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
    }

    const reviewsArray = reviewsList.map(r => ({
        "@type": "Review",
        "author": {
            "@type": "Person",
            "name": r.userName
        },
        "reviewRating": {
            "@type": "Rating",
            "ratingValue": String(r.rating)
        },
        "reviewBody": r.reviewText
    }));

    const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": product.images ? Object.values(product.images) : [],
        "description": product.seoLongDescription || product.description || "",
        "brand": {
            "@type": "Brand",
            "name": "Maharaja Dry Fruits"
        },
        "category": `Dry Fruits > ${product.category || ""}`,
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "INR",
            "lowPrice": String(product.price || 0),
            "highPrice": String(product.originalPrice || product.price || 0),
            "offerCount": "1",
            "availability": "https://schema.org/InStock"
        }
    };

    if (totalReviews > 0) {
        schemaData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": String(avgRating),
            "reviewCount": String(totalReviews),
            "bestRating": "5",
            "worstRating": "1"
        };
        schemaData.review = reviewsArray;
    }

    schemaScript.textContent = JSON.stringify(schemaData, null, 4);
}

async function loadReviewsList(productId, product) {
    const reviewsContainer = document.getElementById('dynamicReviewsContainer');
    const avgRatingNumber = document.getElementById('avgRatingNumber');
    const avgStarsDisplay = document.getElementById('avgStarsDisplay');
    const totalReviewsCountText = document.getElementById('totalReviewsCountText');

    const summaryStars = document.getElementById('productStarsSummary');
    const summaryAvg = document.getElementById('productAvgRatingVal');
    const summaryCount = document.getElementById('productReviewCountVal');

    if (!reviewsContainer) return;

    try {
        const q = query(
            collection(db, "reviews"),
            where("productId", "==", productId)
        );
        const querySnapshot = await withTimeout(getDocs(q));

        const reviews = [];
        let ratingSum = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            reviews.push(data);
            ratingSum += (data.rating || 0);
        });

        // Sort reviews by timestamp descending in-memory to bypass composite index requirements
        reviews.sort((a, b) => {
            const tA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 0;
            const tB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 0;
            return tB - tA;
        });

        const count = reviews.length;
        const avgRating = count > 0 ? parseFloat((ratingSum / count).toFixed(1)) : 0.0;

        // Update Summary Card
        if (avgRatingNumber) avgRatingNumber.textContent = avgRating.toFixed(1);
        if (avgStarsDisplay) avgStarsDisplay.innerHTML = renderStarsHTML(avgRating);
        if (totalReviewsCountText) totalReviewsCountText.textContent = `Based on ${count} ${count === 1 ? 'review' : 'reviews'}`;

        // Update Radial Progress Offset
        const ratingRadialProgress = document.getElementById('ratingRadialProgress');
        if (ratingRadialProgress) {
            const circumference = 314.16; // 2 * Math.PI * 50
            const offset = circumference - (circumference * (avgRating / 5));
            ratingRadialProgress.style.strokeDashoffset = offset;
        }

        // Update Product Title Rating summary
        if (summaryAvg) summaryAvg.textContent = avgRating.toFixed(1);
        if (summaryStars) summaryStars.innerHTML = renderStarsHTML(avgRating);
        if (summaryCount) summaryCount.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;

        // Update Rating Breakdown Bars
        const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => { const s = Math.round(r.rating); if (starCounts[s] !== undefined) starCounts[s]++; });
        [5, 4, 3, 2, 1].forEach(star => {
            const row = document.querySelector(`.rating-bar-row[data-star="${star}"]`);
            if (!row) return;
            const fill = row.querySelector('.rating-bar-fill');
            const countEl = row.querySelector('.bar-count');
            const pct = count > 0 ? Math.round((starCounts[star] / count) * 100) : 0;
            if (fill) fill.style.width = pct + '%';
            if (countEl) countEl.textContent = starCounts[star];
        });

        // Avatar color palette
        const avatarColors = ['#e74c3c', '#9b59b6', '#2ecc71', '#3498db', '#e67e22', '#1abc9c', '#e91e63', '#ff5722', '#607d8b', '#795548'];
        const getAvatarColor = (name) => {
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            return avatarColors[Math.abs(hash) % avatarColors.length];
        };

        // Render Reviews Grid
        if (count === 0) {
            reviewsContainer.style.display = 'none';
        } else {
            reviewsContainer.style.display = 'grid';
            reviewsContainer.innerHTML = reviews.map((review, idx) => {
                let formattedDate = 'Just now';
                if (review.timestamp) {
                    try {
                        const dateObj = review.timestamp.toDate ? review.timestamp.toDate() : new Date(review.timestamp);
                        formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    } catch (e) { console.error(e); }
                }
                const name = review.userName || 'Customer';
                const initial = name.charAt(0).toUpperCase();
                const color = getAvatarColor(name);
                const ratingVal = Math.round(review.rating || 0);
                return `
                        <div class="product-review-card review-card" data-rating="${ratingVal}" style="animation-delay:${idx * 0.05}s">
                            <div class="product-review-header">
                                <div class="product-review-user">
                                    <div class="product-review-avatar" style="background-color: ${color};">${initial}</div>
                                    <div class="product-review-info">
                                        <div class="product-review-name">
                                            ${name}
                                            ${review.verifiedBuyer ? '<span class="product-verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
                                        </div>
                                        <div class="product-review-date">${formattedDate}</div>
                                    </div>
                                </div>
                                <div class="product-review-rating">${renderStarsHTML(review.rating)}</div>
                            </div>
                            ${review.reviewTitle ? `<h4 class="product-review-title">${review.reviewTitle}</h4>` : ''}
                            <p class="product-review-body">${review.reviewText}</p>
                            <div class="product-review-footer">
                                <button class="product-helpful-btn review-helpful-btn" aria-label="Mark as helpful">
                                    <i class="far fa-thumbs-up"></i> Helpful (<span class="product-helpful-count helpful-count">0</span>)
                                </button>
                            </div>
                        </div>
                    `;
            }).join('');
        }

        // Update Structured SEO Data dynamically
        updateSchemaSEO(product, avgRating, count, reviews);

        // Sync aggregate rating and review count back to product document in Firestore
        try {
            await updateDoc(doc(db, "products", productId), {
                averageRating: avgRating,
                reviewCount: count
            });
            console.log(`Synced rating aggregate for product ${productId}: average = ${avgRating}, count = ${count}`);
        } catch (syncErr) {
            console.warn("Unable to sync product aggregate rating fields (might be due to permission rules):", syncErr);
        }

    } catch (err) {
        console.error("Error loading reviews:", err);
        if (reviewsContainer) {
            reviewsContainer.innerHTML = `<p style="color: red; text-align: center; grid-column: 1 / -1;">Failed to load customer reviews.</p>`;
        }
    }
}

function renderReviewForm(product, user, isVerifiedBuyer) {
    const formContainer = document.getElementById('addReviewFormContainer');
    if (!formContainer) return;

    formContainer.innerHTML = `
            <form id="addReviewForm" style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
                <h3 style="font-size: 1.1rem; margin-bottom: 2px; font-weight: 600; color: #323232;">Write a Customer Review</h3>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-weight: 600; font-size: 14px; color: #555;">Your Rating:</span>
                    <div class="star-rating-selector" style="font-size: 1.6rem; color: #ccc; cursor: pointer; display: flex; gap: 6px;">
                        <i class="far fa-star star-select" data-rating="1" style="transition: color 0.2s;"></i>
                        <i class="far fa-star star-select" data-rating="2" style="transition: color 0.2s;"></i>
                        <i class="far fa-star star-select" data-rating="3" style="transition: color 0.2s;"></i>
                        <i class="far fa-star star-select" data-rating="4" style="transition: color 0.2s;"></i>
                        <i class="far fa-star star-select" data-rating="5" style="transition: color 0.2s;"></i>
                    </div>
                    <input type="hidden" id="reviewRatingInput" required value="">
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <textarea id="reviewTextInput" placeholder="Describe the freshness, taste, size, or packaging..." required rows="3" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; resize: none; font-family: inherit; font-size: 13.5px;"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 10px 24px; font-size: 13.5px; border-radius: 8px; background: #fc6e20; color: white; border: none; font-weight: 600; cursor: pointer; transition: background 0.2s;">Submit Review</button>
            </form>
        `;

    // Star interactive selector logic
    const stars = formContainer.querySelectorAll('.star-select');
    const ratingInput = document.getElementById('reviewRatingInput');

    stars.forEach(star => {
        star.addEventListener('click', function () {
            const selectedRating = parseInt(this.dataset.rating);
            ratingInput.value = selectedRating;

            stars.forEach(s => {
                const r = parseInt(s.dataset.rating);
                if (r <= selectedRating) {
                    s.className = 'fas fa-star star-select';
                    s.style.color = '#ffc107';
                } else {
                    s.className = 'far fa-star star-select';
                    s.style.color = '#ccc';
                }
            });
        });

        // Hover effects
        star.addEventListener('mouseover', function () {
            const hoverRating = parseInt(this.dataset.rating);
            stars.forEach(s => {
                const r = parseInt(s.dataset.rating);
                if (r <= hoverRating) {
                    s.style.color = '#ffb300';
                } else {
                    s.style.color = '#ccc';
                }
            });
        });

        star.addEventListener('mouseout', function () {
            const currentRating = parseInt(ratingInput.value) || 0;
            stars.forEach(s => {
                const r = parseInt(s.dataset.rating);
                if (r <= currentRating) {
                    s.style.color = '#ffc107';
                    s.className = 'fas fa-star star-select';
                } else {
                    s.style.color = '#ccc';
                    s.className = 'far fa-star star-select';
                }
            });
        });
    });

    // Form submission
    const form = document.getElementById('addReviewForm');
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const rating = parseInt(ratingInput.value);
        const reviewText = document.getElementById('reviewTextInput').value.trim();

        if (!rating || rating < 1 || rating > 5) {
            alert("Please select a star rating (1 to 5) before submitting your review.");
            return;
        }

        if (!reviewText) {
            alert("Please enter some review comments.");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            let userName = user.displayName || user.email.split('@')[0];
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const firstName = userData.firstName || '';
                    const lastName = userData.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (fullName) userName = fullName;
                }
            } catch (e) {
                console.error("Error reading user name:", e);
            }

            const reviewData = {
                productId: product.id,
                userId: user.uid,
                userName: userName,
                rating: rating,
                reviewText: reviewText,
                timestamp: serverTimestamp(),
                verifiedBuyer: isVerifiedBuyer
            };

            await addDoc(collection(db, "reviews"), reviewData);

            alert("Thank you! Your review has been submitted successfully.");

            // Reload review list
            await loadReviewsList(product.id, product);

            // Reset form
            ratingInput.value = '';
            document.getElementById('reviewTextInput').value = '';
            stars.forEach(s => {
                s.className = 'far fa-star star-select';
                s.style.color = '#ccc';
            });

            // Close review drawer
            const drawer = document.getElementById('reviewDrawer');
            const backdrop = document.getElementById('reviewDrawerBackdrop');
            if (drawer && backdrop) {
                drawer.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }

        } catch (err) {
            console.error("Error submitting review:", err);
            alert("Failed to submit review. Please try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Review';
        }
    });
}

async function initReviews(product) {
    const productId = product.id;
    const reviewsContainer = document.getElementById('dynamicReviewsContainer');
    const formContainer = document.getElementById('addReviewFormContainer');

    if (!reviewsContainer || !formContainer) return;

    // Load reviews list and update summary
    await loadReviewsList(productId, product);

    // Setup review form based on auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check if email is verified
            if (user.emailVerified) {
                // Check if they are a verified buyer of this product
                let verifiedBuyer = false;
                try {
                    const userSnap = await getDoc(doc(db, "users", user.uid));
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const orders = userData.orders || [];
                        verifiedBuyer = orders.some(order =>
                            order.items && order.items.some(item => item.id === productId)
                        );
                    }
                } catch (err) {
                    console.error("Error checking verified buyer status:", err);
                }

                renderReviewForm(product, user, verifiedBuyer);
            } else {
                formContainer.innerHTML = `
                        <div style="text-align: center; padding: 15px; color: #555; background: #fff8f8; border-radius: 8px; border: 1px solid #ffe5e5; font-size: 14px;">
                            <p style="margin: 0 0 6px 0; font-weight: 700; color: #d9534f;"><i class="fas fa-envelope-open-text" style="margin-right: 5px;"></i> Email Verification Required</p>
                            <p style="font-size: 12px; color: #777; margin: 0 0 10px 0;">Please verify your email address to submit reviews.</p>
                            <a href="profile.html" class="btn btn-primary" style="padding: 6px 15px; font-size: 12px; text-decoration: none; border-radius: 5px; background: #fc6e20; color: white; display: inline-block;">Go to Profile to Verify</a>
                        </div>
                    `;
            }
        } else {
            formContainer.innerHTML = `
                    <div style="text-align: center; padding: 15px; color: #555; background: #fafafa; border-radius: 8px; border: 1px dashed #ccc; font-size: 14px;">
                        <p style="margin: 0 0 6px 0; font-weight: 700;"><i class="fas fa-lock" style="margin-right: 5px;"></i> Sign In Required</p>
                        <p style="font-size: 12px; color: #777; margin: 0 0 10px 0;">Only logged-in customers can write reviews.</p>
                        <a href="login.html" class="btn btn-primary" style="padding: 6px 15px; font-size: 12px; text-decoration: none; border-radius: 5px; background: #fc6e20; color: white; display: inline-block;">Log In / Register</a>
                    </div>
                `;
        }
    });
}

// Initialize if product section exists
if (productSection) {
    initProduct();
}
});

async function renderSimilarProducts(product, currentProductId) {
    const similarGrid = document.querySelector('.similar-products-section .product-grid');
    if (!similarGrid) return;

    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Fetch all products from Firestore
        const querySnapshot = await withTimeout(getDocs(collection(db, "products")));
        const candidates = [];
        
        querySnapshot.forEach((doc) => {
            if (doc.id !== currentProductId) {
                candidates.push({ id: doc.id, ...doc.data() });
            }
        });

        const currentTags = product.tags || [];
        const currentCategory = product.category;

        // Score products based on category matching and tag overlapping similarity
        const scored = candidates.map(c => {
            let score = 0;
            if (c.category === currentCategory) {
                score += 10;
            }
            if (c.tags && Array.isArray(c.tags)) {
                c.tags.forEach(t => {
                    if (currentTags.includes(t)) {
                        score += 5;
                    }
                });
            }
            return { product: c, score };
        });

        // Sort scored products by score in descending order
        scored.sort((a, b) => b.score - a.score);

        // Slice top 8 products (minimum 8 products)
        const finalProducts = scored.slice(0, 8).map(item => item.product);

        similarGrid.innerHTML = '';

        finalProducts.forEach(prod => {
            const cardHtml = createProductCard(prod);
            const wrapper = document.createElement('div');
            wrapper.className = 'product-card-wrapper';
            wrapper.innerHTML = cardHtml;
            similarGrid.appendChild(wrapper);
        });

    } catch (error) {
        console.error("Error rendering similar products:", error);
    }
}


// Export for use in main navigation
window.showProductSection = function () {
    const homeSection = document.querySelector('.home-section');
    const searchSection = document.querySelector('.search-section');
    const productSection = document.querySelector('.product-main, .product-section');
    const cartSection = document.querySelector('.cart-section');
    const profileSection = document.querySelector('.profile-section');
    const contactSection = document.querySelector('.contact-section');
    const aboutSection = document.querySelector('.about-section');

    if (homeSection) homeSection.style.display = 'none';
    if (searchSection) searchSection.style.display = 'none';
    if (productSection) productSection.style.display = 'block';
    if (cartSection) cartSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (contactSection) contactSection.style.display = 'none';
    if (aboutSection) aboutSection.style.display = 'none';
};

// Fixed action bar visibility is now handled by IntersectionObserver in product-ux.js
