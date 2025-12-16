import { loadComponent, loadLayoutComponents } from './components-loader.js';
import { initScrollAnimations, initSmoothScroll } from './animations.js';

// Attendre que EmailJS soit disponible
function waitForEmailJS() {
    return new Promise((resolve) => {
        function check() {
            if (typeof emailjs !== 'undefined') {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        }
        check();
    });
}

// Gérer le formulaire de contact avec EmailJS
function initContactForm() {
    console.log('✓ initContactForm appelée');
    const contactForm = document.querySelector('.contact-form');
    const formMessage = document.getElementById('form-message');
    
    console.log('Form element:', contactForm);
    console.log('Message element:', formMessage);
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            console.log('✓ Submit event triggered');
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            console.log('Form values:', {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                service: document.getElementById('service').value,
                message: document.getElementById('message').value
            });
            
            // État d'envoi
            submitBtn.textContent = 'Envoi en cours...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            
            // Préparer les données du formulaire
            const templateParams = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value || 'Non fourni',
                subject: document.getElementById('subject').value,
                service: document.getElementById('service').value || 'Non sélectionné',
                message: document.getElementById('message').value
            };
            
            console.log('EmailJS available?', typeof emailjs);
            console.log('Sending with params:', templateParams);
            
            // Envoyer via EmailJS avec .then()
            emailjs.send('service_cbo3nxc', 'template_doszmkd', templateParams)
                .then(() => {
                    console.log('✓ Email envoyé avec succès');
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
                })
                .catch((error) => {
                    // Erreur
                    console.error('✗ Erreur EmailJS:', error);
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
    } else {
        console.warn('⚠ Contact form not found');
    }
}

// Initialiser tous les modules au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ DOMContentLoaded triggered');
    
    // Charger les components layout
    loadLayoutComponents()
        .then(() => {
            console.log('✓ Components loaded');
            // Attendre que EmailJS soit prêt
            return waitForEmailJS();
        })
        .then(() => {
            console.log('✓ EmailJS ready');
            // Initialiser le formulaire de contact si présent
            const contactForm = document.getElementById('contact-form');
            if (contactForm) {
                initContactForm();
            }
            
            // Initialiser les animations
            initScrollAnimations();
            initSmoothScroll();
        })
        .catch((error) => {
            console.error('✗ Erreur lors du chargement:', error);
        });
});
