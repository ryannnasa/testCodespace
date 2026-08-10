// Charge les thématiques spécifiques depuis le JSON
function loadThemes() {
  return fetch('data/themes.json')
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('themes-grid');
      if (!container) return;

      return fetch('components/service-card.html')
        .then(response => response.text())
        .then(cardTemplate => {
          container.innerHTML = data.themes.map((theme, index) => cardTemplate
            .replace('{index}', index)
            .replace('{icon}', theme.emoji)
            .replace('{title}', theme.title)
            .replace('{description}', theme.description)
            .replace('{price}', theme.pricing)
            .replace('{cta_text}', theme.cta)
            .replace('{cta_link}', 'https://www.resalib.fr/praticien/107607-sara-demange-sophrologue-nantes')
          ).join('');

          document.dispatchEvent(new Event('service-cards-loaded'));
        });
    })
    .catch((error) => {
      console.error('Erreur lors du chargement des thématiques:', error);
    });
}

// Charge les thématiques au démarrage
document.addEventListener('DOMContentLoaded', loadThemes);
