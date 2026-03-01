import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const ordersContainer = document.getElementById('ordersContainer');
    const urlParams = new URLSearchParams(window.location.search);

    // Check for success message
    if (urlParams.get('success') === 'true') {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 500;';
        successMsg.innerHTML = `<i class="fas fa-check-circle"></i> Order placed successfully! Your Order ID is: ${urlParams.get('orderId')}`;
        ordersContainer.parentNode.insertBefore(successMsg, ordersContainer);

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    let currentFilter = 'All';
    let allOrders = [];

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            fetchAndRenderOrders(user.uid);
        } else {
            window.location.href = "login.html";
        }
    });

    async function fetchAndRenderOrders(uid) {
        try {
            showOrderSkeletons();
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                allOrders = data.orders || [];
                renderOrders();
            } else {
                showEmptyOrders();
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            ordersContainer.innerHTML = '<p>Something went wrong. Please try refreshing.</p>';
        }
    }

    function renderOrders() {
        if (allOrders.length === 0) {
            showEmptyOrders();
            return;
        }

        const filteredOrders = currentFilter === 'All'
            ? allOrders
            : allOrders.filter(order => order.status.toLowerCase() === currentFilter.toLowerCase());

        const statuses = ['All', 'Processing', 'Confirmed', 'Shipped', 'Delivered'];

        // Header with Filters
        let html = `
        <div class="filters-container" style="display: flex; gap: 10px; margin-bottom: 25px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none;">
            ${statuses.map(status => `
                <div class="filter-tag ${currentFilter === status ? 'active' : ''}" 
                     data-status="${status}"
                     style="padding: 8px 20px; border-radius: 50px; cursor: pointer; font-size: 14px; font-weight: 600; white-space: nowrap; transition: all 0.3s ease; 
                            ${currentFilter === status
                ? 'background: var(--gradient-brand); color: white; box-shadow: 0 5px 15px rgba(252, 110, 32, 0.2);'
                : 'background: #f5f5f5; color: #666; border: 1px solid #eee;'}">
                    ${status}
                </div>
            `).join('')}
        </div>
        `;

        // Calculate Summary for filtered orders
        const totalOrdersCount = filteredOrders.length;
        const totalAmountSpent = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);

        html += `
        <div class="orders-summary-card" style="background: #fafafa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1.5px dashed #ddd; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="text-align: center; border-right: 1px solid #eee;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Orders (${currentFilter})</div>
                <div style="font-size: 24px; font-weight: 700; color: #323232;">${totalOrdersCount}</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Amount Spent</div>
                <div style="font-size: 24px; font-weight: 700; color: #fc6e20;">₹${totalAmountSpent.toLocaleString('en-IN')}</div>
            </div>
        </div>
        `;

        if (filteredOrders.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No orders found with status "${currentFilter}"</p>
                </div>
            `;
        } else {
            filteredOrders.forEach(order => {
                html += `
                <div class="order-card" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px;">
                        <div>
                            <div style="font-weight: 700; color: #323232;">Order #${order.orderId}</div>
                            <div style="font-size: 13px; color: #888;">Placed on ${new Date(order.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div style="background: #fff4e5; color: #fc6e20; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${order.status}</div>
                    </div>
                    
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center;">
                                    <div style="width: 40px; height: 40px; background-image: url('${(item.images && item.images['1']) ? item.images['1'] : 'https://placehold.co/150x150?text=Maharaja'}'); background-size: cover; background-position: center; border-radius: 4px; margin-right: 12px;"></div>
                                    <div>
                                        <div style="font-weight: 500; font-size: 14px;">${item.name}</div>
                                        <div style="font-size: 12px; color: #888;">${item.size} × ${item.quantity}</div>
                                    </div>
                                </div>
                                <div style="font-weight: 600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: #666; font-size: 14px;">Total Amount</div>
                        <div style="font-size: 18px; font-weight: 700; color: #fc6e20;">₹${order.total.toLocaleString('en-IN')}</div>
                    </div>
                </div>
                `;
            });
        }

        ordersContainer.innerHTML = html;
        ordersContainer.style.padding = '20px 0';
        ordersContainer.style.textAlign = 'initial';

        // Add Click Listeners
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.onclick = () => {
                currentFilter = tag.dataset.status;
                renderOrders();
            };
        });
    }

    function showOrderSkeletons() {
        let skeletonsHtml = '';
        for (let i = 0; i < 3; i++) {
            skeletonsHtml += `
            <div class="order-card" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left; border: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px;">
                    <div>
                        <div class="skeleton" style="width: 120px; height: 18px; margin-bottom: 8px;"></div>
                        <div class="skeleton" style="width: 80px; height: 14px;"></div>
                    </div>
                    <div class="skeleton" style="width: 60px; height: 20px; border-radius: 20px;"></div>
                </div>
                
                <div class="order-items">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center;">
                            <div class="skeleton" style="width: 40px; height: 40px; border-radius: 4px; margin-right: 12px;"></div>
                            <div>
                                <div class="skeleton" style="width: 150px; height: 16px; margin-bottom: 6px;"></div>
                                <div class="skeleton" style="width: 100px; height: 14px;"></div>
                            </div>
                        </div>
                        <div class="skeleton" style="width: 60px; height: 18px;"></div>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
                    <div class="skeleton" style="width: 100px; height: 16px;"></div>
                    <div class="skeleton" style="width: 80px; height: 22px;"></div>
                </div>
            </div>
            `;
        }
        ordersContainer.innerHTML = skeletonsHtml;
        ordersContainer.style.textAlign = 'initial';
        ordersContainer.style.padding = '20px 0';
    }

    function showEmptyOrders() {
        ordersContainer.innerHTML = `
            <i class="fas fa-box-open" style="font-size: 60px; color: #ddd; margin-bottom: 20px;"></i>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here!</p>
            <a href="search.html" class="btn-primary" style="display: inline-block; margin-top: 20px; padding: 12px 30px; text-decoration: none; background: #fc6e20; color: white; border-radius: 8px;">Explore Products</a>
        `;
        ordersContainer.style.padding = '100px 0';
        ordersContainer.style.textAlign = 'center';
    }
});
