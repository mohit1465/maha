import { db, auth } from './firebase-config.js';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class WishlistService {
    constructor() {
        this.wishlist = new Set();
        this.listeners = [];
        this.unsubscribe = null;
        this.isLoaded = false;

        // Listen for auth changes to sync wishlist
        auth.onAuthStateChanged(user => {
            if (user) {
                this.initWishlist(user.uid);
            } else {
                this.wishlist.clear();
                this.isLoaded = false;
                this.notifyListeners();
                if (this.unsubscribe) this.unsubscribe();
            }
        });
    }

    async initWishlist(uid) {
        const wishlistRef = doc(db, "users", uid);

        this.unsubscribe = onSnapshot(wishlistRef, (doc) => {
            const data = doc.exists() ? doc.data() : {};
            const items = data.wishlist || [];
            this.wishlist = new Set(items);
            this.isLoaded = true;
            this.notifyListeners();
        });
    }

    async toggleWishlist(productId) {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login to use wishlist");
            return false;
        }

        const userRef = doc(db, "users", user.uid);

        if (this.wishlist.has(productId)) {
            // Remove
            await updateDoc(userRef, {
                wishlist: arrayRemove(productId)
            });
            return false; // Removed
        } else {
            // Add
            // First ensure doc exists (it should, but just in case)
            await setDoc(userRef, { wishlist: arrayUnion(productId) }, { merge: true });
            return true; // Added
        }
    }

    isInWishlist(productId) {
        return this.wishlist.has(productId);
    }

    // Observer pattern for UI updates
    addListener(callback) {
        this.listeners.push(callback);
        // Immediate callback with current state
        callback(Array.from(this.wishlist), this.isLoaded);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notifyListeners() {
        const list = Array.from(this.wishlist);
        this.listeners.forEach(cb => cb(list, this.isLoaded));
    }

    async getWishlistItems() {
        const user = auth.currentUser;
        if (!user) return [];

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            return userDoc.data().wishlist || [];
        }
        return [];
    }
}

const wishlistService = new WishlistService();
export default wishlistService;
