// Charger un component HTML depuis un fichier
function loadComponent(containerId, componentPath) {
    return fetch(componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
            } else {
                console.warn(`Container ${containerId} not found`);
            }
        })
        .catch(error => {
            console.error(`Erreur lors du chargement du component ${componentPath}:`, error);
        });
}

// Charger les components navbar et footer
function loadLayoutComponents() {
    return Promise.all([
        loadComponent('navbar-container', 'components/navbar.html'),
        loadComponent('footer-container', 'components/footer.html')
    ]);
}

// Export pour usage en module
export { loadComponent, loadLayoutComponents };
