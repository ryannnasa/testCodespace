import { loadLayoutComponents } from './components-loader.js';
import { loadServiceCards, loadTestimonialCards } from './cards-loader.js';
import { initContactForm } from './form-handler.js';
import { initScrollAnimations, initSmoothScroll } from './animations.js';

// Initialiser tous les modules au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Charger les components layout
    loadLayoutComponents();
    
    // Charger les cartes
    loadServiceCards();
    loadTestimonialCards();
    
    // Initialiser les interactions
    initContactForm();
    initScrollAnimations();
    initSmoothScroll();
});

