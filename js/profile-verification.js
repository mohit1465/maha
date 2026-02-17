import { AuthService } from './auth-service.js';

class ProfileVerification {
    constructor() {
        console.log('ProfileVerification: Constructor called');
        this.initializeElements();
        this.checkEmailVerificationStatus();
        this.attachEventListeners();
        
        // Rate limiting
        this.lastResendTime = 0;
        this.resendCooldown = 60000; // 1 minute cooldown (60 seconds)
    }

    initializeElements() {
        console.log('ProfileVerification: Initializing elements...');
        
        // Verification Banner Elements
        this.verificationBanner = document.getElementById('verificationBanner');
        this.verificationMessage = document.getElementById('verificationMessage');
        this.resendVerificationBtn = document.getElementById('resendVerificationBtn');
        this.dismissBannerBtn = document.getElementById('dismissBannerBtn');
        this.userEmail = document.getElementById('userEmail');

        // Profile Section Elements
        this.emailVerificationStatus = document.getElementById('emailVerificationStatus');
        this.profileVerificationActions = document.getElementById('profileVerificationActions');
        this.profileResendVerificationBtn = document.getElementById('profileResendVerificationBtn');
        
        console.log('ProfileVerification: Elements initialized');
        console.log('ProfileVerification: emailVerificationStatus element:', !!this.emailVerificationStatus);
    }

    attachEventListeners() {
        // Verification Banner Event Listeners
        if (this.resendVerificationBtn) {
            this.resendVerificationBtn.addEventListener('click', () => this.handleResendVerification());
        }
        
        if (this.dismissBannerBtn) {
            this.dismissBannerBtn.addEventListener('click', () => this.dismissBanner());
        }

        // Profile Section Event Listeners
        if (this.profileResendVerificationBtn) {
            this.profileResendVerificationBtn.addEventListener('click', () => this.handleResendVerification());
        }
    }

    async checkEmailVerificationStatus() {
        console.log('ProfileVerification: Checking email verification status...');
        
        try {
            const user = AuthService.getCurrentUser();
            console.log('ProfileVerification: Current user:', !!user);
            
            if (!user) {
                console.log('ProfileVerification: No user logged in');
                return;
            }

            // Check if email is verified
            const result = await AuthService.checkEmailVerification();
            console.log('ProfileVerification: Verification check result:', result);
            
            if (result.success && !result.isVerified) {
                console.log('ProfileVerification: Email not verified, showing banner and updating profile');
                // Show verification banner
                this.showVerificationBanner(user.email);
                
                // Update profile section
                this.updateProfileSection(false, user.email);
            } else if (result.success && result.isVerified) {
                console.log('ProfileVerification: Email verified, hiding banner and updating profile');
                // Hide verification banner
                this.hideVerificationBanner();
                
                // Update profile section
                this.updateProfileSection(true, user.email);
            } else {
                console.log('ProfileVerification: Verification check failed:', result.error);
            }
        } catch (error) {
            console.error('ProfileVerification: Error checking email verification:', error);
        }
    }

    updateProfileSection(isVerified, email) {
        if (this.emailVerificationStatus) {
            this.emailVerificationStatus.textContent = isVerified ? 'Verified' : 'Not Verified';
            this.emailVerificationStatus.style.color = isVerified ? '#28a745' : '#dc3545';
        }
        
        if (this.profileVerificationActions) {
            this.profileVerificationActions.style.display = isVerified ? 'none' : 'block';
        }
        
        if (this.userEmail) {
            this.userEmail.textContent = email;
        }
    }

    showVerificationBanner(email) {
        if (!this.verificationBanner) return;

        this.verificationBanner.style.display = 'block';
        if (this.userEmail) {
            this.userEmail.textContent = email;
        }
        
        if (this.verificationMessage) {
            this.verificationMessage.textContent = `Please verify your email address to access all features.`;
        }
    }

    hideVerificationBanner() {
        if (this.verificationBanner) {
            this.verificationBanner.style.display = 'none';
        }
    }

    dismissBanner() {
        this.hideVerificationBanner();
    }

    async handleResendVerification() {
        console.log('ProfileVerification: Resend verification requested');
        
        // Check rate limiting
        const now = Date.now();
        const timeSinceLastResend = now - this.lastResendTime;
        
        if (timeSinceLastResend < this.resendCooldown) {
            const remainingTime = Math.ceil((this.resendCooldown - timeSinceLastResend) / 1000);
            this.showError(`Please wait ${remainingTime} seconds before requesting another verification email.`);
            return;
        }
        
        this.showLoading(true);
        
        try {
            const user = AuthService.getCurrentUser();
            if (!user) {
                this.showError('No user logged in');
                return;
            }
            
            const result = await AuthService.sendEmailVerification();
            console.log('ProfileVerification: Resend result:', result);
            
            if (result.success) {
                this.lastResendTime = now;
                this.showSuccess('Verification email sent! Please check your inbox.');
            } else {
                this.showError(result.error || 'Failed to send verification email. Please try again.');
            }
        } catch (error) {
            console.error('ProfileVerification: Error resending verification:', error);
            this.showError('Failed to send verification email. Please try again later.');
        } finally {
            this.showLoading(false);
        }
    }

    showSuccessMessage(message) {
        // Create or update success message
        let successDiv = document.querySelector('.verification-success');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'verification-success';
            successDiv.style.cssText = `
                background: #d4edda;
                color: #155724;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                font-size: 14px;
                border: 1px solid #c3e6cb;
            `;
            
            if (this.verificationBanner) {
                this.verificationBanner.appendChild(successDiv);
            }
        }
        successDiv.textContent = message;
        successDiv.style.display = 'block';

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    showErrorMessage(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.verification-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'verification-error';
            errorDiv.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                font-size: 14px;
                border: 1px solid #f5c6cb;
            `;
            
            if (this.verificationBanner) {
                this.verificationBanner.appendChild(errorDiv);
            }
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('ProfileVerification: DOM loaded, checking for elements...');
    
    // Check if verification elements exist on the page
    const hasBanner = document.getElementById('verificationBanner');
    const hasProfileStatus = document.getElementById('emailVerificationStatus');
    
    console.log('ProfileVerification: Banner element found:', !!hasBanner);
    console.log('ProfileVerification: Profile status element found:', !!hasProfileStatus);
    
    if (hasBanner || hasProfileStatus) {
        console.log('ProfileVerification: Initializing...');
        new ProfileVerification();
    }
});

// Also initialize after a short delay to handle dynamic content
setTimeout(() => {
    console.log('ProfileVerification: Delayed initialization check...');
    
    const hasBanner = document.getElementById('verificationBanner');
    const hasProfileStatus = document.getElementById('emailVerificationStatus');
    
    if (hasBanner || hasProfileStatus) {
        if (!window.profileVerificationInstance) {
            console.log('ProfileVerification: Creating new instance...');
            window.profileVerificationInstance = new ProfileVerification();
        }
    }
}, 1000);

export { ProfileVerification };
