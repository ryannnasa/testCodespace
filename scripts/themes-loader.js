// Charge les thématiques spécifiques depuis le JSON
async function loadThemes() {
  try {
    const response = await fetch('data/themes.json');
    const data = await response.json();
    
    const container = document.getElementById('themes-grid');
    if (!container) return;
    
    container.innerHTML = data.themes.map(theme => `
      <div class="service-card">
        <div style="font-size: 48px; padding: 2rem 1rem 1rem; flex-shrink: 0;">${theme.emoji}</div>
        <h3 style="margin: 0 0 1rem 0;">${theme.title}</h3>
        <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #4a4a4a; flex-grow: 1;">
          ${theme.description}
        </p>
        <p style="margin: 1rem 0; font-weight: 600; color: #9b8b6d;">
          ${theme.pricing}
        </p>
        <a href="https://www.resalib.fr/praticien/107607-sara-demange-sophrologue-nantes" target="_blank" style="background: transparent; color: #9b8b6d; padding: 0.5rem 1rem; border-radius: 50px; text-decoration: none; display: inline-block; margin: 0 1rem 1rem; transition: all 0.3s ease; border: 2px solid #9b8b6d; font-weight: 600; font-size: 14px; cursor: pointer;">
          ${theme.cta}
        </a>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur lors du chargement des thématiques:', error);
  }
}

// Charge les thématiques au démarrage
document.addEventListener('DOMContentLoaded', loadThemes);
