// Search Results Functionality
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createProductCard } from './card-renderer.js';

document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.querySelector('.search-input');
    const productGrid = document.querySelector('.search-results .product-grid');
    const categoryChips = document.querySelectorAll('#categoryFilters input');

    let allProducts = [];

    // Fetch products from Firebase
    async function fetchProducts() {
        if (!productGrid) return;
        showSearchSkeletons();

        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            allProducts = [];
            querySnapshot.forEach((doc) => {
                allProducts.push(doc.data());
            });

            // Check URL for category filter
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category');
            if (categoryParam) {
                categoryChips.forEach(cb => {
                    if (cb.value.toLowerCase() === categoryParam.toLowerCase()) {
                        cb.checked = true;
                    }
                });
            }

            applyFilters();
        } catch (error) {
            console.error("Error fetching products: ", error);
            productGrid.innerHTML = '<div class="error">Error loading products. Please try again later.</div>';
        }
    }

    function renderProducts(products) {
        if (!productGrid) return;
        productGrid.innerHTML = '';

        if (products.length === 0) {
            productGrid.innerHTML = '<div class="no-results" style="padding: 40px; text-align: center; color: #666;">No products found matching your criteria.</div>';
            return;
        }

        products.forEach(product => {
            const cardHtml = createProductCard(product);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = cardHtml;
            productGrid.appendChild(wrapper.firstElementChild);
        });
    }

    function applyFilters() {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const selectedCategories = Array.from(categoryChips).filter(cb => cb.checked).map(cb => cb.value);

        const filtered = allProducts.filter(product => {
            // Text Search
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                (product.hindiName && product.hindiName.includes(searchTerm));

            // Category Filter
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);

            return matchesSearch && matchesCategory;
        });

        renderProducts(filtered);
    }

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Auto-apply logic for chips
    categoryChips.forEach(chip => {
        chip.addEventListener('change', applyFilters);
    });

    // Category Scroll Arrows Logic
    const categoryNavWrapper = document.querySelector('.category-nav-wrapper');
    const scrollContainer = document.querySelector('.category-scroll-container');
    const btnLeft = document.getElementById('scrollLeft');
    const btnRight = document.getElementById('scrollRight');

    function updateArrows() {
        if (!categoryNavWrapper || !scrollContainer) return;

        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

        // Show left arrow if scrolled more than 5px
        categoryNavWrapper.classList.toggle('has-scroll-left', scrollLeft > 5);

        // Show right arrow if there's more content (with 5px buffer)
        categoryNavWrapper.classList.toggle('has-scroll-right', scrollLeft + clientWidth < scrollWidth - 5);
    }

    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', updateArrows);
        window.addEventListener('resize', updateArrows);
        // Initial check
        setTimeout(updateArrows, 500);
    }

    if (btnLeft) {
        btnLeft.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }

    if (btnRight) {
        btnRight.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }

    // Initial fetch
    fetchProducts();

    function showSearchSkeletons() {
        if (!productGrid) return;

        let skeletonsHtml = '';
        for (let i = 0; i < 8; i++) {
            skeletonsHtml += `
            <div class="product-card">
                <div class="card-image-container skeleton"></div>
                <div class="card-content">
                    <div class="skeleton skeleton-title" style="width: 80%;"></div>
                    <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    <div class="card-options" style="margin-top: 10px;">
                        <div class="skeleton skeleton-text" style="height: 32px; flex: 1; border-radius: 12px;"></div>
                        <div class="skeleton skeleton-text" style="height: 32px; width: 40px; border-radius: 12px;"></div>
                    </div>
                    <div class="card-footer" style="margin-top: 10px; height: 40px; background: transparent;">
                        <div class="skeleton skeleton-btn"></div>
                    </div>
                </div>
            </div>
            `;
        }
        productGrid.innerHTML = skeletonsHtml;
    }

    // Fixed Search Header Logic (Mobile)
    const searchHeader = document.querySelector('.search-header');

    if (searchHeader) {
        let lastScrollY = window.scrollY;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    // Add fixed class if scrolled down
                    if (currentScrollY > 10) {
                        searchHeader.classList.add('fixed-app-header');
                        if (categoryNavWrapper) categoryNavWrapper.style.display = 'none';
                    } else {
                        searchHeader.classList.remove('fixed-app-header');
                        if (categoryNavWrapper) categoryNavWrapper.style.display = ''; // Restore default
                    }

                    lastScrollY = currentScrollY;
                    ticking = false;
                });

                ticking = true;
            }
        });
    }
});

