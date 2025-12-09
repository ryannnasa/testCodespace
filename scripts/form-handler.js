// Gérer le formulaire de contact
export function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Afficher un message de confirmation
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Message envoyé !';
            submitBtn.style.background = '#4CAF50';
            
            // Réinitialiser le formulaire
            this.reset();
            
            // Restaurer le bouton après 3 secondes
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '';
            }, 3000);
        });
    }
}
