const track = document.getElementById("heroTrack");

if (track) {
    let slides = Array.from(track.children);
    const TOTAL_SLIDES = slides.length; // No clones needed for overlapping slide transition

    // Eagerly preload and decode all banner images to prevent decoding stalls during transitions
    slides.forEach(slide => {
        const img = slide.querySelector('img');
        if (img) {
            img.loading = "eager";
            img.decoding = "sync";
            if (typeof img.decode === 'function') {
                img.decode().catch(() => {});
            }
        }
    });

    let index = 0;
    let autoplayTimer = null;
    

    // Create indicators dynamically depending on slide count
    const indicatorsContainer = document.getElementById("heroIndicators");
    if (indicatorsContainer) {
        indicatorsContainer.innerHTML = '';
        for (let i = 0; i < TOTAL_SLIDES; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'hero-indicator';
            if (i === 0) indicator.classList.add('active');
            indicator.addEventListener('click', () => {
                goToSlide(i);
                resetAutoplay();
            });
            indicatorsContainer.appendChild(indicator);
        }
    }

    function getRandomRevealPosition() {
        // Random width between 20% and 35% of banner
        const rectWidth = Math.floor(Math.random() * 15) + 20; // 20-35%
        // Random height between 20% and 35% of banner
        const rectHeight = Math.floor(Math.random() * 15) + 25; // 25-40%

        // Random top position (10% to 50%)
        const top = Math.floor(Math.random() * (100 - rectHeight - 20)) + 10;
        // Random left position (10% to 50%)
        const left = Math.floor(Math.random() * (100 - rectWidth - 20)) + 10;

        const bottom = 100 - top - rectHeight;
        const right = 100 - left - rectWidth;

        return { top, right, bottom, left };
    }

    function updateSliderState(isInitial = false) {
        slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add("active");
                slide.classList.remove("prev-active");
                slide.style.zIndex = "3";
                slide.style.opacity = "1";

                if (!isInitial) {
                    const pos = getRandomRevealPosition();
                    const startInset = `inset(${pos.top}% ${pos.right}% ${pos.bottom}% ${pos.left}% round 200px)`;
                    const endInset = `inset(0% 0% 0% 0% round 0px)`;

                    // Disable transition instantly to set starting shape
                    slide.style.transition = "none";
                    slide.style.webkitTransition = "none";
                    slide.style.webkitClipPath = startInset;
                    slide.style.clipPath = startInset;

                    // Trigger transition to full screen on the next frame
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            slide.style.transition = "";
                            slide.style.webkitTransition = "";
                            slide.style.webkitClipPath = endInset;
                            slide.style.clipPath = endInset;
                        });
                    });
                } else {
                    slide.style.transition = "none";
                    slide.style.webkitTransition = "none";
                    slide.style.webkitClipPath = "inset(0% 0% 0% 0% round 0px)";
                    slide.style.clipPath = "inset(0% 0% 0% 0% round 0px)";
                }
            } else if (slide.classList.contains("active")) {
                slide.classList.remove("active");
                slide.classList.add("prev-active");
                slide.style.zIndex = "2";
                slide.style.opacity = "1";
                slide.style.transition = "none";
                slide.style.webkitTransition = "none";
                slide.style.webkitClipPath = "inset(0% 0% 0% 0% round 0px)";
                slide.style.clipPath = "inset(0% 0% 0% 0% round 0px)";
            } else {
                slide.classList.remove("active");
                slide.classList.remove("prev-active");
                slide.style.zIndex = "1";
                slide.style.opacity = "0";
                slide.style.transition = "none";
                slide.style.webkitTransition = "none";
                slide.style.webkitClipPath = "none";
                slide.style.clipPath = "none";
            }
        });

        // Update indicators classes
        const indicators = document.querySelectorAll('.hero-indicator');
        if (indicators.length > 0) {
            indicators.forEach((ind, i) => {
                if (i === index) {
                    ind.classList.add('active');
                } else {
                    ind.classList.remove('active');
                }
            });
        }
    }

    function goToSlide(newIndex) {
        if (newIndex === index) return;
        index = (newIndex + TOTAL_SLIDES) % TOTAL_SLIDES;
        updateSliderState(false);
    }

    function nextSlide() {
        goToSlide(index + 1);
    }

    function prevSlide() {
        goToSlide(index - 1);
    }

    // Arrow button click handlers
    const prevBtn = document.getElementById("heroPrevBtn");
    const nextBtn = document.getElementById("heroNextBtn");

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoplay();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoplay();
        });
    }

    // Autoplay interval management
    function startAutoplay() {
        autoplayTimer = setInterval(nextSlide, 4500);
    }

    function resetAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            startAutoplay();
        }
    }

    // Start on load
    startAutoplay();
    updateSliderState(true);
}



