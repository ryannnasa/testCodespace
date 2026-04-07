// Charger les cartes de service depuis JSON
export async function loadServiceCards() {
    try {
        const response = await fetch('data/services.json');
        const data = await response.json();
        const services = Array.isArray(data) ? data : (data.services || []);
        const container = document.getElementById('services-grid');
        
        if (container) {
            const cardTemplate = await fetch('components/service-card.html')
                .then(r => r.text());
            
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
        }
    } catch (error) {
        console.error('Erreur lors du chargement des cartes de service:', error);
    }
}
