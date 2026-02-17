// Contact Section JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Contact section navigation
    window.showContactSection = function () {
        // Hide all sections first
        const allSections = document.querySelectorAll('section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // Show contact section
        const contactSection = document.querySelector('.contact-section');
        if (contactSection) contactSection.style.display = 'block';

        window.scrollTo(0, 0);
    };

    // Contact form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            // Simple validation
            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields');
                return;
            }

            // Simulate form submission
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
});