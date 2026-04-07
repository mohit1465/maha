// Product Section Functionality
// Product Section Functionality
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createProductCard } from './card-renderer.js';
import cartService from './cart-service.js';
import router from './router.js';

document.addEventListener('DOMContentLoaded', async function () {
    const productSection = document.querySelector('.product-section');

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
            document.querySelector('.product-container').innerHTML = '<div class="error-msg">No product ID provided</div>';
            return;
        }

        try {
            console.log('Fetching product from Firebase with ID:', productId);
            const docRef = doc(db, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const product = docSnap.data();
                console.log('Product loaded successfully:', product);
                
                // Update page title and meta description for SEO
                updatePageSeo(product);
                
                populateProductDetails(product);
                setupThumbnails();
                setupVariants(product);
                setupQuantitySelector(product);
                setupActionButtons(product);
                setupFixedActionBar(product);

                // Load similar products
                renderSimilarProducts(product.category, productId);

                // Update breadcrumb
                const currentBreadcrumb = document.querySelector('.breadcrumb-item.current');
                if (currentBreadcrumb) currentBreadcrumb.textContent = product.name;
            } else {
                console.log("No such product!");
                document.querySelector('.product-container').innerHTML = '<div class="error-msg">Product not found</div>';
            }
        } catch (error) {
            console.error("Error getting document:", error);
            document.querySelector('.product-container').innerHTML = '<div class="error-msg">Error loading product</div>';
        }
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
     * Generate SEO-optimized product description
     */
    function generateSeoDescription(product) {
        const benefits = product.benefits || 'Rich in nutrients and perfect for healthy snacking';
        const priceInfo = product.price ? `Available at just ₹${product.price}` : 'Available at best price';
        return `Experience the richness of ${product.name.toLowerCase()}, carefully selected for freshness and taste. ${benefits}. ${priceInfo}. Multiple sizes available. Order now and enjoy farm-fresh quality delivered to your doorstep.`;
    }

    function populateProductDetails(product) {
        // Title - Use shortTitle if available, otherwise use full name
        const titleElement = document.querySelector('.product-title');
        if (product.shortTitle) {
            titleElement.textContent = product.shortTitle;
        } else {
            titleElement.textContent = product.name;
        }
        
        // Category
        document.querySelector('.product-category').textContent = product.category;
        // Price
        updatePriceDisplay(product.price);

        // Description - Use the SEO long description if available, fallback to short description
        const descElement = document.querySelector('.product-description');
        if (product.longDescription) {
            descElement.innerHTML = product.longDescription.replace(/\n/g, '<br>');
        } else if (product.shortDescription) {
            descElement.textContent = product.shortDescription;
        } else if (product.hindiName) {
            descElement.innerHTML = '<strong>' + product.hindiName + '</strong><br>Premium quality ' + product.category.toLowerCase() + '.';
        } else {
            descElement.textContent = 'Premium quality ' + product.category.toLowerCase() + '.';
        }

        // Images
        const mainImage = document.getElementById('mainImage');
        const thumbnailsContainer = document.querySelector('.thumbnail-column');

        // Clear existing static thumbnails
        thumbnailsContainer.innerHTML = '';

        if (product.images) {
            const imageKeys = Object.keys(product.images);

            // Set main image
            if (imageKeys.length > 0) {
                const firstImgUrl = product.images[imageKeys[0]];
                mainImage.style.backgroundImage = `url('${firstImgUrl}')`;
                mainImage.style.backgroundSize = 'contain';
                mainImage.style.backgroundRepeat = 'no-repeat';
                mainImage.style.backgroundPosition = 'center';
            }

            // Create thumbnails
            imageKeys.forEach((key, index) => {
                const imgUrl = product.images[key];
                const thumb = document.createElement('div');
                thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                thumb.dataset.image = key;
                thumb.innerHTML = `<div class="thumbnail-image" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center;"></div>`;

                thumb.addEventListener('click', function () {
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    mainImage.style.backgroundImage = `url('${imgUrl}')`;
                });

                thumbnailsContainer.appendChild(thumb);
            });
        }
    }

    function updatePriceDisplay(price) {
        const priceElements = document.querySelectorAll('.product-price, .action-bar-product-price, .mobile-product-price');
        priceElements.forEach(element => {
            element.innerHTML = `<label>Just At </label>₹ ${price.toLocaleString('en-IN')} INR`;
        });
    }

    // Setup fixed action bar functionality
    function setupFixedActionBar(product) {
        const fixedBar = document.querySelector(".fixed-action-bar");
        if (!fixedBar) return;

        // Update product info in fixed bar
        document.querySelector('.action-bar-product-name').textContent = product.name;
        document.querySelector('.mobile-product-name').textContent = product.name;

        // Fixed action bar quantity selector
        const actionBarMinusBtn = document.querySelector('.action-bar-quantity-btn.minus');
        const actionBarPlusBtn = document.querySelector('.action-bar-quantity-btn.plus');
        const actionBarQuantityInput = document.querySelector('.action-bar-quantity-input');

        if (actionBarMinusBtn && actionBarPlusBtn && actionBarQuantityInput) {
            // Clone and replace to remove old listeners if any
            const newMinus = actionBarMinusBtn.cloneNode(true);
            const newPlus = actionBarPlusBtn.cloneNode(true);
            actionBarMinusBtn.parentNode.replaceChild(newMinus, actionBarMinusBtn);
            actionBarPlusBtn.parentNode.replaceChild(newPlus, actionBarPlusBtn);

            newMinus.addEventListener('click', function () {
                const currentValue = parseInt(actionBarQuantityInput.value);
                if (currentValue > 1) {
                    const newValue = currentValue - 1;
                    actionBarQuantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                }
            });

            newPlus.addEventListener('click', function () {
                const currentValue = parseInt(actionBarQuantityInput.value);
                if (currentValue < 10) {
                    const newValue = currentValue + 1;
                    actionBarQuantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                }
            });
        }

        // Scroll animation
        fixedBar.style.transform = "translateY(100%)";
        fixedBar.style.transition = "transform 0.3s ease-in-out";

        window.addEventListener("scroll", function () {
            const scrollY = window.scrollY || document.documentElement.scrollTop;

            if (scrollY > 300) {
                fixedBar.style.transform = "translateY(0)";
            } else {
                fixedBar.style.transform = "translateY(100%)";
            }
        });
    }

    function syncQuantity(value) {
        const inputs = document.querySelectorAll('.quantity-input, .action-bar-quantity-input, .mobile-quantity-input');
        inputs.forEach(input => input.value = value);
    }

    function updateTotalPrice(basePrice, quantity) {
        const total = basePrice * quantity;
        updatePriceDisplay(total);
    }

    // Setup thumbnail functionality
    function setupThumbnails() {
        // Already handled in populateProductDetails
    }

    // Setup variant selectors
    function setupVariants(product) {
        const variantGroups = document.querySelectorAll('.variant-group');
        const sizeContainer = variantGroups[0];

        if (sizeContainer && product.quantities_available) {
            const optionsContainer = sizeContainer.querySelector('.variant-options');
            optionsContainer.innerHTML = '';

            product.quantities_available.forEach((qty, index) => {
                const btn = document.createElement('button');
                btn.className = `variant-btn ${index === 0 ? 'active' : ''}`;
                btn.textContent = qty;

                btn.addEventListener('click', function () {
                    optionsContainer.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                    const scaledPrice = cartService.getPriceForSize(product.price, qty);
                    updateTotalPrice(scaledPrice, quantity);
                });

                optionsContainer.appendChild(btn);
            });

            // Hide other dummy variants for now
            for (let i = 1; i < variantGroups.length; i++) {
                variantGroups[i].style.display = 'none';
            }
        }
    }

    // Setup quantity selector
    function setupQuantitySelector(product) {
        const minusBtn = document.querySelector('.quantity-section .quantity-btn.minus');
        const plusBtn = document.querySelector('.quantity-section .quantity-btn.plus');
        const quantityInput = document.querySelector('.quantity-section .quantity-input');

        if (minusBtn && plusBtn && quantityInput) {
            // Replace to clear listeners
            const newMinus = minusBtn.cloneNode(true);
            const newPlus = plusBtn.cloneNode(true);
            minusBtn.parentNode.replaceChild(newMinus, minusBtn);
            plusBtn.parentNode.replaceChild(newPlus, plusBtn);

            newMinus.addEventListener('click', function () {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    const newValue = currentValue - 1;
                    quantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                }
            });

            newPlus.addEventListener('click', function () {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue < 10) {
                    const newValue = currentValue + 1;
                    quantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                }
            });
        }
    }

    // Setup action buttons
    function setupActionButtons(product) {
        const addToCartBtns = document.querySelectorAll('.btn-primary, .action-bar-btn-primary, .add-to-cart-btn, .mobile-add-to-cart-btn');

        addToCartBtns.forEach(btn => {
            // Replace to clear
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async function () {
                const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                const size = document.querySelector('.variant-btn.active')?.textContent || '250g';

                await cartService.addToCart(product, quantity, size);

                // Show success feedback
                const originalText = this.innerHTML;
                const originalBg = this.style.backgroundColor;

                this.innerHTML = '<i class="fas fa-check"></i> Added';
                this.style.backgroundColor = '#4CAF50';

                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.backgroundColor = originalBg;
                }, 2000);
            });
        });
    }

    // Initialize if product section exists
    if (productSection) {
        initProduct();
    }
});

