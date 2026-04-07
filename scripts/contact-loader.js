/**
 * Contact Loader - Charge les données de contact depuis contact.json
 * et les utilise partout sur le site
 */

let contactData = null;

// Charger les données de contact
async function loadContactData() {
    try {
        const response = await fetch('data/contact.json');
        contactData = await response.json();
        updateContactElements();
    } catch (error) {
        console.error('Erreur lors du chargement des données de contact:', error);
    }
}

// Mettre à jour les éléments qui affichent les données de contact
function updateContactElements() {
    if (!contactData) return;

    // Mettre à jour le téléphone
    const phoneLinks = document.querySelectorAll('[data-contact="phone"]');
    phoneLinks.forEach(el => {
        el.href = contactData.phone.href;
        el.textContent = contactData.phone.value;
    });

    // Mettre à jour l'email
    const emailLinks = document.querySelectorAll('[data-contact="email"]');
    emailLinks.forEach(el => {
        el.href = contactData.email.href;
        el.textContent = contactData.email.value;
    });

    // Mettre à jour l'adresse
    const addressElements = document.querySelectorAll('[data-contact="address"]');
    addressElements.forEach(el => {
        el.innerHTML = `${contactData.address.street}<br>${contactData.address.city}`;
    });

    // Mettre à jour les horaires
    const hoursElements = document.querySelectorAll('[data-contact="hours"]');
    hoursElements.forEach(el => {
        let hoursHtml = '';
        contactData.hours.schedule.forEach(item => {
            hoursHtml += `<p><strong>${item.day} :</strong> ${item.time}</p>`;
        });
        el.innerHTML = hoursHtml;
    });

    // Mettre à jour la Google Maps
    const mapsElements = document.querySelectorAll('[data-contact="maps"]');
    mapsElements.forEach(el => {
        el.src = contactData.googleMaps.embed;
    });
}

// Charger les données au démarrage
document.addEventListener('DOMContentLoaded', loadContactData);

// Réappliquer les données après injection du footer/navbar dynamiques
document.addEventListener('layout-components-loaded', updateContactElements);
