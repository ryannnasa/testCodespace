import { loadLayoutComponents } from './components-loader.js';
import { loadServiceCards } from './cards-loader.js';
import { initContactForm } from './form-handler.js';
import { initScrollAnimations, initSmoothScroll } from './animations.js';

// Initialiser tous les modules au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Charger les components layout
    loadLayoutComponents();
    
    // Charger les cartes si la page les contient
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        loadServiceCards();
    }
    
    // Initialiser le formulaire de contact si présent
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        initContactForm();
    }
    
    // Initialiser les animations
    initScrollAnimations();
    initSmoothScroll();
});

