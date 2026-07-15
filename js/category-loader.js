import { getCategories as getCategoriesFromCache } from './data-cache.js';

const categoryImages = {
    'Almonds': 'assets/Category/Almond.png',
    'Walnuts': 'assets/Category/walnut.png',
    'Cashews': 'assets/Category/cashew.png',
    'Cashew': 'assets/Category/cashew.png',
    'Pistachios': 'assets/Category/pistachio.png',
    'Pistachio': 'assets/Category/pistachio.png',
    'Raisins': 'assets/Category/raisin.png',
    'Raisin': 'assets/Category/raisin.png',
    'Figs': 'assets/Category/anjeer.png',
    'Fig': 'assets/Category/anjeer.png',
    'Anjeer': 'assets/Category/anjeer.png',
    'MAKHANA': 'assets/Category/makhana.png',
    'Makhana': 'assets/Category/makhana.png',
    'Makhana ': 'assets/Category/makhana.png',
    'Dates': 'assets/Category/Almond.png',
    'Date': 'assets/Category/Almond.png',
    'Apricots': 'assets/Category/Almond.png',
    'Apricot': 'assets/Category/Almond.png',
    'Other Dry Fruits': 'assets/Category/Almond.png',
    'Other Dry Fruit': 'assets/Category/Almond.png'
};

const fallbackImage = 'assets/Category/Almond.png';

function getCategoryImage(category) {
    const trimmed = (category || '').trim();
    if (categoryImages[trimmed]) return categoryImages[trimmed];
    const lower = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(categoryImages)) {
        if (key.toLowerCase() === lower) return value;
    }
    return fallbackImage;
}

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
 * Syncs with Firebase: keeps "All" + categories from Firebase
 */
export async function populateHeaderDropdown() {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!dropdownContent) return;

    const categories = await getCategories();
    const targetSpans = new Set(categories);

    const existingItems = dropdownContent.querySelectorAll('.dropdown-item');
    existingItems.forEach(item => {
        const span = item.querySelector('span');
        if (!span || span.textContent.trim() === 'All') return;
        if (!targetSpans.has(span.textContent.trim())) {
            item.remove();
        }
    });

    const existingLinks = new Set(
        Array.from(dropdownContent.querySelectorAll('a.dropdown-item span'))
            .map(span => span.textContent.trim())
    );

    let html = '';
    categories.forEach(category => {
        if (existingLinks.has(category)) return;
        const imgSrc = getCategoryImage(category);
        html += `
            <a href="search.html?category=${encodeURIComponent(category)}" class="dropdown-item">
                <img src="${imgSrc}" alt="${category}" class="dropdown-category-icon">
                <span>${category}</span>
            </a>
        `;
    });

    if (html) {
        dropdownContent.insertAdjacentHTML('beforeend', html);
    }
}

/**
 * Populate category chips in search page
 * Syncs with Firebase: removes chips not in Firebase, adds missing ones
 */
export async function populateSearchCategoryChips(onChangeCallback) {
    const categoryFiltersContainer = document.getElementById('categoryFilters');
    if (!categoryFiltersContainer) return [];

    const categories = await getCategories();
    const targetValues = new Set(categories);

    const existingInputs = categoryFiltersContainer.querySelectorAll('input[type="checkbox"]');
    existingInputs.forEach(input => {
        if (!targetValues.has(input.value)) {
            input.parentElement.remove();
        }
    });

    categories.forEach(category => {
        const sanitizedCategory = category.toLowerCase().replace(/\s+/g, '-');
        const existing = categoryFiltersContainer.querySelector(`input[value="${category}"]`);
        if (existing) return;

        const chip = document.createElement('label');
        chip.className = 'chip';
        chip.innerHTML = `
            <input type="checkbox" name="category" id="cat-${sanitizedCategory}" value="${category}" hidden>
            <span>${category}</span>
        `;
        categoryFiltersContainer.appendChild(chip);
    });

    const newChips = categoryFiltersContainer.querySelectorAll('input');
    newChips.forEach(chip => {
        chip.addEventListener('change', onChangeCallback || (() => {}));
    });

    return newChips;
}

/**
 * Populate category cards in home page
 * Syncs with Firebase categories: removes extras not in Firebase, adds missing ones
 */
export async function populateHomeCategoryCards() {
    const categoryTrack = document.getElementById('categoryTrack');
    if (!categoryTrack) return;

    const categories = await getCategories();
    const targetLinks = new Set(categories.map(c => `search.html?category=${encodeURIComponent(c)}`));

    const existingCards = Array.from(categoryTrack.querySelectorAll('.category-card'));
    const toRemove = [];
    const toAdd = [];

    existingCards.forEach(card => {
        if (!targetLinks.has(card.dataset.link)) {
            toRemove.push(card);
        }
    });

    toRemove.forEach(card => card.remove());

    categories.forEach((category, index) => {
        const link = `search.html?category=${encodeURIComponent(category)}`;
        if (existingCards.find(c => c.dataset.link === link)) return;

        const imgSrc = getCategoryImage(category);
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.dataset.index = index;
        categoryCard.dataset.link = link;
        categoryCard.innerHTML = `
            <div class="category-card-inner">
                <img src="${imgSrc}" alt="${category}" class="category-card-img">
            </div>
            <span class="category-card-name">${category}</span>
        `;
        categoryTrack.appendChild(categoryCard);
    });

    categoryTrack.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const link = card.dataset.link;
            if (link) window.location.href = link;
        });
    });

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
