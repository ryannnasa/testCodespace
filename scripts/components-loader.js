// Charger un component HTML depuis un fichier
async function loadComponent(containerId, componentPath) {
    try {
        const container = document.getElementById(containerId);
        if (container) {
            const response = await fetch(componentPath);
            const html = await response.text();
            container.innerHTML = html;
        } else {
            console.warn(`Container ${containerId} not found`);
        }
    } catch (error) {
        console.error(`Erreur lors du chargement du component ${componentPath}:`, error);
    }
}

// Charger les components navbar et footer
function loadLayoutComponents() {
    loadComponent('navbar-container', 'components/navbar.html');
    loadComponent('footer-container', 'components/footer.html');
}

// Export pour usage en module
export { loadComponent, loadLayoutComponents };
