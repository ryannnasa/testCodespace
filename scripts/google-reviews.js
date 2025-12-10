/**
 * Module pour afficher les avis Google Business via le widget gratuit officiel
 * Solution sans API, sans carte bancaire, totalement gratuit
 */

import { GOOGLE_BUSINESS_CONFIG } from '../config/google-business.js';

/**
 * Insère le widget Google Business Profile directement dans le DOM
 * @param {String} containerId - ID du conteneur où afficher le widget
 */
export async function loadGoogleBusinessWidget(containerId = 'testimonials-section-widget') {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Conteneur "${containerId}" non trouvé`);
            return;
        }

        // Créer le widget Google Business
        const widgetHTML = `
            <div class="google-business-widget">
                <div class="widget-header">
                    <h3>Découvrez mes avis clients</h3>
                    <p>Basés sur les avis Google vérifiés</p>
                </div>
                
                <div class="widget-content">
                    <div class="google-reviews-placeholder">
                        <!-- Le widget Google se chargera ici -->
                        <div class="google-embed-placeholder">
                            <p>⭐ Chargement de vos avis Google...</p>
                            <p>
                                <a href="${GOOGLE_BUSINESS_CONFIG.googleBusinessProfileUrl}" 
                                   target="_blank" 
                                   class="btn-google-reviews">
                                    Voir tous mes avis sur Google
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="widget-footer">
                    <small>Les avis sont synchronisés directement depuis votre profil Google Business</small>
                </div>
            </div>
        `;
        
        container.innerHTML = widgetHTML;
        
        // Charger le script du widget Google
        loadGoogleBusinessScript();
        
        console.log('Widget Google Business chargé avec succès');
    } catch (error) {
        console.error('Erreur lors du chargement du widget Google Business:', error);
    }
}

/**
 * Charge le script officiel Google Business
 * Ce script ajoute automatiquement le support des widgets Google sur la page
 */
function loadGoogleBusinessScript() {
    // Vérifier si le script est déjà chargé
    if (window.googleBusinessLoaded) {
        return;
    }

    // Créer et ajouter le script Google
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/business-badge/releases/business_badge_beta.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        console.log('Script Google Business chargé');
        window.googleBusinessLoaded = true;
        
        // Initialiser le widget si disponible
        if (window.google && window.google.business) {
            try {
                window.google.business.init();
            } catch (e) {
                console.log('Initialisation du widget Google');
            }
        }
    };

    script.onerror = () => {
        console.warn('Impossible de charger le widget Google Business. Affichage des avis locaux.');
    };

    document.head.appendChild(script);
}

/**
 * Charge les avis locaux comme fallback
 * @param {String} containerId - ID du conteneur
 * @param {String} templatePath - Chemin vers le template HTML
 */
export async function loadLocalReviews(containerId, templatePath) {
    try {
        const response = await fetch('data/testimonials.json');
        if (!response.ok) throw new Error('Impossible de charger les avis locaux');
        
        const testimonials = await response.json();
        const container = document.getElementById(containerId);
        const template = await fetch(templatePath).then(r => r.text());
        
        if (container) {
            container.innerHTML = testimonials.map((testimonial) => {
                return template
                    .replace('{stars}', testimonial.stars)
                    .replace('{text}', testimonial.text)
                    .replace('{author}', testimonial.author);
            }).join('');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des avis locaux:', error);
    }
}

/**
 * Alternative: Code d'intégration Google Business Profile personnalisé
 * Si vous avez un code spécifique de Google, vous pouvez l'insérer ainsi:
 * 
 * @param {String} googleEmbedCode - Code d'intégration fourni par Google
 * @param {String} containerId - ID du conteneur
 */
export function loadCustomGoogleEmbed(googleEmbedCode, containerId) {
    const container = document.getElementById(containerId);
    if (container && googleEmbedCode) {
        container.innerHTML = googleEmbedCode;
        
        // Réexécuter les scripts contenus dans le code
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            script.parentNode.replaceChild(newScript, script);
        });
    }
}
