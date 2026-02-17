// About Section JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // About section navigation
    window.showAboutSection = function () {
        // Hide all sections first
        const allSections = document.querySelectorAll('section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // Show about section
        const aboutSection = document.querySelector('.about-section');
        if (aboutSection) aboutSection.style.display = 'block';

        window.scrollTo(0, 0);
    };

    // Add smooth scroll behavior for internal links
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation to stats on scroll
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    stat.style.animation = 'fadeInUp 0.6s ease-out';
                });
            }
        });
    }, observerOptions);

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
});