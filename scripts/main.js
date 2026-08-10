import { loadLayoutComponents } from './components-loader.js';
import { loadServiceCards } from './cards-loader.js';
import { initScrollAnimations, initSmoothScroll } from './animations.js';
import { applyPublishedSiteOverrides } from './site-overrides.js';

function redirectIdentityTokensToAdmin() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const tokenPattern = /(?:invite_token|recovery_token|confirmation_token)=/;
    const hasIdentityToken = tokenPattern.test(hash) || tokenPattern.test(search);

    if (hasIdentityToken && !window.location.pathname.startsWith('/admin')) {
        const tokenFragment = tokenPattern.test(hash)
            ? hash
            : `#${search.replace(/^\?/, '')}`;
        window.location.replace(`/admin/${tokenFragment}`);
    }
}

// Initialiser le menu mobile hamburger
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuToggle || !navMenu) return;
    
    // Toggle menu when hamburger is clicked
    menuToggle.addEventListener('click', () => {
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isOpen);
        navMenu.classList.toggle('active');
    });
    
    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('active');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            menuToggle.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('active');
        }
    });
}

// Gérer le formulaire de contact avec Formspree (AJAX)
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    const formMessage = document.getElementById('form-message');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // État d'envoi
            submitBtn.textContent = 'Envoi en cours...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            
            // Créer FormData avec les données du formulaire
            const formData = new FormData(this);
            
            // Envoyer via fetch à Formspree
            fetch('https://formspree.io/f/xdkqrgoq', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    if (response.ok) {
                        // Succès
                        submitBtn.textContent = 'Message envoyé ! ✓';
                        submitBtn.style.background = '#4CAF50';
                        
                        formMessage.style.display = 'block';
                        formMessage.style.background = '#d4edda';
                        formMessage.style.color = '#155724';
                        formMessage.style.border = '1px solid #c3e6cb';
                        formMessage.textContent = 'Votre message a été envoyé avec succès ! Je vous répondrai au plus vite.';
                        
                        // Réinitialiser le formulaire
                        this.reset();
                        
                        // Restaurer le bouton après 4 secondes
                        setTimeout(() => {
                            submitBtn.textContent = originalText;
                            submitBtn.style.background = '';
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = '1';
                            formMessage.style.display = 'none';
                        }, 4000);
                    } else {
                        throw new Error('Erreur lors de l\'envoi');
                    }
                })
                .catch((error) => {
                    // Erreur
                    console.error('Erreur:', error);
                    submitBtn.textContent = 'Erreur lors de l\'envoi';
                    submitBtn.style.background = '#dc3545';
                    
                    formMessage.style.display = 'block';
                    formMessage.style.background = '#f8d7da';
                    formMessage.style.color = '#721c24';
                    formMessage.style.border = '1px solid #f5c6cb';
                    formMessage.textContent = 'Une erreur s\'est produite lors de l\'envoi. Veuillez réessayer.';
                    
                    // Restaurer le bouton après 3 secondes
                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.style.background = '';
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                    }, 3000);
                });
        });
    }
}

function initServiceCardExpansion() {
    const measureCardFits = (card) => {
        const minCardHeight = card.offsetHeight;
        const clone = card.cloneNode(true);
        clone.classList.remove('is-expanded', 'is-fit');
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.pointerEvents = 'none';
        clone.style.left = '-99999px';
        clone.style.top = '0';
        clone.style.width = `${card.getBoundingClientRect().width}px`;
        clone.style.height = 'auto';
        clone.style.minHeight = '0';

        const cloneDescription = clone.querySelector('.service-description');
        if (cloneDescription) {
            cloneDescription.style.maxHeight = 'none';
            cloneDescription.style.overflow = 'visible';
        }

        document.body.appendChild(clone);

        const fitsWithinCard = clone.scrollHeight <= minCardHeight;
        clone.remove();

        return fitsWithinCard;
    };

    const updateServiceCardStates = () => {
        document.querySelectorAll('.service-card').forEach((card) => {
            const description = card.querySelector('.service-description');
            if (!description) return;

            const fitsWithinCard = measureCardFits(card);
            card.classList.toggle('is-fit', fitsWithinCard);

            if (fitsWithinCard) {
                card.classList.remove('is-expanded');
            }
        });
    };

    const scheduleServiceCardStateUpdate = () => {
        window.requestAnimationFrame(updateServiceCardStates);
    };

    scheduleServiceCardStateUpdate();

    document.addEventListener('service-cards-loaded', updateServiceCardStates);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleServiceCardStateUpdate);
    }

    window.addEventListener('load', scheduleServiceCardStateUpdate);

    window.addEventListener('resize', () => {
        scheduleServiceCardStateUpdate();
    });

    document.addEventListener('click', (event) => {
        const card = event.target.closest('.service-card');
        if (!card) return;

        if (event.target.closest('.btn-service')) return;

        if (card.classList.contains('is-fit')) return;

        card.classList.toggle('is-expanded');
    });
}

// Initialiser tous les modules au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    redirectIdentityTokensToAdmin();
    applyPublishedSiteOverrides();

    // Charger les components layout
    loadLayoutComponents().then(() => {
        applyPublishedSiteOverrides();
        initMobileMenu();
        document.dispatchEvent(new Event('layout-components-loaded'));
    });
    
    // Charger les cartes si la page les contient
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        loadServiceCards().then(() => {
            document.dispatchEvent(new Event('service-cards-loaded'));
        });
    }
    
    // Initialiser le formulaire de contact si présent
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        initContactForm();
    }

    initServiceCardExpansion();

    // Reappliquer apres les chargements dynamiques du site
    document.addEventListener('layout-components-loaded', applyPublishedSiteOverrides);
    window.addEventListener('load', applyPublishedSiteOverrides);
    
    // Initialiser les animations
    initScrollAnimations();
    initSmoothScroll();
});

