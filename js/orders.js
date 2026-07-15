import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function withTimeout(promise, timeoutMs = 4000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        )
    ]);
}

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
            const userSnap = await withTimeout(getDoc(userRef));

            let orders = [];
            if (userSnap.exists()) {
                const data = userSnap.data();
                orders = data.orders || [];
            }

            // Also fetch orders from dedicated subcollection (used by Buy Now flow)
            try {
                const ordersRef = collection(db, "users", uid, "orders");
                const ordersSnap = await withTimeout(getDocs(ordersRef));
                ordersSnap.forEach(doc => {
                    orders.push({ id: doc.id, ...doc.data() });
                });
            } catch (subError) {
                console.warn("Could not fetch orders subcollection:", subError);
            }

            // Sort by timestamp descending
            orders.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA;
            });

            allOrders = orders;
            renderOrders();
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

        // Calculate Summary for filtered orders - removed summary card rendering as requested

        if (filteredOrders.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No orders found with status "${currentFilter}"</p>
                </div>
            `;
        } else {
            filteredOrders.forEach(order => {
                let step = 1;
                const statusLower = (order.status || '').toLowerCase();
                if (statusLower === 'processing' || statusLower === 'pending' || statusLower === 'order placed') {
                    step = 1;
                } else if (statusLower === 'confirmed' || statusLower === 'order confirmed') {
                    step = 2;
                } else if (statusLower === 'shipped') {
                    step = 3;
                } else if (statusLower === 'out for delivery' || statusLower === 'out_for_delivery') {
                    step = 4;
                } else if (statusLower === 'delivered') {
                    step = 5;
                }
                
                let progressPercent = 0;
                if (step === 2) progressPercent = 25;
                else if (step === 3) progressPercent = 50;
                else if (step === 4) progressPercent = 75;
                else if (step === 5) progressPercent = 100;

                let stepperHtml = '';
                if (statusLower === 'cancelled') {
                    stepperHtml = `
                        <div style="background: #fff5f5; color: #e53e3e; border-radius: 8px; padding: 10px 15px; margin: 15px 0; font-weight: 600; text-align: center; font-size: 13px; border: 1px solid #fed7d7; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-times-circle" style="font-size: 16px;"></i> This order has been cancelled.
                        </div>
                    `;
                } else {
                    stepperHtml = `
                        <div class="order-stepper" style="display: flex; justify-content: space-between; position: relative; margin: 25px 0 20px 0; padding: 0 5px;">
                            <div class="stepper-line" style="position: absolute; top: 12px; left: 8%; right: 8%; height: 3px; background: #e2e8f0; z-index: 1;"></div>
                            <div class="stepper-line-active" style="position: absolute; top: 12px; left: 8%; width: calc(${progressPercent}% * 0.84); height: 3px; background: #fc6e20; z-index: 1; transition: width 0.5s ease;"></div>
                            
                            <div style="text-align: center; z-index: 2; flex: 1;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step >= 1 ? '#fc6e20' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto; font-size: 9px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${step >= 1 ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '1'}
                                </div>
                                <div style="font-size: 10px; font-weight: ${step >= 1 ? '600' : '400'}; color: ${step >= 1 ? '#fc6e20' : '#64748b'};">Placed</div>
                            </div>
                            
                            <div style="text-align: center; z-index: 2; flex: 1;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step >= 2 ? '#fc6e20' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto; font-size: 9px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${step >= 2 ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '2'}
                                </div>
                                <div style="font-size: 10px; font-weight: ${step >= 2 ? '600' : '400'}; color: ${step >= 2 ? '#fc6e20' : '#64748b'};">Confirmed</div>
                            </div>
                            
                            <div style="text-align: center; z-index: 2; flex: 1;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step >= 3 ? '#fc6e20' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto; font-size: 9px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${step >= 3 ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '3'}
                                </div>
                                <div style="font-size: 10px; font-weight: ${step >= 3 ? '600' : '400'}; color: ${step >= 3 ? '#fc6e20' : '#64748b'};">Shipped</div>
                            </div>
                            
                            <div style="text-align: center; z-index: 2; flex: 1;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step >= 4 ? '#fc6e20' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto; font-size: 9px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${step >= 4 ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '4'}
                                </div>
                                <div style="font-size: 10px; font-weight: ${step >= 4 ? '600' : '400'}; color: ${step >= 4 ? '#fc6e20' : '#64748b'};">Out for Delivery</div>
                            </div>
                            
                            <div style="text-align: center; z-index: 2; flex: 1;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step >= 5 ? '#22c55e' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto; font-size: 9px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${step >= 5 ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '5'}
                                </div>
                                <div style="font-size: 10px; font-weight: ${step >= 5 ? '600' : '400'}; color: ${step >= 5 ? '#22c55e' : '#64748b'};">Delivered</div>
                            </div>
                        </div>
                    `;
                }

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
                    
                    ${stepperHtml}
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <div style="color: #888; font-size: 12px; text-transform: uppercase;">Payment Method</div>
                            <div style="font-size: 14px; font-weight: 500; color: #323232;">
                                ${order.payment?.method || 'N/A'} 
                                ${order.payment?.paymentId ? `<br><small style="color: #999; font-size: 11px;">ID: ${order.payment.paymentId}</small>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px; margin-left: auto;">
                            <button onclick="window.downloadInvoice('${btoa(encodeURIComponent(JSON.stringify(order)))}')" class="btn-download-invoice" style="background: white; border: 1.5px solid #fc6e20; color: #fc6e20; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                                <i class="fas fa-file-pdf"></i> Download Invoice
                            </button>
                            <div style="text-align: right;">
                                <div style="color: #666; font-size: 13px;">Total Amount</div>
                                <div style="font-size: 18px; font-weight: 700; color: #fc6e20;">₹${order.total.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
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

// --- DYNAMIC INVOICE DOWNLOADER (jspdf) ---
async function loadJsPDF() {
    if (window.jspdf) return window.jspdf;
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve(window.jspdf);
        script.onerror = () => reject(new Error('Failed to load jsPDF'));
        document.head.appendChild(script);
    });
}

