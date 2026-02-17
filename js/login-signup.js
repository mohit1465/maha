import { AuthService } from './auth-service.js';
import { getAuth, fetchSignInMethodsForEmail, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

class AuthFlow {
    constructor() {
        this.currentStep = 1;
        this.userEmail = '';
        this.authMode = null; // "login" or "signup"
        this.profileData = {};
        this.maxSteps = 8; // Updated for email-only auth
        
        this.initializeElements();
        this.attachEventListeners();
        this.showStep(1);
    }

    initializeElements() {
        // Step elements
        this.steps = document.querySelectorAll('.step');
        this.stepTitle = document.getElementById('stepTitle');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');

        // Step 1: Entry
        this.emailEntryBtn = document.getElementById('emailEntryBtn');
        this.googleEntryBtn = document.getElementById('googleEntryBtn');

        // Step 2: Email Input
        this.emailInput = document.getElementById('emailInput');
        this.emailNextBtn = document.getElementById('emailNextBtn');

        // Step 3: Password Verification (Existing Users)
        this.existingEmailDisplay = document.getElementById('existingEmailDisplay');
        this.loginPassword = document.getElementById('loginPassword');
        this.verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
        this.forgotPasswordLink = document.getElementById('forgotPasswordLink');

        // Step 4: Create Password (New Users)
        this.createPassword = document.getElementById('createPassword');
        this.createAccountBtn = document.getElementById('createAccountBtn');
        this.newEmailDisplay = document.getElementById('newEmailDisplay');

        // Step 5: Name
        this.firstName = document.getElementById('firstName');
        this.lastName = document.getElementById('lastName');
        this.nameNextBtn = document.getElementById('nameNextBtn');

        // Step 6: Date of Birth
        this.dob = document.getElementById('dob');
        this.dobNextBtn = document.getElementById('dobNextBtn');

        // Step 7: Discovery Source
        this.discoverySource = document.getElementById('discoverySource');
        this.discoveryButtons = document.querySelectorAll('.step[data-step="7"] .option-btn');

        // Step 8: Food Preference
        this.foodPreference = document.getElementById('foodPreference');
        this.foodButtons = document.querySelectorAll('.step[data-step="8"] .option-btn');
        this.startShoppingBtn = document.getElementById('startShoppingBtn');

        // Recovery Flow
        this.forgotPasswordSection = document.getElementById('forgotPasswordSection');
        this.unifiedAuthSection = document.getElementById('unifiedAuthSection');
        this.recoveryEmail = document.getElementById('recoveryEmail');
        this.sendRecoveryBtn = document.getElementById('sendRecoveryBtn');
        this.cancelRecoveryBtn = document.getElementById('cancelRecoveryBtn');

        // Back buttons
        this.backButtons = document.querySelectorAll('.back-btn');
    }

    initializeRecaptcha() {
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow OTP sending
                    console.log('reCAPTCHA verified');
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                    console.log('reCAPTCHA expired');
                }
            });
        } catch (error) {
            console.error('Error initializing reCAPTCHA:', error);
            // Fallback: create a simple verifier without reCAPTCHA for testing
            window.recaptchaVerifier = {
                verifyPhoneNumber: async (phoneNumber) => {
                    // For testing purposes, skip reCAPTCHA
                    console.log('Skipping reCAPTCHA for testing');
                    return null;
                }
            };
        }
    }

    attachEventListeners() {
        // Step 1
        this.emailEntryBtn.addEventListener('click', () => this.showStep(2));
        this.googleEntryBtn.addEventListener('click', () => this.handleGoogleSignIn());
        
        // Step 2
        this.emailNextBtn.addEventListener('click', () => this.handleEmailSubmit());
        this.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleEmailSubmit();
        });

        // Step 3
        this.verifyPasswordBtn.addEventListener('click', () => this.handlePasswordVerification());
        this.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePasswordVerification();
        });
        this.forgotPasswordLink.addEventListener('click', () => this.showForgotPassword());

        // Step 4
        this.createAccountBtn.addEventListener('click', () => this.handleAccountCreation());
        this.createPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAccountCreation();
        });

        // Step 5: Name
        this.nameNextBtn.addEventListener('click', () => this.handleNameSubmit());

        // Step 6: Date of Birth
        this.dobNextBtn.addEventListener('click', () => this.handleDobSubmit());

        // Step 7: Discovery Source
        this.discoveryButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleDiscoverySelection(btn));
        });

        // Step 8: Food Preference
        this.foodButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleFoodSelection(btn));
        });
        this.startShoppingBtn.addEventListener('click', () => this.handleProfileCompletion());

        // Recovery Flow
        this.sendRecoveryBtn.addEventListener('click', () => this.handlePasswordReset());
        this.cancelRecoveryBtn.addEventListener('click', () => this.hideForgotPassword());

        // Back buttons
        this.backButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleBack());
        });
    }

    goToStep(stepNumber) {
        // Validate step transitions based on authMode
        if (stepNumber === 3 && this.authMode !== "login") {
            console.error('Cannot go to step 3 without login mode');
            return;
        }
        if (stepNumber === 4 && this.authMode !== "signup") {
            console.error('Cannot go to step 4 without signup mode');
            return;
        }
        
        this.showStep(stepNumber);
    }

    showStep(stepNumber) {
        console.log(`Attempting to show step ${stepNumber}`);
        
        // Hide all steps
        this.steps.forEach(step => step.classList.remove('active'));
        
        // Show current step
        const currentStepElement = document.querySelector(`.step[data-step="${stepNumber}"]`);
        console.log('Found step element:', currentStepElement);
        
        if (currentStepElement) {
            currentStepElement.classList.add('active');
            console.log(`Step ${stepNumber} is now active`);
        } else {
            console.error(`Step ${stepNumber} element not found!`);
        }

        this.currentStep = stepNumber;
        this.updateProgress();
        this.updateStepTitle();
    }

    updateProgress() {
        if (this.currentStep > 1) {
            this.progressContainer.style.display = 'block';
            const progress = (this.currentStep - 1) / (this.maxSteps - 1) * 100;
            this.progressBar.style.width = `${progress}%`;
            this.progressText.textContent = `Step ${this.currentStep - 1} of ${this.maxSteps - 1}`;
            this.progressContainer.style.display = 'block';
        }
    }

    updateStepTitle() {
        const titles = {
            1: 'Continue to buy fresh dry fruits',
            2: 'Enter your email address',
            3: 'Enter your password',
            4: 'Enter your pass',
            5: 'Enter your name',
            6: 'Select your date of birth',
            7: 'How did you hear about us?',
            8: 'What do you like the most?'
        };
        this.stepTitle.textContent = titles[this.currentStep] || 'Continue';
    }

    async handleGoogleSignIn() {
        this.showLoading(true);
        try {
            const result = await AuthService.signInWithGoogle();
            if (result.success) {
                // Check if profile is complete
                const profileResult = await AuthService.getUserProfile(result.user.uid);
                if (profileResult.success && this.isProfileComplete(profileResult.data)) {
                    // Profile complete - go to homepage
                    window.location.href = 'index.html';
                } else {
                    // Profile incomplete - go to profile steps
                    this.userEmail = result.user.email;
                    this.showStep(5);
                }
            } else {
                this.showError('Google sign-in failed. Please try again.');
            }
        } catch (error) {
            this.showError('Google sign-in failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleEmailSubmit() {
        const email = this.emailInput.value.trim();
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.userEmail = email;
        this.showLoading(true);
        console.log('Checking email existence for:', email);

        try {
            // Use Firebase to check if email exists
            const methods = await fetchSignInMethodsForEmail(auth, email);
            console.log('Found sign-in methods:', methods);
            
            if (methods.length > 0) {
                // Email exists - login flow
                this.authMode = "login";
                console.log('Existing user detected, going to step 3');
                this.existingEmailDisplay.textContent = email;
                this.goToStep(3);
            } else {
                // Email does not exist - signup flow
                this.authMode = "signup";
                console.log('New user detected, going to step 4');
                this.newEmailDisplay.textContent = email;
                this.goToStep(4);
            }
        } catch (error) {
            console.error('Error checking email:', error);
            this.showError('Something went wrong. Please try again.');
            this.authMode = null;
        } finally {
            this.showLoading(false);
        }
    }

    async handlePasswordVerification() {
        const password = this.loginPassword.value;
        if (!password) {
            this.showError('Please enter your password');
            return;
        }

        this.showLoading(true);

        try {
            const result = await AuthService.signIn(this.userEmail, password);
            if (result.success) {
                // Check if profile is complete
                const profileResult = await AuthService.getUserProfile(result.user.uid);
                if (profileResult.success && this.isProfileComplete(profileResult.data)) {
                    // Profile complete - go to homepage
                    window.location.href = 'index.html';
                } else {
                    // Profile incomplete - go to profile steps
                    this.showStep(5);
                }
            } else {
                this.showError('Incorrect password. Please try again.');
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleAccountCreation() {
        const password = this.createPassword.value;
        if (!this.validatePassword(password)) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        this.showLoading(true);

        try {
            const result = await AuthService.signUp(this.userEmail, password);
            if (result.success) {
                // Account created - show verification message
                this.showSuccess('Account created! Please check your email for verification link.');
                // Go to profile steps
                this.showStep(5);
            } else {
                // Check if error is due to email already existing
                if (result.error && result.error.includes('email-already-in-use')) {
                    // Email already exists - try to login with the same credentials silently
                    try {
                        const loginResult = await AuthService.signIn(this.userEmail, password);
                        if (loginResult.success) {
                            // Login successful - check profile and redirect
                            const profileResult = await AuthService.getUserProfile(loginResult.user.uid);
                            if (profileResult.success && this.isProfileComplete(profileResult.data)) {
                                // Profile complete - go to homepage
                                window.location.href = 'index.html';
                            } else {
                                // Profile incomplete - go to profile steps
                                this.showStep(5);
                            }
                        } else {
                            // Login failed - switch to login flow manually
                            this.authMode = "login";
                            this.existingEmailDisplay.textContent = this.userEmail;
                            this.showError('Please enter correct password');
                            setTimeout(() => this.goToStep(3), 1500);
                        }
                    } catch (loginError) {
                        // Login attempt failed - switch to login flow manually
                        this.authMode = "login";
                        this.existingEmailDisplay.textContent = this.userEmail;
                        this.showError('Please enter correct password');
                        setTimeout(() => this.goToStep(3), 1500);
                    }
                } else {
                    this.showError('Failed to create account. Please try again.');
                }
            }
        } catch (error) {
            this.showError('Account creation failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    handlePhoneSubmit() {
        const phone = this.phoneInput.value.trim();
        if (!this.validatePhone(phone)) {
            this.showError('Please enter a valid phone number');
            return;
        }

        this.userPhone = phone;
        this.profileData.phoneNumber = phone;
        this.showStep(6);
    }

    handleNameSubmit() {
        const firstName = this.firstName.value.trim();
        const lastName = this.lastName.value.trim();

        if (!firstName) {
            this.showError('First name is required');
            return;
        }

        this.profileData.firstName = firstName;
        this.profileData.lastName = lastName;
        this.showStep(6);
    }

    handleDobSubmit() {
        const dob = this.dob.value;
        if (!dob) {
            this.showError('Please select your date of birth');
            return;
        }

        this.profileData.dateOfBirth = dob;
        this.showStep(7);
    }

    handleDiscoverySelection(button) {
        this.discoveryButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        this.discoverySource.value = button.dataset.value;
        this.profileData.discoverySource = button.dataset.value;
        
        // Auto-advance after selection
        setTimeout(() => this.showStep(8), 300);
    }

    handleFoodSelection(button) {
        this.foodButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        this.foodPreference.value = button.dataset.value;
        this.profileData.foodPreference = button.dataset.value;
    }

    async handleProfileCompletion() {
        if (!this.profileData.foodPreference) {
            this.showError('Please select your food preference');
            return;
        }

        this.showLoading(true);

        try {
            const user = AuthService.getCurrentUser();
            if (user) {
                // Save profile data
                const profileData = {
                    ...this.profileData,
                    email: this.userEmail,
                    profileCompleted: true,
                    createdAt: new Date().toISOString()
                };

                const result = await AuthService.saveUserProfile(user.uid, profileData);
                if (result.success) {
                    // Profile saved - redirect to homepage
                    window.location.href = 'index.html';
                } else {
                    this.showError('Failed to save profile. Please try again.');
                }
            }
        } catch (error) {
            this.showError('Profile completion failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handlePasswordReset() {
        const email = this.recoveryEmail.value.trim();
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.showLoading(true);

        try {
            const result = await AuthService.resetPassword(email);
            if (result.success) {
                this.showSuccess('Password reset link sent! Check your email.');
                setTimeout(() => this.hideForgotPassword(), 2000);
            } else {
                this.showError('Failed to send reset link. Please try again.');
            }
        } catch (error) {
            this.showError('Password reset failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    handleBack() {
        if (this.currentStep > 1) {
            if (this.currentStep === 3 || this.currentStep === 4) {
                // From password steps, go back to email and reset authMode
                this.authMode = null;
                this.showStep(2);
            } else {
                this.showStep(this.currentStep - 1);
            }
        }
    }

    showForgotPassword() {
        this.unifiedAuthSection.style.display = 'none';
        this.forgotPasswordSection.style.display = 'block';
        this.recoveryEmail.value = this.userEmail;
    }

    hideForgotPassword() {
        this.forgotPasswordSection.style.display = 'none';
        this.unifiedAuthSection.style.display = 'block';
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    isProfileComplete(profile) {
        return profile && profile.profileCompleted === true;
    }

    showLoading(show) {
        // Add loading state to buttons
        const buttons = document.querySelectorAll('.primary-btn');
        buttons.forEach(btn => {
            if (show) {
                btn.disabled = true;
                btn.textContent = 'Loading...';
            } else {
                btn.disabled = false;
                // Reset button text based on current step
                this.resetButtonText(btn);
            }
        });
    }

    resetButtonText(button) {
        const textMap = {
            'emailNextBtn': 'Continue',
            'verifyPasswordBtn': 'Verify',
            'createAccountBtn': 'Continue',
            'nameNextBtn': 'Next',
            'dobNextBtn': 'Next',
            'startShoppingBtn': 'Start Shopping',
            'sendRecoveryBtn': 'Send Link'
        };

        if (textMap[button.id]) {
            button.textContent = textMap[button.id];
        }
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: #fee;
                color: #c33;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                font-size: 14px;
            `;
            document.querySelector('.auth-panel-content').insertBefore(errorDiv, document.querySelector('.progress'));
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Create or update success message
        let successDiv = document.querySelector('.success-message');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.style.cssText = `
                background: #efe;
                color: #3c3;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                font-size: 14px;
            `;
            document.querySelector('.auth-panel-content').insertBefore(successDiv, document.querySelector('.progress'));
        }
        successDiv.textContent = message;
        successDiv.style.display = 'block';

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    async handleSendOTP() {
        const phone = this.phoneInput.value.trim();
        if (!this.validatePhone(phone)) {
            this.showError('Please enter a valid phone number');
            return;
        }

        this.userPhone = phone;
        this.showLoading(true);
        console.log('handleSendOTP: Sending OTP to:', phone);

        try {
            const result = await AuthService.sendPhoneOTP(phone);
            console.log('handleSendOTP: Result:', result);
            
            if (result.success) {
                this.phoneVerificationId = result.verificationId;
                this.phoneDisplay.textContent = phone;
                this.showStep(6);
                this.showSuccess('OTP sent successfully!');
            } else {
                console.error('handleSendOTP: Failed to send OTP:', result.error);
                this.showError(result.error || 'Failed to send OTP. Please try again.');
            }
        } catch (error) {
            console.error('handleSendOTP: Exception:', error);
            this.showError('Failed to send OTP. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleVerifyOTP() {
        const otp = this.otpInput.value.trim();
        if (!otp || otp.length !== 6) {
            this.showError('Please enter a 6-digit OTP');
            return;
        }

        this.showLoading(true);

        try {
            const result = await AuthService.verifyPhoneOTP(this.phoneVerificationId, otp);
            if (result.success) {
                // Check if profile is complete
                const profileResult = await AuthService.getUserProfile(result.user.uid);
                if (profileResult.success && this.isProfileComplete(profileResult.data)) {
                    // Profile complete - go to homepage
                    window.location.href = 'index.html';
                } else {
                    // Profile incomplete - go to profile steps
                    this.showStep(7);
                }
            } else {
                this.showError('Invalid OTP. Please try again.');
            }
        } catch (error) {
            this.showError('OTP verification failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleResendOTP() {
        if (!this.userPhone) {
            this.showError('Please enter phone number first');
            return;
        }

        this.showLoading(true);

        try {
            const result = await AuthService.sendPhoneOTP(this.userPhone);
            if (result.success) {
                this.phoneVerificationId = result.verificationId;
                this.showSuccess('OTP resent successfully!');
            } else {
                this.showError('Failed to resend OTP. Please try again.');
            }
        } catch (error) {
            this.showError('Failed to resend OTP. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    validatePhone(phone) {
        // Basic phone validation - can be enhanced for specific country codes
        const phoneRegex = /^[\+]?[1-9][\d\-\s\(\)]{0,15}$/;
        return phoneRegex.test(phone) && phone.length >= 10;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthFlow();
});