// Observer pour les animations au défilement
export function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                // Après l'animation, supprimer les styles inline pour laisser le CSS prendre le contrôle
                setTimeout(() => {
                    entry.target.style.transform = '';
                    entry.target.style.opacity = '';
                    entry.target.style.transition = '';
                }, 700);
            }
        });
    }, observerOptions);

    // Observer les cartes de service et témoignages
    document.querySelectorAll('.service-card, .testimonial-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Smooth scroll pour les liens de navigation
export function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
            }
        });
    });
}