window.downloadInvoice = async function(orderB64) {
    const order = JSON.parse(decodeURIComponent(atob(orderB64)));
    console.log("Generating invoice for order:", order);
    
    try {
        const jspdfModule = await loadJsPDF();
        const { jsPDF } = jspdfModule;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const primaryColor = [252, 110, 32];
        const darkColor = [50, 50, 50];
        const grayColor = [128, 128, 128];
        
        // 1. Header (Brand Logo / Name)
        doc.setFillColor(255, 248, 242);
        doc.rect(0, 0, 210, 45, 'F');
        
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("MAHARAJA DRY FRUITS", 20, 20);
        
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text("Premium Taste Without Premium Price", 20, 25);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("Hisar, Haryana - 125001", 20, 31);
        doc.text("Email: support@maharajadryfruits.com | Contact: +91 99999 99999", 20, 36);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("INVOICE", 150, 20);
        
        // 2. Order Metadata Info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(`Invoice No: INV-${order.orderId}`, 150, 26);
        const orderDate = new Date(order.timestamp).toLocaleDateString('en-IN');
        doc.text(`Date: ${orderDate}`, 150, 31);
        doc.text(`Status: Paid`, 150, 36);
        
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        // 3. Billing & Shipping Info
        const shipping = order.shipping || {};
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("BILLED TO:", 20, 56);
        
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(shipping.name || "Customer", 20, 62);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text([
            shipping.address || "N/A",
            `${shipping.city || ""}, ${shipping.state || ""} - ${shipping.pin || ""}`,
            `Phone: ${shipping.phone || "N/A"}`,
            `Email: ${shipping.email || order.email || "N/A"}`
        ], 20, 67);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("PAYMENT INFO:", 120, 56);
        
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const payment = order.payment || {};
        doc.text([
            `Method: ${payment.method || "Cash on Delivery"}`,
            `Status: ${payment.status || "Paid"}`,
            payment.paymentId ? `Transaction ID: ${payment.paymentId}` : "Transaction ID: N/A"
        ], 120, 62);
        
        doc.line(20, 92, 190, 92);
        
        // 4. Items Table
        doc.setFillColor(245, 245, 245);
        doc.rect(20, 98, 170, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        
        doc.text("Item Description", 23, 103);
        doc.text("Size", 90, 103);
        doc.text("Qty", 120, 103);
        doc.text("Unit Price", 140, 103);
        doc.text("Total", 170, 103);
        
        let y = 112;
        const items = order.items || [];
        
        doc.setFont('helvetica', 'normal');
        items.forEach(item => {
            doc.text(item.name || "Product", 23, y);
            doc.text(item.size || "250g", 90, y);
            doc.text(String(item.quantity), 120, y);
            doc.text(`₹${item.price.toLocaleString('en-IN')}`, 140, y);
            const totalItemPrice = item.price * item.quantity;
            doc.text(`₹${totalItemPrice.toLocaleString('en-IN')}`, 170, y);
            
            doc.setDrawColor(245, 245, 245);
            doc.line(20, y + 3, 190, y + 3);
            y += 10;
        });
        
        const subtotal = payment.subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = payment.discount || 0;
        const gstAmount = parseFloat(((order.total) * 0.05).toFixed(2));
        
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text("Subtotal:", 130, y);
        doc.text(`₹${subtotal.toLocaleString('en-IN')}`, 170, y);
        
        if (discount > 0) {
            y += 6;
            doc.text("Discount Applied:", 130, y);
            doc.text(`-₹${discount.toLocaleString('en-IN')}`, 170, y);
        }
        
        y += 6;
        doc.text("GST (5% Included):", 130, y);
        doc.text(`₹${gstAmount.toLocaleString('en-IN')}`, 170, y);
        
        y += 8;
        doc.setFillColor(255, 248, 242);
        doc.rect(125, y - 5, 65, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Grand Total:", 130, y);
        doc.text(`₹${order.total.toLocaleString('en-IN')}`, 170, y);
        
        y += 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text("Thank you for shopping with Maharaja!", 105, y, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("This is a computer-generated invoice and requires no physical signature.", 105, y + 5, { align: 'center' });
        
        doc.save(`Invoice-${order.orderId}.pdf`);
        
    } catch (err) {
        console.error("Failed to generate PDF:", err);
        alert("Failed to generate PDF invoice. Please check console logs.");
    }
};
