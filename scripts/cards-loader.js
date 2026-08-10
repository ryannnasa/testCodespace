// Charger les cartes de service depuis JSON
export function loadServiceCards() {
    return fetch('data/services.json')
        .then(response => response.json())
        .then(data => {
            const services = Array.isArray(data) ? data : (data.services || []);
            const container = document.getElementById('services-grid');

            if (!container) {
                return;
            }

            return fetch('components/service-card.html')
                .then(response => response.text())
                .then(cardTemplate => {
                    container.innerHTML = services.map((service, index) => {
                        return cardTemplate
                            .replace('{index}', index)
                            .replace('{icon}', service.icon)
                            .replace('{title}', service.title)
                            .replace('{description}', service.description)
                            .replace('{price}', service.price)
                            .replace('{cta_text}', service.cta_text)
                            .replace('{cta_link}', service.cta_link);
                    }).join('');
                });
        })
        .catch((error) => {
            console.error('Erreur lors du chargement des cartes de service:', error);
        });
}