/* Section / Page Navigation */
function navigateTo(section) {
    switch (section) {
        case 'home':
            window.location.href = 'index.html';
            break;
        case 'search':
            window.location.href = 'search.html';
            break;
        case 'product':
            window.location.href = 'product.html';
            break;
        case 'cart':
            window.location.href = 'cart.html';
            break;
        case 'wishlist':
            window.location.href = 'wishlist.html';
            break;
        case 'profile':
            window.location.href = 'profile.html';
            break;
        case 'about':
            window.location.href = 'about.html';
            break;
        case 'contact':
            window.location.href = 'contact.html';
            break;
        case 'login-signup':
            // Navigate to dedicated login/signup page
            window.location.href = 'login.html';
            break;
        default:
            break;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const pageType = document.body ? document.body.getAttribute('data-page') || 'home' : 'home';

    const homeSection = document.querySelector('.home-section');
    const searchSection = document.querySelector('.search-section');
    const shopSection = document.querySelector('.shop-section');
    const productSection = document.querySelector('.product-main, .product-section');
    const cartSection = document.querySelector('.cart-section');
    const profileSection = document.querySelector('.profile-section');
    const contactSection = document.querySelector('.contact-section');
    const aboutSection = document.querySelector('.about-section');
    const loginSignupSection = document.querySelector('.login-signup-section');

    // Track the current section the user is in (used only on single-page home, but kept for compatibility)
    let currentSection = 'home';
    let lastSectionBeforeProduct = 'home';

    // Helper to navigate between separate HTML pages based on section name
    function navigateTo(section) {
        if (typeof window.checkAuthAndNavigate === 'function') {
            window.checkAuthAndNavigate(section);
        } else {
            switch (section) {
                case 'home':
                    window.location.href = 'index.html';
                    break;
                case 'search':
                    window.location.href = 'search.html';
                    break;
                case 'product':
                    window.location.href = 'product.html';
                    break;
                case 'cart':
                    window.location.href = 'cart.html';
                    break;
                case 'wishlist':
                    window.location.href = 'wishlist.html';
                    break;
                case 'profile':
                    window.location.href = 'profile.html';
                    break;
                case 'about':
                    window.location.href = 'about.html';
                    break;
                case 'contact':
                    window.location.href = 'contact.html';
                    break;
                case 'login-signup':
                    window.location.href = 'login.html';
                    break;
                default:
                    break;
            }
        }
    }

    // Show home section by default, hide all others
    function showHomeSection() {
        const allSections = document.querySelectorAll('main > section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // Hide login/signup section when going home
        if (loginSignupSection) loginSignupSection.style.display = 'none';

        if (homeSection) {
            homeSection.style.display = 'block';

            // 🔥 FIX: show inner sections too
            const innerSections = homeSection.querySelectorAll('section');
            innerSections.forEach(sec => {
                sec.style.display = 'block';
            });
        }

        currentSection = 'home';
        lastSectionBeforeProduct = 'home';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Make showHomeSection globally available (used by some scripts and breadcrumbs)
    window.showHomeSection = showHomeSection;

    // Show search section, hide others (kept for compatibility, but navigation now uses separate page)
    function showSearchSection() {
        // Hide all sections first
        const allSections = document.querySelectorAll('main > section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // Show search section
        if (searchSection) searchSection.style.display = 'block';
        if (shopSection) shopSection.style.display = 'none';
        if (cartSection) cartSection.style.display = 'none';
        if (profileSection) profileSection.style.display = 'none';
        if (contactSection) contactSection.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';
        if (productSection) productSection.style.display = 'none';

        // Track that we're now in search section
        currentSection = 'search';
        lastSectionBeforeProduct = 'search';

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Re-setup product card handlers to ensure they know about the search section
        setTimeout(() => {
            setupProductCardHandlers();
        }, 100);

        // Setup search section breadcrumb click handler
        setupSearchBreadcrumbHandler();

        // Focus on search input when search section is shown
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            setTimeout(() => {
                searchInput.focus();
            }, 300);
        }
    }

    // Show cart section, hide others (kept for compatibility)
    function showCartSection() {
        const allSections = document.querySelectorAll('main > section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        if (loginSignupSection) loginSignupSection.style.display = 'none';

        if (cartSection) cartSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Show product section, hide others (kept for compatibility)
    function showProductSection() {
        if (homeSection) homeSection.style.display = 'none';
        if (searchSection) searchSection.style.display = 'none';
        if (shopSection) shopSection.style.display = 'none';
        if (productSection) productSection.style.display = 'block';
        if (cartSection) cartSection.style.display = 'none';
        if (profileSection) profileSection.style.display = 'none';
        if (contactSection) contactSection.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';
        if (loginSignupSection) loginSignupSection.style.display = 'none';

        // Update breadcrumb based on current section
        updateBreadcrumb(currentSection);

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update breadcrumb based on source section
    function updateBreadcrumb(sourceSection) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) {
            return;
        }

        const sourceText = sourceSection === 'home' ? 'Home' : 'Search';

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            breadcrumb.innerHTML = `
                <span class="breadcrumb-item" data-section="${sourceSection}">${sourceText}</span>
                <span class="breadcrumb-separator">&gt;</span>
                <span class="breadcrumb-item current">Product Name</span>
            `;

            // Add click handler to breadcrumb item
            const breadcrumbItem = breadcrumb.querySelector('.breadcrumb-item:not(.current)');
            if (breadcrumbItem) {
                breadcrumbItem.addEventListener('click', function () {
                    const targetSection = this.getAttribute('data-section');

                    if (targetSection === 'home') {
                        navigateTo('home');
                    } else if (targetSection === 'search') {
                        showSearchSection();
                    }
                });
            }
        }, 50);
    }

    // Add click handlers to search icons specifically
    const headerSearchIcon = document.querySelector('.header-icons [data-section="search"]');
    const mobileSearchIcon = document.querySelector('.mobile-nav-icons [data-section="search"]');

    if (headerSearchIcon) {
        headerSearchIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('search');
        });
    }

    if (mobileSearchIcon) {
        mobileSearchIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('search');
        });
    }

    // Add click handlers to home links specifically
    const headerHomeLink = document.querySelector('.nav-links li:first-child a');
    const mobileHomeIcon = document.querySelector('.mobile-nav-icons [data-section="home"]');

    if (headerHomeLink) {
        headerHomeLink.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('home');
        });
    }

    if (mobileHomeIcon) {
        mobileHomeIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('home');
        });
    }

    // Add click handlers for cart icons
    const headerCartIcon = document.querySelector('.header-icons [data-section="cart"]');
    const mobileCartIcon = document.querySelector('.mobile-nav-icons [data-section="cart"]');

    if (headerCartIcon) {
        headerCartIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('cart');
        });
    }

    if (mobileCartIcon) {
        mobileCartIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('cart');
        });
    }

    // Add click handlers for profile icons
    const headerProfileIcon = document.querySelector('.header-icons [data-section="profile"]');
    const mobileProfileIcon = document.querySelector('.mobile-nav-icons [data-section="profile"]');

    if (headerProfileIcon) {
        headerProfileIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('profile');
        });
    }

    if (mobileProfileIcon) {
        mobileProfileIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('profile');
        });
    }

    // Add click handlers for navigation links
    const aboutLink = document.querySelector('.nav-links li:nth-child(3) a'); // About Us
    const contactLink = document.querySelector('.nav-links li:nth-child(4) a'); // Contact

    if (aboutLink) {
        aboutLink.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('about');
        });
    }

    if (contactLink) {
        contactLink.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('contact');
        });
    }

    // Add click handlers for wishlist icons
    const headerWishlistIcon = document.querySelector('.header-icons [data-section="wishlist"]');
    const mobileWishlistIcon = document.querySelector('.mobile-nav-icons [data-section="wishlist"]');

    if (headerWishlistIcon) {
        headerWishlistIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('wishlist');
        });
    }

    if (mobileWishlistIcon) {
        mobileWishlistIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('wishlist');
        });
    }

    // Add click handler for Shop dropdown button only - navigate to search page (separate HTML)
    const shopDropdownBtn = document.querySelector('.dropdown .dropbtn');
    if (shopDropdownBtn) {
        shopDropdownBtn.addEventListener('click', function (e) {
            // Only navigate if clicking the button itself, not the dropdown content
            window.location.href = 'search.html';
        });
    }

    // Add click handlers for mobile Shop icon - navigate to search page (separate HTML)
    const mobileShopIcon = document.querySelector('.mobile-nav-icons [data-section="shop"]');
    if (mobileShopIcon) {
        mobileShopIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'search.html';
        });
    }

    // Add click handlers for mobile About Us icon
    const mobileAboutIcon = document.querySelector('.mobile-nav-icons [data-section="about"]');
    if (mobileAboutIcon) {
        mobileAboutIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('about');
        });
    }

    function setupSearchBreadcrumbHandler() {
        const searchBreadcrumb = document.querySelector('.search-section .breadcrumb');
        if (searchBreadcrumb) {
            const breadcrumbItem = searchBreadcrumb.querySelector('.breadcrumb-item:not(.current)');
            if (breadcrumbItem) {
                breadcrumbItem.addEventListener('click', function () {
                    const targetSection = this.getAttribute('data-section');
                    if (targetSection === 'home') {
                        navigateTo('home');
                    }
                });
            }
        }
    }
});

