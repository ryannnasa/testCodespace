import { loadLayoutComponents } from './components-loader.js';
import { loadServiceCards } from './cards-loader.js';
import { initScrollAnimations, initSmoothScroll } from './animations.js';

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

