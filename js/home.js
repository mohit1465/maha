import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createProductCard } from './card-renderer.js';

// Minimal Product Card Renderer (moved here to avoid dependency issues)
function createMinimalProductCard(product) {
    const imageUrl = (product.images && product.images['1']) ? product.images['1'] :
        (product.image ? product.image : 'https://placehold.co/300x300?text=Maharaja');

    return `
        <div class="minimal-product-card" onclick="window.location.href='product.html?id=${product.id}'" style="cursor: pointer;">
            <div class="minimal-card-image-container" style="width: 100%; aspect-ratio: 1/1; border-radius: 20px; overflow: hidden; background: #f8f9fa;">
                <div class="minimal-card-image" style="width: 100%; height: 100%; background-image: url('${imageUrl}'); background-size: cover; background-position: center;"></div>
            </div>
            <div class="minimal-card-content" style="text-align: center; margin-top: 10px;">
                <div class="minimal-card-title" style="font-size: 15px; font-weight: 600;">${product.name}</div>
            </div>
        </div>
    `;
}

async function initHome() {
    console.log("Home JS Initializing...");

    // Selectors
    const popularRow = document.querySelector('.popular-products .card-row');
    const updatedRow = document.querySelector('.newly-updated .card-row');
    const highQualityRow = document.querySelector('.high-quality-dry-fruits .card-row');

    if (!popularRow || !updatedRow || !highQualityRow) {
        console.error("Row containers not found!");
        return;
    }

    // Default Demo Data
    const demoData = [
        { id: '1', name: 'Almonds Premium', price: 250 },
        { id: '2', name: 'Walnuts Kashmiri', price: 300 },
        { id: '3', name: 'Pistachios Roasted', price: 450 },
        { id: '4', name: 'Cashews Jumbo', price: 320 }
    ];

    const render = (container, products) => {
        container.innerHTML = products.map(p => `
            <div class="product-card-wrapper">
                ${createMinimalProductCard(p)}
            </div>
        `).join('');
    };

    // Initial state: show skeletons
    showHomeSkeletons(popularRow);
    showHomeSkeletons(updatedRow);
    showHighQualitySkeletons(highQualityRow);

    try {
        console.log("Fetching real products...");
        const querySnapshot = await getDocs(collection(db, "products"));
        const allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        if (allProducts.length > 0) {
            console.log("Populating with", allProducts.length, "real products");
            // Popular: Highest Price
            const popular = [...allProducts]
                .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
                .slice(0, 4);

            // Recent: by createdAt or id
            const recent = [...allProducts]
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 4);

            // High Quality: Premium products with high ratings or specific categories
            const highQuality = [...allProducts]
                .filter(p => p.category === 'Almonds' || p.category === 'Walnuts' || (p.rating && Number(p.rating) >= 4.5))
                .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
                .slice(0, 10);

            render(popularRow, popular);
            render(updatedRow, recent);
            renderHighQuality(highQualityRow, highQuality);
        }
    } catch (err) {
        console.error("Firebase load failed:", err);
    }

    function showHomeSkeletons(container) {
        if (!container) return;

        let skeletonsHtml = '';
        for (let i = 0; i < 4; i++) {
            skeletonsHtml += `
                <div class="product-card-wrapper">
                    <div class="minimal-product-card">
                        <div class="minimal-card-image-container skeleton" style="width: 100%; aspect-ratio: 1/1; border-radius: 20px; overflow: hidden;"></div>
                        <div class="minimal-card-content" style="text-align: center; margin-top: 10px; width: 100%;">
                            <div class="skeleton skeleton-text" style="width: 80%; margin: 0 auto;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = skeletonsHtml;
    }

    function showHighQualitySkeletons(container) {
        if (!container) return;

        let skeletonsHtml = '';
        for (let i = 0; i < 10; i++) {
            skeletonsHtml += `
                <div class="product-card-wrapper">
                    <div class="product-card skeleton">
                        <div class="skeleton-img" style="width: 100%; height: 100%; border-radius: 18px;"></div>
                    </div>
                </div>
            `;
        }
        // Add the "See More" button
        skeletonsHtml += `
            <div class="see-more-container">
                <a href="search.html" class="see-more-btn">
                    <span>See More Products</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;
        container.innerHTML = skeletonsHtml;
    }

    function renderHighQuality(container, products) {
        if (!container) return;
        
        let html = '';
        products.forEach(p => {
            html += `
                <div class="product-card-wrapper">
                    ${createProductCard(p)}
                </div>
            `;
        });
        // Add the "See More" button
        html += `
            <div class="see-more-container">
                <a href="search.html" class="see-more-btn">
                    <span>See More Products</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;
        container.innerHTML = html;
    }
}

// Ensure it runs after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
} else {
    initHome();
}
