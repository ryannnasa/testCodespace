// Charge les thématiques spécifiques depuis le JSON
async function loadThemes() {
  try {
    const response = await fetch('data/themes.json');
    const data = await response.json();
    
    const container = document.getElementById('themes-grid');
    if (!container) return;
    
    const cardTemplate = await fetch('components/service-card.html').then(r => r.text());

    container.innerHTML = data.themes.map((theme, index) => cardTemplate
      .replace('{index}', index)
      .replace('{icon}', theme.emoji)
      .replace('{title}', theme.title)
      .replace('{description}', theme.description)
      .replace('{price}', theme.pricing)
      .replace('{cta_text}', theme.cta)
      .replace('{cta_link}', 'https://www.resalib.fr/praticien/107607-sara-demange-sophrologue-nantes')
    ).join('');
  } catch (error) {
    console.error('Erreur lors du chargement des thématiques:', error);
  }
}

// Charge les thématiques au démarrage
document.addEventListener('DOMContentLoaded', loadThemes);
