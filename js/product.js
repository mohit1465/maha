// Product Section Functionality
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createProductCard } from './card-renderer.js';
import cartService from './cart-service.js';
import router from './router.js';
import { getProductImageUrl, getAllProductImages } from './image-helper.js';

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
                setupImageZoom();
                setupAdditionalInteractions();

                // Load similar products
                renderSimilarProducts(product.category, productId);

                // Update breadcrumb
                const breadcrumbCurrent = document.querySelector('.breadcrumb-item.current');
                if (breadcrumbCurrent) {
                    breadcrumbCurrent.textContent = product.shortTitle || product.name;
                }
                initReviews(product);
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
     * Format the long description nicely for UX
     */
    function formatLongDescription(text) {
        if (!text) return '';
        
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
     * Generate SEO-optimized product description
     */
    function generateSeoDescription(product) {
        const benefits = product.benefits || 'Rich in nutrients and perfect for healthy snacking';
        const priceInfo = product.price ? `Available at just ₹${product.price}` : 'Available at best price';
        return `Experience the richness of ${product.name.toLowerCase()}, carefully selected for freshness and taste. ${benefits}. ${priceInfo}. Multiple sizes available. Order now and enjoy farm-fresh quality delivered to your doorstep.`;
    }

    function populateProductDetails(product) {
        // Title - Use full name for product page title (SEO title)
        const titleElement = document.querySelector('.product-title');
        titleElement.textContent = product.name;
        
        // Category
        document.querySelector('.product-category').textContent = product.category;
        
        // Sync mobile fixed action bar details
        syncProductDetails(product);

        // Description - Use the SEO long description if available, fallback to short description
        const descElement = document.querySelector('.product-description');
        if (product.longDescription) {
            descElement.innerHTML = formatLongDescription(product.longDescription);
        } else if (product.shortDescription) {
            descElement.textContent = product.shortDescription;
        } else if (product.hindiName) {
            descElement.innerHTML = '<strong>' + product.hindiName + '</strong><br>Premium quality ' + product.category.toLowerCase() + '.';
        } else {
            descElement.textContent = 'Premium quality ' + product.category.toLowerCase() + '.';
        }

        // Images - Use new image helper with fallback
        const mainImage = document.getElementById('mainImage');
        const thumbnailsContainer = document.querySelector('.thumbnail-column');

        // Clear existing static thumbnails
        thumbnailsContainer.innerHTML = '';

        // Get all images using the helper (local first, then base64)
        const allImages = getAllProductImages(productId, product.images);
        
        if (allImages.length > 0) {
            // Set main image
            const firstImgUrl = allImages[0];
            mainImage.src = firstImgUrl;
            mainImage.alt = product.name;

            // Create thumbnails
            allImages.forEach((imgUrl, index) => {
                const thumb = document.createElement('div');
                thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                thumb.innerHTML = `<div class="thumbnail-image" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center;"></div>`;

                thumb.addEventListener('click', function () {
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    mainImage.src = imgUrl;
                });

                thumbnailsContainer.appendChild(thumb);
            });
        }
    }

    function updatePriceDisplay(price, originalPrice = null) {
        const priceElements = document.querySelectorAll('.product-price, .action-bar-product-price, .mobile-product-price');
        priceElements.forEach(element => {
            const isMainPrice = element.classList.contains('product-price');
            
            if (isMainPrice) {
                if (originalPrice && originalPrice > price) {
                    const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
                    element.innerHTML = `
                        <div class="price-card">
                            <div class="price-row">
                                <span class="price-actual">₹${price.toLocaleString('en-IN')}</span>
                                <span class="price-original">₹${originalPrice.toLocaleString('en-IN')}</span>
                                <span class="price-discount-badge">${discountPercent}% OFF</span>
                            </div>
                            <div class="price-footer">
                                <div class="price-savings">
                                    <i class="fa-solid fa-ticket"></i> You Save: <span class="savings-value">₹${(originalPrice - price).toLocaleString('en-IN')}</span>
                                </div>
                                <span class="tax-info">Inclusive of all taxes</span>
                            </div>
                        </div>
                    `;
                } else {
                    element.innerHTML = `
                        <div class="price-card">
                            <div class="price-row">
                                <span class="price-actual">₹${price.toLocaleString('en-IN')}</span>
                            </div>
                            <div class="price-footer">
                                <span class="tax-info">Inclusive of all taxes</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                element.innerHTML = `<span class="at-text">At</span> ₹${price.toLocaleString('en-IN')}`;
            }
        });
    }

    function syncProductDetails(product) {
        // Sync product name in both desktop and mobile fixed action bars
        const desktopNameElement = document.querySelector('.action-bar-product-name');
        const mobileNameElement = document.querySelector('.mobile-product-name');
        
        if (desktopNameElement) desktopNameElement.textContent = product.name;
        if (mobileNameElement) mobileNameElement.textContent = product.name;
        
        // Get current state
        const currentQuantity = parseInt(document.querySelector('.quantity-input').value) || 1;
        const activeVariantBtn = document.querySelector('.variant-btn.active');
        const selectedSize = activeVariantBtn ? activeVariantBtn.textContent : '250g';
        const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
        const totalPrice = scaledPrice * currentQuantity;
        
        // Sync original price if it exists
        let totalOriginalPrice = null;
        if (product.originalPrice) {
            const scaledOriginal = cartService.getPriceForSize(product.originalPrice, selectedSize);
            totalOriginalPrice = scaledOriginal * currentQuantity;
        }
        
        // Sync current price with quantity and size applied
        updatePriceDisplay(totalPrice, totalOriginalPrice);
        
        // Sync size selection in mobile fixed action bar
        const mobileSizeSelect = document.querySelector('.mobile-size-select');
        const desktopSizeSelect = document.querySelector('.size-select');
        
        if (mobileSizeSelect) {
            mobileSizeSelect.value = selectedSize;
        }
        if (desktopSizeSelect) {
            desktopSizeSelect.value = selectedSize;
        }
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
                    
                    // Sync mobile fixed action bar when quantity changes
                    syncProductDetails(product);
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
                    
                    // Sync mobile fixed action bar when quantity changes
                    syncProductDetails(product);
                }
            });
        }

        // Mobile quantity selector setup
        const mobileMinusBtn = document.querySelector('.mobile-quantity-btn.minus');
        const mobilePlusBtn = document.querySelector('.mobile-quantity-btn.plus');
        const mobileQuantityInput = document.querySelector('.mobile-quantity-input');

        if (mobileMinusBtn && mobilePlusBtn && mobileQuantityInput) {
            // Clone and replace to remove old listeners if any
            const newMobileMinus = mobileMinusBtn.cloneNode(true);
            const newMobilePlus = mobilePlusBtn.cloneNode(true);
            mobileMinusBtn.parentNode.replaceChild(newMobileMinus, mobileMinusBtn);
            mobilePlusBtn.parentNode.replaceChild(newMobilePlus, mobilePlusBtn);

            newMobileMinus.addEventListener('click', function () {
                const currentValue = parseInt(mobileQuantityInput.value);
                if (currentValue > 1) {
                    const newValue = currentValue - 1;
                    mobileQuantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                    
                    // Sync main product details when mobile quantity changes
                    syncProductDetails(product);
                }
            });

            newMobilePlus.addEventListener('click', function () {
                const currentValue = parseInt(mobileQuantityInput.value);
                if (currentValue < 10) {
                    const newValue = currentValue + 1;
                    mobileQuantityInput.value = newValue;
                    syncQuantity(newValue);
                    const selectedSize = document.querySelector('.variant-btn.active')?.textContent || '250g';
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, newValue);
                    
                    // Sync main product details when mobile quantity changes
                    syncProductDetails(product);
                }
            });
        }

        // Setup size select dropdowns for bidirectional sync
        const mobileSizeSelect = document.querySelector('.mobile-size-select');
        const desktopSizeSelect = document.querySelector('.size-select');
        
        if (mobileSizeSelect) {
            mobileSizeSelect.addEventListener('change', function() {
                const selectedSize = this.value;
                // Update main variant buttons
                const variantButtons = document.querySelectorAll('.variant-btn');
                variantButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.textContent === selectedSize) {
                        btn.classList.add('active');
                    }
                });
                
                // Recalculate price and sync
                const currentQuantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                updateTotalPrice(scaledPrice, currentQuantity);
                syncProductDetails(product);
            });
        }
        
        if (desktopSizeSelect) {
            desktopSizeSelect.addEventListener('change', function() {
                const selectedSize = this.value;
                // Update main variant buttons
                const variantButtons = document.querySelectorAll('.variant-btn');
                variantButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.textContent === selectedSize) {
                        btn.classList.add('active');
                    }
                });
                
                // Recalculate price and sync
                const currentQuantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                updateTotalPrice(scaledPrice, currentQuantity);
                syncProductDetails(product);
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

    function setupImageZoom() {
        const container = document.getElementById('zoomContainer');
        const img = document.getElementById('mainImage');
        
        if (!container || !img) return;
        
        // Disable hover zoom on touch viewports or small devices
        const isZoomEnabled = () => window.innerWidth >= 1024;

        container.addEventListener('mousemove', function(e) {
            if (!isZoomEnabled()) return;
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = 'scale(2.2)'; // 2.2x zoom feels extra premium
        });
        
        container.addEventListener('mouseleave', function() {
            img.style.transform = 'scale(1)';
            img.style.transformOrigin = 'center center';
        });
    }

    function setupAdditionalInteractions() {
        // Copy coupon handler
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
                    navigator.clipboard.writeText(couponCode)
                        .then(performCopyFeedback)
                        .catch(err => console.error('Clipboard copy failed: ', err));
                } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = couponCode;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        performCopyFeedback();
                    } catch (err) {
                        console.error('Fallback copy failed: ', err);
                    }
                    document.body.removeChild(textArea);
                }
            });
        }

        // Rating summary smooth scroll to reviews
        const ratingSummary = document.getElementById('productRatingSummary');
        if (ratingSummary) {
            ratingSummary.addEventListener('click', function() {
                const reviewsSection = document.querySelector('.reviews-section');
                if (reviewsSection) {
                    reviewsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
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
                // Normalize the display format (250 gm -> 250g, etc.)
                const normalizedQty = cartService.normalizeSize(qty);
                btn.textContent = normalizedQty;

                btn.addEventListener('click', function () {
                    optionsContainer.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                    const selectedSize = this.textContent; // Use normalized text
                    const scaledPrice = cartService.getPriceForSize(product.price, selectedSize);
                    updateTotalPrice(scaledPrice, quantity);
                    
                    // Sync mobile fixed action bar when variant changes
                    syncProductDetails(product);
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
                    
                    // Sync mobile fixed action bar when quantity changes
                    syncProductDetails(product);
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
                    
                    // Sync mobile fixed action bar when quantity changes
                    syncProductDetails(product);
                }
            });
        }
    }

    // Setup action buttons
    function setupActionButtons(product) {
        const addToCartBtns = document.querySelectorAll('.btn-primary, .action-bar-btn-primary, .add-to-cart-btn, .mobile-add-to-cart-btn');
        const buyNowBtns = document.querySelectorAll('.btn-buy, .buy-now-btn, .mobile-buy-now-btn');

        // Buy Now Logic
        buyNowBtns.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async function () {
                const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                const size = document.querySelector('.variant-btn.active')?.textContent || '250g';

                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                this.classList.add('loading');

                await cartService.addToCart(product, quantity, size);
                
                // Navigate directly to cart to finish buying
                window.location.href = 'cart.html';
            });
        });

        // Add to Cart Logic
        addToCartBtns.forEach(btn => {
            // Replace to clear
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async function () {
                const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
                const size = document.querySelector('.variant-btn.active')?.textContent || '250g';

                await cartService.addToCart(product, quantity, size);

                // Show success feedback - use just checkmark to avoid squeezing circular buttons
                const originalText = this.innerHTML;
                const isIconOnly = this.classList.contains('add-to-cart-btn') || this.classList.contains('mobile-add-to-cart-btn') || this.classList.contains('btn-icon-only');
                
                if (isIconOnly) {
                    this.innerHTML = '<i class="fas fa-check"></i>';
                } else {
                    this.innerHTML = '<i class="fas fa-check"></i> Added!';
                }
                
                this.style.backgroundColor = '#4CAF50';
                this.style.borderColor = '#4CAF50'; // Make border match if there is one

                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.backgroundColor = '';
                    this.style.borderColor = '';
                }, 2000);
            });
        });
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
            const querySnapshot = await getDocs(q);
            
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
            
            // Update Product Title Rating summary
            if (summaryAvg) summaryAvg.textContent = avgRating.toFixed(1);
            if (summaryStars) summaryStars.innerHTML = renderStarsHTML(avgRating);
            if (summaryCount) summaryCount.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
            
            // Update Rating Breakdown Bars
            const starCounts = {5:0, 4:0, 3:0, 2:0, 1:0};
            reviews.forEach(r => { const s = Math.round(r.rating); if (starCounts[s] !== undefined) starCounts[s]++; });
            [5,4,3,2,1].forEach(star => {
                const row = document.querySelector(`.rating-bar-row[data-star="${star}"]`);
                if (!row) return;
                const fill = row.querySelector('.rating-bar-fill');
                const countEl = row.querySelector('.bar-count');
                const pct = count > 0 ? Math.round((starCounts[star] / count) * 100) : 0;
                if (fill) fill.style.width = pct + '%';
                if (countEl) countEl.textContent = starCounts[star];
            });

            // Avatar color palette
            const avatarColors = ['#e74c3c','#9b59b6','#2ecc71','#3498db','#e67e22','#1abc9c','#e91e63','#ff5722','#607d8b','#795548'];
            const getAvatarColor = (name) => {
                let hash = 0;
                for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                return avatarColors[Math.abs(hash) % avatarColors.length];
            };

            // Render Reviews Grid
            if (count === 0) {
                reviewsContainer.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #aaa; grid-column: 1 / -1; width: 100%;">
                        <i class="far fa-comments" style="font-size: 48px; margin-bottom: 16px; display: block; opacity: 0.4;"></i>
                        <p style="font-size:15px; font-weight:600; color:#888;">No reviews yet</p>
                        <p style="font-size:13px; color:#bbb; margin-top:6px;">Be the first to share your experience!</p>
                    </div>
                `;
            } else {
                reviewsContainer.innerHTML = reviews.map((review, idx) => {
                    let formattedDate = 'Just now';
                    if (review.timestamp) {
                        try {
                            const dateObj = review.timestamp.toDate ? review.timestamp.toDate() : new Date(review.timestamp);
                            formattedDate = dateObj.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
                        } catch (e) { console.error(e); }
                    }
                    const name = review.userName || 'Customer';
                    const initial = name.charAt(0).toUpperCase();
                    const color = getAvatarColor(name);
                    const ratingVal = Math.round(review.rating || 0);
                    return `
                        <div class="review-card" data-rating="${ratingVal}" style="animation-delay:${idx * 0.05}s">
                            <div class="review-header">
                                <div class="review-left">
                                    <div class="reviewer-name">${name}</div>
                                    <div class="review-date">${formattedDate}</div>
                                    <div class="review-rating-stars">${renderStarsHTML(review.rating)}</div>
                                    <div class="review-badges">
                                        ${review.verifiedBuyer ? '<span class="review-badge"><i class="fas fa-check-circle"></i> Verified Buyer</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            ${review.reviewTitle ? `<p class="review-title">${review.reviewTitle}</p>` : ''}
                            <p class="review-text">${review.reviewText}</p>
                            <div class="review-footer">
                                <button class="review-helpful" aria-label="Mark as helpful">
                                    <i class="far fa-thumbs-up"></i>
                                    <span class="review-helpful-count">0</span>
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
            star.addEventListener('click', function() {
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
            star.addEventListener('mouseover', function() {
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
            
            star.addEventListener('mouseout', function() {
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
        form.addEventListener('submit', async function(e) {
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

// Fixed action bar visibility is now handled by IntersectionObserver in product-ux.js
