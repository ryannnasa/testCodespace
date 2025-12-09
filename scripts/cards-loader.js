// Charger les cartes de service depuis JSON
export async function loadServiceCards() {
    try {
        const response = await fetch('data/services.json');
        const services = await response.json();
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
                    .replace('{price}', service.price);
            }).join('');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des cartes de service:', error);
    }
}

// Charger les cartes de témoignage depuis JSON
export async function loadTestimonialCards() {
    try {
        const response = await fetch('data/testimonials.json');
        const testimonials = await response.json();
        const container = document.getElementById('testimonials-grid');
        
        if (container) {
            const cardTemplate = await fetch('components/testimonial-card.html')
                .then(r => r.text());
            
            container.innerHTML = testimonials.map((testimonial) => {
                return cardTemplate
                    .replace('{stars}', testimonial.stars)
                    .replace('{text}', testimonial.text)
                    .replace('{author}', testimonial.author);
            }).join('');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des cartes de témoignage:', error);
    }
}
