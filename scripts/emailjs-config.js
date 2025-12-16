// Attendre que EmailJS soit chargé, puis l'initialiser
console.log('emailjs-config.js chargé');

let attempts = 0;
const maxAttempts = 50; // 50 * 200ms = 10 secondes max

function initEmailJSWhenReady() {
    attempts++;
    console.log(`Tentative ${attempts}/50 - Vérification EmailJS...`);
    console.log('typeof emailjs =', typeof emailjs);
    
    if (typeof emailjs !== 'undefined') {
        console.log('✓ EmailJS trouvé ! Initialisation...');
        try {
            emailjs.init('dgTbAt7jCGDtF9bu7');
            console.log('✓ EmailJS initialisé avec succès');
        } catch (e) {
            console.error('✗ Erreur lors de l\'init EmailJS:', e);
        }
    } else if (attempts < maxAttempts) {
        // Réessayer après 200ms
        setTimeout(initEmailJSWhenReady, 200);
    } else {
        console.error('✗ Timeout : EmailJS n\'a pas pu être chargé après 10 secondes');
    }
}

// Commencer la vérification immédiatement
initEmailJSWhenReady();
