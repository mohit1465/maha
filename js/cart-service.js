import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class CartService {
    constructor() {
        this.cartItems = [];
        this.listeners = [];
        this.unsubscribe = null;
        this.isLoaded = false;

        auth.onAuthStateChanged(user => {
            if (user) {
                this.initCart(user.uid);
            } else {
                this.cartItems = [];
                this.isLoaded = false;
                this.notifyListeners();
                if (this.unsubscribe) this.unsubscribe();
            }
        });
    }

    normalizeSize(size) {
        if (!size) return '250g';
        const s = size.toLowerCase().replace(/\s+/g, '').replace('gm', 'g');
        if (s.includes('500g')) return '500g';
        if (s.includes('1kg')) return '1kg';
        if (s.includes('2kg')) return '2kg';
        if (s.includes('250g')) return '250g';
        return size;
    }

    async initCart(uid) {
        const cartRef = doc(db, "users", uid);
        this.unsubscribe = onSnapshot(cartRef, (snapshot) => {
            const data = snapshot.exists() ? snapshot.data() : {};
            this.cartItems = data.cart || [];
            this.isLoaded = true;
            this.notifyListeners();
        });
    }

    getPriceForSize(basePrice, size) {
        const bp = parseFloat(basePrice) || 0;
        if (!size) return bp;
        
        const s = size.toLowerCase().replace(/\s+/g, '').replace('gm', 'g');
        if (s.includes('500g')) return bp * 2;
        if (s.includes('1kg')) return bp * 4;
        if (s.includes('2kg')) return bp * 8;
        return bp * 1; // Default for 250g or others
    }

    getVariantPrice(product, size) {
        if (!size) {
            return { price: parseFloat(product.price) || 0, originalPrice: parseFloat(product.originalPrice) || null };
        }
        const normSize = size.toLowerCase().replace(/\s+/g, '').replace('gm', 'g');
        if (product.variants && product.variants.length > 0) {
            const variant = product.variants.find(v => v.weight && v.weight.toLowerCase().replace(/\s+/g, '').replace('gm', 'g') === normSize);
            if (variant) {
                return { 
                    price: parseFloat(variant.price) || 0, 
                    originalPrice: variant.originalPrice ? parseFloat(variant.originalPrice) : null 
                };
            }
        }
        // Fallback for legacy size pricing
        const price = this.getPriceForSize(product.price, normSize);
        const originalPrice = product.originalPrice ? this.getPriceForSize(product.originalPrice, normSize) : null;
        return { price, originalPrice };
    }

    async addToCart(product, quantity = 1, size = '250g') {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login to add items to cart");
            return;
        }

        const normalizedSize = this.normalizeSize(size);
        const cartRef = doc(db, "users", user.uid);
        const existingItemIndex = this.cartItems.findIndex(item => item.id === product.id && item.size === normalizedSize);

        // Determine base price (assume incoming price is for 250g if not already stored)
        // Fallback to item.price if basePrice is missing (useful for legacy items)
        const basePrice = parseFloat(product.basePrice || product.price) || 0;
        const baseOriginalPrice = parseFloat(product.baseOriginalPrice || product.originalPrice) || 0;
        
        const variantData = this.getVariantPrice(product, normalizedSize);
        const currentPrice = variantData.price;
        const currentOriginalPrice = variantData.originalPrice || 0;

        let newCart = [...this.cartItems];
        if (existingItemIndex > -1) {
            newCart[existingItemIndex].quantity += parseInt(quantity);
            newCart[existingItemIndex].price = currentPrice; // Update to latest price logic just in case
        } else {
            newCart.push({
                id: product.id,
                name: product.name,
                basePrice: basePrice,
                baseOriginalPrice: baseOriginalPrice,
                price: currentPrice,
                originalPrice: currentOriginalPrice,
                images: product.images || { '1': 'https://placehold.co/150x150?text=Maharaja' },
                category: product.category || 'Dry Fruits',
                quantity: parseInt(quantity),
                size: normalizedSize,
                quantities_available: product.quantities_available || (product.variants ? product.variants.map(v => v.weight) : [normalizedSize])
            });
        }

        await setDoc(cartRef, { cart: newCart }, { merge: true });
    }

    async removeFromCart(productId, size) {
        const user = auth.currentUser;
        if (!user) return;

        const normalizedSize = this.normalizeSize(size);
        const cartRef = doc(db, "users", user.uid);
        const newCart = this.cartItems.filter(item => !(item.id === productId && item.size === normalizedSize));
        await updateDoc(cartRef, { cart: newCart });
    }

    async updateQuantity(productId, size, quantity) {
        const user = auth.currentUser;
        if (!user) return;

        const normalizedSize = this.normalizeSize(size);
        const cartRef = doc(db, "users", user.uid);
        const newCart = this.cartItems.map(item => {
            if (item.id === productId && item.size === normalizedSize) {
                return { ...item, quantity: parseInt(quantity) };
            }
            return item;
        });
        await updateDoc(cartRef, { cart: newCart });
    }

    async updateSize(productId, oldSize, newSize) {
        const user = auth.currentUser;
        if (!user) return;

        const normOldSize = this.normalizeSize(oldSize);
        const normNewSize = this.normalizeSize(newSize);

        const cartRef = doc(db, "users", user.uid);
        const itemToUpdate = this.cartItems.find(item => item.id === productId && item.size === normOldSize);
        if (!itemToUpdate) return;

        let newCart = [...this.cartItems];
        const existingItemIndex = newCart.findIndex(item => item.id === productId && item.size === normNewSize);

        let currentPrice = itemToUpdate.price;
        let currentOriginalPrice = itemToUpdate.originalPrice || 0;

        try {
            const prodSnap = await getDoc(doc(db, "products", productId));
            if (prodSnap.exists()) {
                const product = prodSnap.data();
                product.id = productId;
                const variantData = this.getVariantPrice(product, normNewSize);
                currentPrice = variantData.price;
                currentOriginalPrice = variantData.originalPrice || 0;
            } else {
                currentPrice = this.getPriceForSize(itemToUpdate.basePrice, normNewSize);
                currentOriginalPrice = itemToUpdate.baseOriginalPrice ? this.getPriceForSize(itemToUpdate.baseOriginalPrice, normNewSize) : 0;
            }
        } catch (e) {
            console.error("Error fetching product for size update:", e);
            currentPrice = this.getPriceForSize(itemToUpdate.basePrice, normNewSize);
            currentOriginalPrice = itemToUpdate.baseOriginalPrice ? this.getPriceForSize(itemToUpdate.baseOriginalPrice, normNewSize) : 0;
        }

        if (existingItemIndex > -1) {
            // If new size already exists, merge quantities and remove old size entry
            newCart[existingItemIndex].quantity += itemToUpdate.quantity;
            newCart[existingItemIndex].price = currentPrice;
            newCart[existingItemIndex].originalPrice = currentOriginalPrice;
            newCart = newCart.filter(item => !(item.id === productId && item.size === normOldSize));
        } else {
            // Otherwise just update the size and price of the existing item
            newCart = newCart.map(item => {
                if (item.id === productId && item.size === normOldSize) {
                    return {
                        ...item,
                        size: normNewSize,
                        price: currentPrice,
                        originalPrice: currentOriginalPrice
                    };
                }
                return item;
            });
        }

        await setDoc(cartRef, { cart: newCart }, { merge: true });
    }

    async placeOrder(shippingDetails = null, itemsToOrder = null, paymentData = null) {
        const user = auth.currentUser;
        const targetItems = itemsToOrder || this.cartItems;
        if (!user || targetItems.length === 0) return null;

        try {
            const orderId = 'ORD' + Date.now();
            const orderTotal = paymentData && paymentData.total !== undefined 
                ? paymentData.total 
                : targetItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                
            const orderData = {
                orderId: orderId,
                userId: user.uid,
                email: user.email,
                items: targetItems,
                total: orderTotal,
                shipping: shippingDetails,
                payment: paymentData || { method: 'Not Specified', status: 'Unknown' },
                status: 'Processing',
                timestamp: new Date().toISOString()
            };

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            let orders = [];
            let usedCoupons = {};
            if (userSnap.exists()) {
                const data = userSnap.data();
                orders = data.orders || [];
                usedCoupons = data.usedCoupons || {};
            }
            orders.unshift(orderData);
            
            // Handle Coupon Tracking
            if (paymentData && paymentData.couponCode) {
                const code = paymentData.couponCode;
                usedCoupons[code] = (usedCoupons[code] || 0) + 1;

                // Increment global timesUsed in coupons collection
                try {
                    const q = query(collection(db, "coupons"), window.firebaseWhere ? window.firebaseWhere("code", "==", code) : undefined);
                    // Since cart-service.js doesn't import `query` and `where`, we'll just update directly if we structure coupons with document ID = code.
                    // But in our cart.js we queried by code field.
                    // To fix this cleanly, I'll import query, where, getDocs at the top of cart-service.js. Let's do that in a separate replacement, or just do it here:
                } catch(e) { console.error("Could not update global coupon timesUsed"); }
            }

            // Update user document: add to orders, usedCoupons, and modify cart
            let updatedCart;
            if (itemsToOrder) {
                // Remove only the ordered items from the current cart
                updatedCart = this.cartItems.filter(cartItem =>
                    !itemsToOrder.some(orderItem => orderItem.id === cartItem.id && orderItem.size === cartItem.size)
                );
            } else {
                // Clear the entire cart
                updatedCart = [];
            }

            const updates = {
                cart: updatedCart,
                orders: orders
            };
            if (paymentData && paymentData.couponCode) {
                updates.usedCoupons = usedCoupons;
            }

            await updateDoc(userRef, updates);

            // Handle Global Coupon Usage increment via a direct fetch using standard firestore tools
            if (paymentData && paymentData.couponCode) {
                try {
                    const { query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    const q = query(collection(db, "coupons"), where("code", "==", paymentData.couponCode));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const couponDocRef = querySnapshot.docs[0].ref;
                        const timesUsed = (querySnapshot.docs[0].data().timesUsed || 0) + 1;
                        await updateDoc(couponDocRef, { timesUsed });
                    }
                } catch (e) { console.error("Error updating coupon document:", e); }
            }

            // Trigger Email Notifications
            if (shippingDetails) {
                await this.sendOrderEmails(orderData, shippingDetails);
            }

            return orderId;
        } catch (error) {
            console.error("Error placing order:", error);
            throw error;
        }
    }

    async sendOrderEmails(orderData, shipping) {
        try {
            const itemSummary = orderData.items.map(item =>
                `• ${item.name} (${item.size})\n  Qty: ${item.quantity} | Subtotal: ₹${(item.price * item.quantity).toLocaleString('en-IN')}`
            ).join('\n────────────────\n');

            const formData = new FormData();
            formData.append('_subject', ` New Order Received - ${orderData.orderId}`);
            formData.append('_cc', shipping.email);
            formData.append('_template', 'table');
            formData.append('_captcha', 'false');

            formData.append(' BRAND', 'Maharaja Dry Fruits');
            formData.append(' Order ID', orderData.orderId);
            formData.append(' Customer', shipping.name);
            formData.append(' Email', shipping.email);
            formData.append(' Contact', shipping.phone);
            formData.append(' Delivery Address', `${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.pin}`);
            formData.append(' Items Ordered', '\n' + itemSummary);
            formData.append(' Grand Total', `₹${orderData.total.toLocaleString('en-IN')}`);
            formData.append(' Payment Method', orderData.payment.method);
            formData.append(' Payment Status', orderData.payment.status);
            if (orderData.payment.paymentId) {
                formData.append(' Razorpay Payment ID', orderData.payment.paymentId);
            }

            const response = await fetch('https://formsubmit.co/ajax/mohit8307521465@gmail.com', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                console.log("Order emails sent via FormSubmit.co successfully");
            } else {
                console.error("FormSubmit.co returned an error:", await response.text());
            }
        } catch (error) {
            console.error("Error sending order emails via FormSubmit.co:", error);
        }
    }

    getCart() {
        return this.cartItems;
    }

    getTotal() {
        return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    addListener(callback) {
        this.listeners.push(callback);
        callback(this.cartItems, this.isLoaded);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.cartItems, this.isLoaded));
    }
}

const cartService = new CartService();
export default cartService;