async function renderSimilarProducts(category, currentProductId) {
    const similarGrid = document.querySelector('.similar-products-section .product-grid');
    if (!similarGrid) return;

    try {
        const { collection, query, where, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Fetch products from same category, excluding current product
        const q = query(
            collection(db, "products"),
            where("category", "==", category),
            limit(5)
        );

        const querySnapshot = await getDocs(q);
        const similarProducts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (doc.id !== currentProductId) {
                similarProducts.push({ id: doc.id, ...data });
            }
        });

        // If not enough similar products, fetch some random ones
        if (similarProducts.length < 4) {
            const allQ = query(collection(db, "products"), limit(6));
            const allSnapshot = await getDocs(allQ);
            allSnapshot.forEach((doc) => {
                if (doc.id !== currentProductId && !similarProducts.find(p => p.id === doc.id)) {
                    similarProducts.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        similarGrid.innerHTML = '';

        similarProducts.slice(0, 4).forEach(product => {
            const cardHtml = createProductCard(product);
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
    const productSection = document.querySelector('.product-section');
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

document.addEventListener("DOMContentLoaded", function () {
    const fixedBar = document.querySelector(".fixed-action-bar");

    if (!fixedBar) return;

    // Hide initially and prepare for animation
    fixedBar.style.transform = "translateY(100%)";
    fixedBar.style.transition = "transform 0.3s ease-in-out";

    window.addEventListener("scroll", function () {
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        if (scrollY > 300) {
            // Show with slide up animation
            fixedBar.style.transform = "translateY(0)";
        } else {
            // Hide with slide down animation
            fixedBar.style.transform = "translateY(100%)";
        }
    });
});
