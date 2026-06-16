/**
 * product-ux.js
 * World-Class Product Page UX Enhancements
 * - Tab switching (Overview / Nutrition / Storage)
 * - Social proof toasts
 * - Recently viewed (localStorage)
 * - Fly-to-cart animation
 * - Coupon timer countdown
 * - Wishlist heart toggle on image
 * - Share button
 * - Scroll-reveal animations
 * - Rating filter interaction
 * - Carousel arrow navigation
 * - Scroll-aware fixed bottom bar
 */

document.addEventListener('DOMContentLoaded', function () {

    /* ============================================================
       1. TAB SWITCHING — Overview / Nutrition / Storage
       ============================================================ */
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Update button states
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Update panel states
            tabPanels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');

                // Re-trigger nutrition bar animation when switching to nutrition tab
                if (targetTab === 'nutrition') {
                    const fills = targetPanel.querySelectorAll('.nutrition-fill');
                    fills.forEach(fill => {
                        fill.style.animation = 'none';
                        void fill.offsetWidth; // reflow
                        fill.style.animation = '';
                    });
                }
            }
        });
    });

    /* ============================================================
       2. COUPON TIMER COUNTDOWN
       ============================================================ */
    const timerEl = document.getElementById('timerCountdown');
    if (timerEl) {
        let totalSeconds = 15 * 60; // 15 minutes
        const tick = () => {
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (totalSeconds > 0) {
                totalSeconds--;
            } else {
                // Reset timer for demo
                totalSeconds = 15 * 60;
            }
        };
        tick();
        setInterval(tick, 1000);
    }

    /* ============================================================
       3. WISHLIST HEART BUTTON ON IMAGE
       ============================================================ */
    const imageWishlistBtn = document.getElementById('imageWishlistBtn');
    if (imageWishlistBtn) {
        let isWishlisted = false;
        imageWishlistBtn.addEventListener('click', function () {
            isWishlisted = !isWishlisted;
            this.classList.toggle('active', isWishlisted);
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = isWishlisted ? 'fas fa-heart' : 'far fa-heart';
            }

            // Animate
            this.style.transform = 'scale(1.3)';
            setTimeout(() => { this.style.transform = ''; }, 300);

            // Show toast feedback
            showQuickToast(isWishlisted ? '❤️ Added to wishlist!' : 'Removed from wishlist');
        });
    }

    /* ============================================================
       4. SHARE BUTTON
       ============================================================ */
    const shareBtn = document.getElementById('imageShareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function () {
            const url = window.location.href;
            const title = document.querySelector('.product-title')?.textContent || 'Maharaja Dry Fruits';

            if (navigator.share) {
                navigator.share({ title, text: `Check out ${title} on Maharaja Dry Fruits!`, url });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(url).then(() => {
                    showQuickToast('🔗 Link copied to clipboard!');
                }).catch(() => {
                    showQuickToast('🔗 Share: ' + url);
                });
            }

            // Animate
            this.style.transform = 'scale(1.2) rotate(-15deg)';
            setTimeout(() => { this.style.transform = ''; }, 300);
        });
    }

    /* ============================================================
       5. SOCIAL PROOF TOASTS
       ============================================================ */
    /* ============================================================
       7. FLY-TO-CART ANIMATION
       ============================================================ */
    const flyingDot = document.getElementById('flyingCartDot');

    const flyToCart = (sourceElement) => {
        if (!flyingDot || !sourceElement) return;

        const cartIcon = document.querySelector('.header-icons .cart-count')?.parentElement
                      || document.querySelector('.header-icons [data-section="cart"]');
        if (!cartIcon) return;

        const srcRect = sourceElement.getBoundingClientRect();
        const destRect = cartIcon.getBoundingClientRect();

        // Position at source button center
        flyingDot.style.left = (srcRect.left + srcRect.width / 2 - 6) + 'px';
        flyingDot.style.top = (srcRect.top + srcRect.height / 2 - 6) + 'px';
        flyingDot.style.display = 'block';
        flyingDot.classList.remove('flying');

        // Use WAAPI for smooth path animation
        const keyframes = [
            { left: (srcRect.left + srcRect.width / 2 - 6) + 'px',
              top:  (srcRect.top + srcRect.height / 2 - 6) + 'px',
              opacity: 1, transform: 'scale(1)' },
            { left: (destRect.left + destRect.width / 2 - 6) + 'px',
              top:  (destRect.top + destRect.height / 2 - 6) + 'px',
              opacity: 0, transform: 'scale(0.3)' }
        ];

        flyingDot.style.position = 'fixed';

        const anim = flyingDot.animate(keyframes, {
            duration: 700,
            easing: 'cubic-bezier(0.5, -0.3, 0.7, 1)',
            fill: 'forwards'
        });

        anim.onfinish = () => {
            flyingDot.style.display = 'none';
            // Bounce the cart icon
            if (cartIcon) {
                cartIcon.style.transform = 'scale(1.3)';
                setTimeout(() => { cartIcon.style.transform = ''; }, 300);
            }
        };
    };

    // Attach fly-to-cart to the Add to Cart button
    const addToCartMainBtn = document.getElementById('mainAddToCartBtn');
    if (addToCartMainBtn) {
        addToCartMainBtn.addEventListener('click', function () {
            flyToCart(this);
        });
    }
    const mobileAddToCartBtn = document.getElementById('mobileAddToCartBtn');
    if (mobileAddToCartBtn) {
        mobileAddToCartBtn.addEventListener('click', function () {
            flyToCart(this);
        });
    }

    /* ============================================================
       8. SCROLL-REVEAL ANIMATIONS
       ============================================================ */
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe sections that should animate on scroll
    const revealEls = document.querySelectorAll(
        '.reviews-section, .similar-products-section, .reviews-summary-card, .review-card'
    );
    revealEls.forEach(el => {
        if (!el.closest('.product-details')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
            revealObserver.observe(el);
        }
    });

    /* ============================================================
       9. RATING FILTER BUTTONS
       ============================================================ */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const ratingBarRows = document.querySelectorAll('.rating-bar-row');
    const activeFilterIndicator = document.getElementById('activeFilterIndicator');
    const filterRatingText = document.getElementById('filterRatingText');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const rating = this.dataset.rating;

            // Highlight the corresponding bar
            ratingBarRows.forEach(row => {
                row.classList.remove('active');
                if (rating !== 'all' && row.dataset.star === rating) {
                    row.classList.add('active');
                }
            });

            // Update active filter banner indicator
            if (activeFilterIndicator) {
                if (rating === 'all') {
                    activeFilterIndicator.style.display = 'none';
                } else {
                    activeFilterIndicator.style.display = 'inline-flex';
                    if (filterRatingText) filterRatingText.textContent = `${rating}★`;
                }
            }

            // Filter review cards
            const reviewCards = document.querySelectorAll('.review-card');
            reviewCards.forEach(card => {
                if (rating === 'all') {
                    card.style.display = '';
                } else {
                    const cardRating = card.dataset.rating;
                    card.style.display = (cardRating === rating) ? '' : 'none';
                }
            });
        });
    });

    const clearReviewFilterBtn = document.getElementById('clearReviewFilterBtn');
    if (clearReviewFilterBtn) {
        clearReviewFilterBtn.addEventListener('click', function () {
            const allBtn = document.querySelector('.filter-btn[data-rating="all"]');
            if (allBtn) allBtn.click();
        });
    }

    /* ============================================================
       10. CAROUSEL ARROWS
       (Removed as per grid redesign)
       ============================================================ */

    /* ============================================================
       11. FIXED BOTTOM BAR — Smart Show/Hide
       ============================================================ */
    const fixedBar = document.getElementById('fixedActionBar');
    const mainCTAs = document.querySelector('.product-actions-grid');

    if (fixedBar && mainCTAs) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show bar when main CTAs are NOT visible
                if (!entry.isIntersecting) {
                    fixedBar.classList.add('visible');
                } else {
                    fixedBar.classList.remove('visible');
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(mainCTAs);
    }

    /* ============================================================
       12. MOBILE TOUCH SWIPE FOR IMAGE GALLERY
       ============================================================ */
    const mainImageContainer = document.getElementById('zoomContainer');
    if (mainImageContainer) {
        let touchStartX = 0;
        let touchEndX = 0;

        mainImageContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        mainImageContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        const handleSwipe = () => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) < 40) return; // too small

            const thumbnails = document.querySelectorAll('.thumbnail');
            let activeIndex = 0;
            thumbnails.forEach((t, i) => { if (t.classList.contains('active')) activeIndex = i; });

            let nextIndex = diff > 0
                ? Math.min(activeIndex + 1, thumbnails.length - 1)
                : Math.max(activeIndex - 1, 0);

            if (nextIndex !== activeIndex) {
                thumbnails[nextIndex].click();
            }
        };
    }

    /* ============================================================
       13. LIVE QUANTITY TOTAL DISPLAY
       ============================================================ */
    const updateQuantityTotal = () => {
        const totalDisplay = document.getElementById('quantityTotalDisplay');
        if (!totalDisplay) return;

        const quantityInput = document.querySelector('.quantity-section .quantity-input');
        const qty = parseInt(quantityInput?.value) || 1;

        // Get price from the price-actual element
        const priceActual = document.querySelector('.price-actual');
        if (!priceActual || !priceActual.textContent) return;

        // Parse price (remove ₹ and commas)
        const priceText = priceActual.textContent.replace(/[₹,]/g, '').trim();
        const singlePrice = parseFloat(priceText);
        if (isNaN(singlePrice) || qty <= 1) {
            totalDisplay.classList.remove('visible');
            return;
        }

        const total = singlePrice * qty;
        totalDisplay.textContent = `Total: ₹${total.toLocaleString('en-IN')}`;
        totalDisplay.classList.add('visible');
    };

    // Watch for quantity changes
    const quantitySection = document.querySelector('.quantity-section');
    if (quantitySection) {
        quantitySection.addEventListener('click', () => {
            setTimeout(updateQuantityTotal, 50);
        });
    }

    /* ============================================================
       14. QUICK TOAST HELPER (internal feedback)
       ============================================================ */
    function showQuickToast(message) {
        let quickToast = document.getElementById('quickFeedbackToast');
        if (!quickToast) {
            quickToast = document.createElement('div');
            quickToast.id = 'quickFeedbackToast';
            quickToast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: rgba(26,26,26,0.92);
                color: #fff;
                padding: 10px 22px;
                border-radius: 30px;
                font-size: 13px;
                font-weight: 600;
                z-index: 99999;
                pointer-events: none;
                opacity: 0;
                transition: all 0.3s ease;
                font-family: 'Bricolage Grotesque', sans-serif;
                backdrop-filter: blur(10px);
                white-space: nowrap;
            `;
            document.body.appendChild(quickToast);
        }

        quickToast.textContent = message;
        quickToast.style.opacity = '1';
        quickToast.style.transform = 'translateX(-50%) translateY(0)';

        clearTimeout(quickToast._hideTimeout);
        quickToast._hideTimeout = setTimeout(() => {
            quickToast.style.opacity = '0';
            quickToast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2500);
    }

    /* ============================================================
       15. ENHANCED THUMBNAIL CLICK — FADE TRANSITION
       ============================================================ */
    const mainImage = document.getElementById('mainImage');

    // Override thumbnail clicks to add fade animation
    const thumbnailColumn = document.getElementById('thumbnailColumn');
    if (thumbnailColumn && mainImage) {
        thumbnailColumn.addEventListener('click', function (e) {
            const thumb = e.target.closest('.thumbnail');
            if (!thumb) return;

            mainImage.style.opacity = '0.4';
            mainImage.style.transform = 'scale(0.97)';

            setTimeout(() => {
                mainImage.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                mainImage.style.opacity = '1';
                mainImage.style.transform = 'scale(1)';
            }, 100);
        });
    }

    /* ============================================================
       16. RATING BREAKDOWN BAR CLICK — FILTER
       ============================================================ */
    document.querySelectorAll('.rating-bar-row').forEach(row => {
        row.addEventListener('click', function () {
            const star = this.dataset.star;
            const correspondingFilterBtn = document.querySelector(`.filter-btn[data-rating="${star}"]`);
            if (correspondingFilterBtn) correspondingFilterBtn.click();
        });
    });

    /* ============================================================
       17. BREADCRUMB HOME LINK
       ============================================================ */
    const breadcrumbHome = document.querySelector('.breadcrumb-item[data-section="home"]');
    if (breadcrumbHome) {
        breadcrumbHome.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /* ============================================================
       18. HELPFUL BUTTON ON REVIEW CARDS
       (delegated to container for dynamically added cards)
       ============================================================ */
    const reviewsContainer = document.getElementById('dynamicReviewsContainer');
    if (reviewsContainer) {
        reviewsContainer.addEventListener('click', function (e) {
            const helpBtn = e.target.closest('.review-helpful-btn');
            if (!helpBtn) return;

            helpBtn.classList.toggle('active');
            const icon = helpBtn.querySelector('i');
            const countEl = helpBtn.querySelector('.helpful-count');

            if (helpBtn.classList.contains('active')) {
                if (icon) icon.className = 'fas fa-thumbs-up';
                if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
                helpBtn.style.transform = 'scale(1.1)';
                setTimeout(() => { helpBtn.style.transform = ''; }, 200);
            } else {
                if (icon) icon.className = 'far fa-thumbs-up';
                if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent || '1') - 1);
            }
        });
    }

    /* ============================================================
       19. SWIPE HINT — Auto-hide after first swipe
       ============================================================ */
    const swipeHint = document.getElementById('swipeHint');
    if (swipeHint && mainImageContainer) {
        mainImageContainer.addEventListener('touchend', () => {
            if (swipeHint) swipeHint.style.display = 'none';
        }, { once: true });

        // Also auto-hide after 3 seconds on mobile
        setTimeout(() => {
            if (swipeHint) swipeHint.style.opacity = '0';
        }, 3000);
    }

    /* ============================================================
       20. VARIANT CARD PRICE LABEL UPDATE
       Dynamically add "Best Value" / "Popular" labels based on qty
       ============================================================ */
    const enhanceVariantCards = () => {
        const variantBtns = document.querySelectorAll('.variant-btn');
        if (variantBtns.length === 0) return;

        // Add checkmark icon to active variant
        variantBtns.forEach(btn => {
            if (!btn.querySelector('.variant-weight')) {
                // Legacy plain text button — upgrade to card format
                const weight = btn.textContent.trim();
                btn.innerHTML = `
                    <span class="variant-weight">${weight}</span>
                    <span class="variant-label"></span>
                `;
            }
        });
    };

    // Run after product.js populates variants
    setTimeout(enhanceVariantCards, 500);

    /* ============================================================
       21. REVIEW DRAWER TOGGLE
       ============================================================ */
    const initReviewDrawer = () => {
        const backdrop = document.getElementById('reviewDrawerBackdrop');
        const drawer = document.getElementById('reviewDrawer');
        const closeBtn = document.getElementById('closeReviewDrawerBtn');

        function openDrawer() {
            if (drawer && backdrop) {
                drawer.classList.add('open');
                backdrop.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling background
            }
        }

        // Declared closeDrawer as block-scoped variable inside initReviewDrawer
        function closeDrawer() {
            if (drawer && backdrop) {
                drawer.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            }
        }

        // Event delegation to catch write review buttons
        document.addEventListener('click', function (e) {
            const writeBtn = e.target.closest('.product-write-btn') || e.target.closest('#openReviewDrawerBtn');
            if (writeBtn) {
                e.preventDefault();
                openDrawer();
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeDrawer);
        }
        if (backdrop) {
            backdrop.addEventListener('click', closeDrawer);
        }
    };

    initReviewDrawer();

});