// Add click handlers for product cards
function setupProductCardHandlers() {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        card.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // When a product card is clicked, go to product page
            const parentSection = this.closest('.search-section, .home-section');
            if (parentSection && parentSection.classList.contains('search-section')) {
                currentSection = 'search';
            } else if (parentSection && parentSection.classList.contains('home-section')) {
                currentSection = 'home';
            }

            navigateTo('product');
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Universal navigation handler for all data-section attributes
    function setupUniversalNavigation() {
        // Handle all links with data-section attributes
        const navLinks = document.querySelectorAll('[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const targetSection = this.getAttribute('data-section');

                switch (targetSection) {
                    case 'home':
                    case 'search':
                    case 'cart':
                    case 'wishlist':
                    case 'profile':
                    case 'about':
                    case 'contact':
                    case 'product':
                        navigateTo(targetSection);
                        break;
                    case 'login-signup':
                        navigateTo('login-signup');
                        break;
                }
            });
        });

        // Handle breadcrumb navigation
        const breadcrumbItems = document.querySelectorAll('.breadcrumb-item[data-section]');
        breadcrumbItems.forEach(item => {
            item.addEventListener('click', function () {
                const targetSection = this.getAttribute('data-section');

                switch (targetSection) {
                    case 'home':
                    case 'search':
                    case 'cart':
                    case 'wishlist':
                    case 'profile':
                    case 'about':
                    case 'contact':
                    case 'product':
                        navigateTo(targetSection);
                        break;
                }
            });
        });
    }

    /* Mobile Navigation Active State */
    function initMobileNav() {
        const navIconsContainer = document.querySelector('.mobile-nav-icons');
        if (!navIconsContainer) return;

        const navLinks = Array.from(navIconsContainer.querySelectorAll('a'));
        const pageType = document.body.getAttribute('data-page') || 'home';

        navLinks.forEach(link => {
            const section = link.getAttribute('data-section');
            if (section === pageType) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Special cases mapping page types to nav sections
        if (!navIconsContainer.querySelector('.active')) {
            let targetSection = null;
            if (pageType === 'product') {
                targetSection = 'search';
            } else if (pageType === 'orders') {
                targetSection = 'profile';
            }

            if (targetSection) {
                const link = navIconsContainer.querySelector(`[data-section="${targetSection}"]`);
                if (link) link.classList.add('active');
            }
        }
    }

    // Initialize product card handlers
    setupProductCardHandlers();

    // Setup universal navigation
    setupUniversalNavigation();

    // Initialize mobile nav pill
    initMobileNav();

    // Ensure the appropriate section is visible on initial load based on page type.
    const pageType = document.body ? document.body.getAttribute('data-page') || 'home' : 'home';
    switch (pageType) {
        case 'home':
            showHomeSection();
            break;
        case 'search':
            if (typeof showSearchSection === 'function') {
                showSearchSection();
            }
            break;
        case 'product':
            if (typeof showProductSection === 'function') {
                showProductSection();
            }
            break;
        case 'cart':
            if (typeof showCartSection === 'function') {
                showCartSection();
            }
            break;
    }

    // Handle mobile search bar focus expansion
    const headerSearchInput = document.querySelector('.header-search-input');
    const topHeader = document.querySelector('.top-header');
    if (headerSearchInput && topHeader) {
        headerSearchInput.addEventListener('focus', function() {
            if (window.innerWidth <= 800) {
                topHeader.classList.add('search-focused');
            }
        });
        headerSearchInput.addEventListener('blur', function() {
            if (window.innerWidth <= 800) {
                topHeader.classList.remove('search-focused');
            }
        });

        // Add clear button dynamically
        const searchForm = document.querySelector('.header-search-bar form');
        if (searchForm) {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'header-search-clear';
            clearBtn.innerHTML = '<i class="fas fa-times"></i>';
            searchForm.appendChild(clearBtn);

            headerSearchInput.addEventListener('input', function() {
                if (this.value.length > 0) {
                    clearBtn.style.display = 'flex';
                } else {
                    clearBtn.style.display = 'none';
                }
            });

            // Initialize state
            if (headerSearchInput.value.length > 0) {
                clearBtn.style.display = 'flex';
            }

            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                headerSearchInput.value = '';
                clearBtn.style.display = 'none';
                headerSearchInput.focus();
                
                // Trigger input event for live search functionality
                const event = new Event('input', { bubbles: true });
                headerSearchInput.dispatchEvent(event);
            });
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Add big background MAHARAJA text to the footer on all pages
    const footer = document.querySelector('.main-footer');
    if (footer) {
        const bigText = document.createElement('div');
        bigText.className = 'footer-big-text';
        bigText.textContent = 'MAHARAJA';
        footer.appendChild(bigText);
    }
});

