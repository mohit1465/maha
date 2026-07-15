import { getCategories as getCategoriesFromCache } from './data-cache.js';

const categoryIcons = {
    'Almonds': 'fa-seedling',
    'Walnuts': 'fa-circle',
    'Cashews': 'fa-leaf',
    'Pistachios': 'fa-spa',
    'Raisins': 'fa-cookie',
    'Dates': 'fa-calendar',
    'Figs': 'fa-apple-whole',
    'Apricots': 'fa-lemon',
    'MAKHANA': 'fa-water',
    'Other Dry Fruits': 'fa-basket-shopping'
};

/**
 * Fetch unique categories from cache
 */
export async function getCategories() {
    try {
        return await getCategoriesFromCache();
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}

/**
 * Populate dropdown menu in header with dynamic categories
 */
export async function populateHeaderDropdown() {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!dropdownContent) return;

    const categories = await getCategories();
    
    // Keep the "All" option
    let html = `
        <a href="search.html" class="dropdown-item">
            <i class="fas fa-th-large"></i>
            <span>All</span>
        </a>
    `;

    categories.forEach(category => {
        const icon = categoryIcons[category] || 'fa-seedling';
        html += `
            <a href="search.html?category=${encodeURIComponent(category)}" class="dropdown-item">
                <i class="fas ${icon}"></i>
                <span>${category}</span>
            </a>
        `;
    });

    dropdownContent.innerHTML = html;
}

/**
 * Populate category chips in search page
 * @param {Function} onChangeCallback - Optional callback for chip change events
 */
export async function populateSearchCategoryChips(onChangeCallback) {
    const categoryFiltersContainer = document.getElementById('categoryFilters');
    if (!categoryFiltersContainer) return [];

    const categories = await getCategories();
    categoryFiltersContainer.innerHTML = '';

    categories.forEach(category => {
        const sanitizedCategory = category.toLowerCase().replace(/\s+/g, '-');
        const chip = document.createElement('label');
        chip.className = 'chip';
        chip.innerHTML = `
            <input type="checkbox" name="category" id="cat-${sanitizedCategory}" value="${category}" hidden>
            <span>${category}</span>
        `;
        categoryFiltersContainer.appendChild(chip);
    });

    // Attach event listeners to new chips
    const newChips = categoryFiltersContainer.querySelectorAll('input');
    newChips.forEach(chip => {
        chip.addEventListener('change', onChangeCallback || (() => {}));
    });

    return newChips;
}

/**
 * Populate category cards in home page
 */
export async function populateHomeCategoryCards() {
    const categoryTrack = document.getElementById('categoryTrack');
    if (!categoryTrack) return;

    const categories = await getCategories();
    categoryTrack.innerHTML = '';

    categories.forEach((category, index) => {
        const icon = categoryIcons[category] || 'fa-seedling';
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.dataset.index = index;
        categoryCard.dataset.link = `search.html?category=${encodeURIComponent(category)}`;
        categoryCard.innerHTML = `
            <div class="category-card-inner">
                <i class="fas ${icon}" style="font-size: 40px; color: var(--primary-dark);"></i>
            </div>
            <span class="category-card-name">${category}</span>
        `;
        categoryTrack.appendChild(categoryCard);
    });

    // Re-attach click handlers for category cards
    categoryTrack.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const link = card.dataset.link;
            if (link) window.location.href = link;
        });
    });

    // Re-initialize the category slider if it exists
    if (typeof initCategorySlider === 'function') {
        initCategorySlider();
    }
}

/**
 * Initialize all category-related UI elements
 */
export async function initCategories() {
    await Promise.all([
        populateHeaderDropdown(),
        // Don't populate search chips here - they're handled by search.js
        // Don't populate home cards here - they're handled by home.js
    ]);
}

// Auto-initialize header dropdown when module loads
document.addEventListener('DOMContentLoaded', async () => {
    await populateHeaderDropdown();
});
