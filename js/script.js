const track = document.getElementById("heroTrack");

if (track) {
    let slides = Array.from(track.children);

    /* Clone first slide for infinite loop */
    const firstClone = track.children[0].cloneNode(true);
    track.appendChild(firstClone);

    /* Update slides array to include the clone */
    let allSlides = Array.from(track.children);
    const TOTAL_INITIAL_SLIDES = allSlides.length - 1;

    /* Gap must match CSS */
    const GAP_PERCENT = 2;

    /* Calculate slide width dynamically */
    function getSlideWidth() {
        const slide = allSlides[0];
        const container = track.parentElement;
        const gap = (container.offsetWidth * GAP_PERCENT) / 100;
        return slide.offsetWidth + gap;
    }

    let index = 0;

    /* Function to update active slide class */
    function updateActiveSlide() {
        allSlides.forEach((slide, i) => {
            // Persistent Active: Slides at or before current index are marked active
            // This ensures exiting slides stay in 'Row' layout
            if (i <= index) {
                slide.classList.add("active");
            } else {
                slide.classList.remove("active");
            }
        });

        // Loop Sync: When jumping back, we reset all slides except the first few 
        // to prepare them for the next cycle's 'Next' (column) state
        if (index === 0) {
            allSlides.forEach((slide, i) => {
                if (i > 0) slide.classList.remove("active");
            });
        }
    }


    /* Initialize active state */
    updateActiveSlide();

    setInterval(() => {
        index++;
        track.style.transition = "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(-${index * getSlideWidth()}px)`;
        updateActiveSlide();

        if (index === TOTAL_INITIAL_SLIDES) {
            setTimeout(() => {
                // Jump back to original first slide
                track.style.transition = "none";
                index = 0;
                track.style.transform = `translateX(0)`;
                updateActiveSlide();
            }, 850); // Wait for transition to finish
        }
    }, 4000);
}

/* Hide/Show navigation on scroll */
let lastScrollTop = 0;
let scrollThreshold = 50; // Reduced threshold for better responsiveness

window.addEventListener('scroll', function () {
    const mainNav = document.querySelector('.main-nav');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (mainNav) {
        if (scrollTop > lastScrollTop && scrollTop > 80) {
            // Scrolling down - hide navigation
            mainNav.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up - show navigation
            mainNav.style.transform = 'translateY(0)';
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }
});

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
    const productSection = document.querySelector('.product-section');
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
                <span class="breadcrumb-separator">></span>
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
    const headerSearchIcon = document.querySelector('.header-icons .fa-search');
    const mobileSearchIcon = document.querySelector('.mobile-nav-icons .fa-search');

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
    const mobileHomeIcon = document.querySelector('.mobile-nav-icons .fa-home');

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
    const headerCartIcon = document.querySelector('.header-icons .fa-shopping-bag');
    const mobileCartIcon = document.querySelector('.mobile-nav-icons .fa-shopping-bag');

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
    const headerProfileIcon = document.querySelector('.header-icons .fa-user');
    const mobileProfileIcon = document.querySelector('.mobile-nav-icons .fa-user');

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
    const headerWishlistIcon = document.querySelector('.header-icons .fa-heart');
    const mobileWishlistIcon = document.querySelector('.mobile-nav-icons .fa-heart');

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

    // Add click handler for Shop dropdown - navigate to search page (separate HTML)
    const shopDropdown = document.querySelector('.dropdown');
    if (shopDropdown) {
        shopDropdown.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'search.html';
        });
    }

    // Add click handlers for mobile Shop icon - navigate to search page (separate HTML)
    const mobileShopIcon = document.querySelector('.mobile-nav-icons .fa-store');
    if (mobileShopIcon) {
        mobileShopIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'search.html';
        });
    }

    // Add click handlers for mobile About Us icon
    const mobileAboutIcon = document.querySelector('.mobile-nav-icons .fa-info-circle');
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
        default:
            break;
    }
});