// 2D Infinite Category Arch Slider
function initCategorySlider() {
    const track = document.getElementById('categoryTrack');
    const cards = document.querySelectorAll('.category-card');
    const prevBtn = document.getElementById('catPrevBtn');
    const nextBtn = document.getElementById('catNextBtn');
    
    if (!track || cards.length === 0) return;
    
    const totalCards = cards.length;
    let currentOffset = 0; // Fractional continuous offset (no wrapping during dragging to maintain infinity)
    let targetOffset = 0;  // Snap target offset
    let animationFrameId = null;
    
    // Position cards based on currentOffset
    function updateSlider() {
        cards.forEach((card, i) => {
            let diff = i - currentOffset;
            
            // Handle wrapping correctly for infinite cyclic ring
            let halfTotal = totalCards / 2;
            while (diff < -halfTotal) diff += totalCards;
            while (diff > halfTotal) diff -= totalCards;
            
            // 2D curved layout (sides bend downwards, tilt outwards)
            let isMobile = window.innerWidth <= 768;
            let spacing = isMobile ? 95 : 195;
            let bendFactor = isMobile ? 6 : 16;
            let tiltAngle = isMobile ? 5 : 9;
            
            let translateX = diff * spacing;
            let translateY = Math.pow(diff, 2) * bendFactor;
            let rotateZ = diff * tiltAngle;
            let scale = 1 - Math.abs(diff) * (isMobile ? 0.12 : 0.08);
            
            // Instantly hide card when it goes off screen (beyond diff 2.2) to prevent slide-back visual wraps
            let opacity = 0;
            if (Math.abs(diff) < 2.2) {
                opacity = 1 - Math.abs(diff) * 0.38;
                card.style.visibility = 'visible';
            } else {
                opacity = 0;
                card.style.visibility = 'hidden';
            }
            
            // Set styles using 2D transforms (no rotateY/translateZ)
            card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotateZ}deg) scale(${scale})`;
            card.style.opacity = opacity;
            
            // z-index calculated dynamically based on proximity to center
            let zIndex = Math.round(100 - Math.abs(diff) * 20);
            card.style.zIndex = zIndex;
            
            // Add active class if close to center
            if (Math.abs(diff) < 0.5) {
                card.classList.add('active');
                card.classList.remove('inactive');
            } else {
                card.classList.remove('active');
                card.classList.add('inactive');
            }
        });
    }
    
    // Smooth animation loop to target offset
    function animateToTarget() {
        let diff = targetOffset - currentOffset;
        if (Math.abs(diff) > 0.002) {
            currentOffset += diff * 0.2;
            updateSlider();
            animationFrameId = requestAnimationFrame(animateToTarget);
        } else {
            currentOffset = targetOffset;
            updateSlider();
            animationFrameId = null;
        }
    }
    
    function startAnimation(target) {
        targetOffset = target;
        // Adjust currentOffset wrapping to keep animation path minimal
        let diff = targetOffset - currentOffset;
        let wrapCorrection = Math.round(diff / totalCards) * totalCards;
        currentOffset += wrapCorrection;
        
        if (!animationFrameId) {
            animateToTarget();
        }
    }
    
    // Drag/Swipe controls
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let hasDragged = false;
    
    // Prevent default drag ghost preview for children like images
    track.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
    
    // Helper to update custom cursor class
    const updateCustomCursorClass = (addClass, removeClass) => {
        const customCursor = document.getElementById('customCursor');
        if (customCursor) {
            if (removeClass) customCursor.classList.remove(removeClass);
            if (addClass) customCursor.classList.add(addClass);
        }
    };
    
    // Mouse/Touch start
    const onStart = (clientX) => {
        isDragging = true;
        hasDragged = false;
        startX = clientX;
        startOffset = currentOffset;
        track.classList.add('grabbing');
        updateCustomCursorClass('cursor-grabbing', 'cursor-grab');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };
    
    // Mouse/Touch move
    const onMove = (clientX) => {
        if (!isDragging) return;
        let deltaX = clientX - startX;
        if (Math.abs(deltaX) > 6) {
            hasDragged = true;
            updateCustomCursorClass('cursor-grabbing', 'cursor-grab');
        }
        let isMobile = window.innerWidth <= 768;
        let dragDivisor = isMobile ? 80 : 160;
        let deltaOffset = -deltaX / dragDivisor;
        currentOffset = startOffset + deltaOffset;
        updateSlider();
    };
    
    // Mouse/Touch end
    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('grabbing');
        updateCustomCursorClass('cursor-grab', 'cursor-grabbing');
        
        // Snap to closest integer
        let snapIndex = Math.round(currentOffset);
        startAnimation(snapIndex);
    };
    
    // Bind Pointer Events (unified mouse/touch dragging with Pointer Capture)
    track.addEventListener('pointerdown', (e) => {
        // Only trigger on left mouse click or touch contact
        if (e.button !== undefined && e.button !== 0) return;
        onStart(e.clientX);
        track.setPointerCapture(e.pointerId);
    });
    
    track.addEventListener('pointermove', (e) => {
        if (isDragging) {
            onMove(e.clientX);
        }
    });
    
    track.addEventListener('pointerup', (e) => {
        if (isDragging) {
            track.releasePointerCapture(e.pointerId);
            onEnd();
        }
    });
    
    track.addEventListener('pointercancel', (e) => {
        if (isDragging) {
            track.releasePointerCapture(e.pointerId);
            onEnd();
        }
    });
    
    // Custom cursor hover integrations on track
    track.addEventListener('mouseenter', () => {
        updateCustomCursorClass('cursor-grab', 'cursor-grabbing');
    });
    track.addEventListener('mouseleave', () => {
        const customCursor = document.getElementById('customCursor');
        if (customCursor) {
            customCursor.classList.remove('cursor-grab', 'cursor-grabbing');
        }
    });
    
    // Button clicks
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            let nextTarget = Math.round(currentOffset) - 1;
            startAnimation(nextTarget);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            let nextTarget = Math.round(currentOffset) + 1;
            startAnimation(nextTarget);
        });
    }
    
    // Card direct clicks
    cards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            let activeIdx = Math.round(currentOffset) % totalCards;
            if (activeIdx < 0) activeIdx += totalCards;
            
            if (index === activeIdx) {
                const link = card.getAttribute('data-link');
                if (link) window.location.href = link;
            } else {
                let diff = index - activeIdx;
                let halfTotal = totalCards / 2;
                if (diff < -halfTotal) diff += totalCards;
                if (diff > halfTotal) diff -= totalCards;
                
                startAnimation(Math.round(currentOffset) + diff);
            }
        });
    });
    
    // Initial render
    updateSlider();
}

// Initialize on DOMContentLoaded and page load
document.addEventListener('DOMContentLoaded', initCategorySlider);
window.addEventListener('load', initCategorySlider);

let navHideTimeout = null;
let isNavHovered = false;

function handleHeaderScroll() {
    const header = document.querySelector('.header');
    const mainNav = document.querySelector('.main-nav');
    
    if (header) {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
            if (mainNav) {
                mainNav.classList.remove('nav-hidden');
                resetNavHideTimer();
            }
        } else {
            if (document.body.getAttribute('data-page') === 'home') {
                header.classList.remove('scrolled');
            }
            if (mainNav) {
                mainNav.classList.remove('nav-hidden');
            }
            if (navHideTimeout) {
                clearTimeout(navHideTimeout);
            }
        }
    }
}

function resetNavHideTimer() {
    const header = document.querySelector('.header');
    const mainNav = document.querySelector('.main-nav');
    
    if (navHideTimeout) {
        clearTimeout(navHideTimeout);
    }
    
    if (header && header.classList.contains('scrolled') && !isNavHovered) {
        navHideTimeout = setTimeout(() => {
            if (mainNav && !isNavHovered && header.classList.contains('scrolled')) {
                mainNav.classList.add('nav-hidden');
            }
        }, 2000);
    }
}

// Bind hover listeners for main-nav auto-hide
document.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        mainNav.addEventListener('mouseenter', () => {
            isNavHovered = true;
            mainNav.classList.remove('nav-hidden');
            if (navHideTimeout) {
                clearTimeout(navHideTimeout);
            }
        });
        
        mainNav.addEventListener('mouseleave', () => {
            isNavHovered = false;
            resetNavHideTimer();
        });
    }
});

window.addEventListener('scroll', handleHeaderScroll);
window.addEventListener('load', handleHeaderScroll);
window.addEventListener('DOMContentLoaded', handleHeaderScroll);


// Lordicon color hover effect
document.addEventListener('mouseover', function(e) {
    const iconWrapper = e.target.closest('.icon');
    if (iconWrapper) {
        const lordIcon = iconWrapper.querySelector('lord-icon');
        if (lordIcon) {
            lordIcon.setAttribute('colors', 'primary:#fc6e20');
        }
    }
});
document.addEventListener('mouseout', function(e) {
    const iconWrapper = e.target.closest('.icon');
    if (iconWrapper) {
        const lordIcon = iconWrapper.querySelector('lord-icon');
        if (lordIcon) {
            lordIcon.setAttribute('colors', 'primary:#ffffff');
        }
    }
});
