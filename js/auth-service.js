import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, fetchSignInMethodsForEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, PhoneAuthProvider, signInWithCredential, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB58VYjQEQE14d7P1XpA29ObwAn63ebIRQ",
  authDomain: "maharaja-489c9.firebaseapp.com",
  projectId: "maharaja-489c9",
  storageBucket: "maharaja-489c9.firebasestorage.app",
  messagingSenderId: "280319783948",
  appId: "1:280319783948:web:d872ff6f925f0669676a29",
  measurementId: "G-XKN880GYM8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export class AuthService {
    static async checkEmailExists(email) {
        console.log('AuthService: Checking email existence for:', email);
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            console.log('AuthService: Found methods:', methods);
            const exists = methods.length > 0;
            console.log('AuthService: Email exists:', exists);
            return exists;
        } catch (error) {
            console.error('AuthService: Error checking email:', error);
            return false;
        }
    }

    static async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async signUp(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    static async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async saveUserProfile(userId, profileData) {
        try {
            await setDoc(doc(db, "users", userId), profileData, { merge: true });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getUserProfile(userId) {
        try {
            const docSnap = await getDoc(doc(db, "users", userId));
            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            }
            return { success: false, error: "Profile not found" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async sendPhoneOTP(phoneNumber) {
        try {
            console.log('AuthService: Attempting to send OTP to:', phoneNumber);
            console.log('AuthService: recaptchaVerifier:', window.recaptchaVerifier);
            
            const provider = new PhoneAuthProvider(auth);
            console.log('AuthService: PhoneAuthProvider created');
            
            const verificationId = await provider.verifyPhoneNumber(phoneNumber, window.recaptchaVerifier);
            console.log('AuthService: OTP sent successfully, verificationId:', verificationId);
            
            return { success: true, verificationId };
        } catch (error) {
            console.error('AuthService: Error sending OTP:', error);
            console.error('AuthService: Error details:', error.code, error.message);
            
            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please try again later.';
            } else if (error.code === 'auth/invalid-phone-number') {
                errorMessage = 'Invalid phone number format.';
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = 'SMS quota exceeded. Please try again later.';
            } else if (error.message.includes('reCAPTCHA')) {
                errorMessage = 'reCAPTCHA verification failed. Please refresh and try again.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    static async verifyPhoneOTP(verificationId, otp) {
        try {
            const credential = PhoneAuthProvider.credential(verificationId, otp);
            const result = await signInWithCredential(auth, credential);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static getCurrentUser() {
        return auth.currentUser;
    }

    // Send email verification
    static async sendEmailVerification() {
        try {
            const user = auth.currentUser;
            if (!user) {
                return { success: false, error: 'No user logged in' };
            }

            await sendEmailVerification(user);
            return { success: true };
        } catch (error) {
            console.error('Error sending email verification:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if email is verified
    static async checkEmailVerification() {
        try {
            const user = auth.currentUser;
            if (!user) {
                return { success: false, error: 'No user logged in' };
            }

            // Reload user to get latest email verification status
            await user.reload();
            return { success: true, isVerified: user.emailVerified };
        } catch (error) {
            console.error('Error checking email verification:', error);
            return { success: false, error: error.message };
        }
    }
}