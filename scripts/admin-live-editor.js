import {
  normalizePath,
  readPublishedOverrides,
  applyPublishedOverridesToDocument,
} from './site-overrides.js';

const previewFrame = document.getElementById('preview-frame');
const pagePathInput = document.getElementById('page-path');
const loadPageButton = document.getElementById('load-page');
const editorFields = document.getElementById('editor-fields');
const selectedSummary = document.getElementById('selected-summary');
const selectionEditor = document.getElementById('selection-editor');
const clearPageDraftButton = document.getElementById('clear-page-draft');
const publishPageButton = document.getElementById('publish-page');
const publishStatus = document.getElementById('publish-status');

const itemsBySelector = new Map();
let editableItems = [];
let currentToken = 0;
let scanTimers = [];
let selectedSelector = '';
let currentPagePath = ensurePath(pagePathInput ? pagePathInput.value : '/index.html');

const DRAFT_PREFIX = 'admin-live-editor:draft:v1:';
const PREVIEW_STYLE_ID = 'admin-live-editor-preview-style';

function ensurePath(rawPath) {
  const trimmed = (rawPath || '').trim() || '/index.html';
  if (/^https?:\/\//i.test(trimmed)) {
    return '/index.html';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

function framePath(path) {
  const clean = ensurePath(path);
  const separator = clean.includes('?') ? '&' : '?';
  return `${clean}${separator}admin_preview=1`;
}

function cssPath(element, stopAt) {
  if (!stopAt && element.id) {
    return `#${element.id}`;
  }

  const steps = [];
  let node = element;

  while (node && node.nodeType === Node.ELEMENT_NODE) {
    if (stopAt && node === stopAt) {
      break;
    }

    if (!stopAt && node.tagName && node.tagName.toLowerCase() === 'html') {
      break;
    }

    const tag = node.tagName.toLowerCase();
    const siblings = node.parentElement
      ? Array.from(node.parentElement.children).filter((child) => child.tagName === node.tagName)
      : [];
    const idx = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(node) + 1})` : '';
    steps.unshift(`${tag}${idx}`);
    node = node.parentElement;
  }

  return steps.join(' > ');
}

function sectionLabel(element) {
  const section = element.closest('header, nav, main, section, footer, aside, article');
  if (!section) {
    return 'Page';
  }

  if (section.id) {
    return `#${section.id}`;
  }

  const className = (section.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
  if (className) {
    return `${section.tagName.toLowerCase()}.${className}`;
  }

  return section.tagName.toLowerCase();
}

function isVisibleText(node) {
  const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasDisruptiveChildStructure(node) {
  const children = Array.from(node.children || []);
  if (children.length === 0) {
    return false;
  }

  const allBreaks = children.every((child) => child.tagName && child.tagName.toLowerCase() === 'br');
  if (allBreaks) {
    return false;
  }

  return true;
}

function normalizeText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function truncateText(text, maxLength = 70) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getDraftKey(path) {
  return `${DRAFT_PREFIX}${ensurePath(path)}`;
}

function readDraft(path) {
  try {
    const raw = window.localStorage.getItem(getDraftKey(path));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Impossible de lire le brouillon local', error);
    return {};
  }
}

function writeDraft(path, draft) {
  try {
    window.localStorage.setItem(getDraftKey(path), JSON.stringify(draft));
  } catch (error) {
    console.warn('Impossible d\'enregistrer le brouillon local', error);
  }
}

function updatePublishStatus(message, isError = false) {
  if (!publishStatus) {
    return;
  }

  publishStatus.textContent = message;
  publishStatus.style.color = isError ? '#9f2d2d' : '';
}

function getSaveApiBaseUrl() {
  const queryApi = new URLSearchParams(window.location.search).get('save_api');
  if (queryApi) {
    return queryApi;
  }

  return window.location.origin;
}

function buildDraftFromItems(items) {
  const draft = {};

  items.forEach((item) => {
    if (item.kind === 'text') {
      draft[item.selector] = {
        kind: item.kind,
        textContent: item.value,
      };
      return;
    }

    draft[item.selector] = {
      kind: item.kind,
      src: item.values.src,
      alt: item.values.alt,
      zoom: item.values.zoom,
      posX: item.values.posX,
      posY: item.values.posY,
    };
  });

  return draft;
}

function saveDraft() {
  writeDraft(currentPagePath, buildDraftFromItems(editableItems));
  updatePublishStatus('Brouillon local enregistre. Cliquez sur "Appliquer aux fichiers" pour ecrire dans le projet.');
}

function clearDraft() {
  try {
    window.localStorage.removeItem(getDraftKey(currentPagePath));
  } catch (error) {
    console.warn('Impossible de supprimer le brouillon local', error);
  }

  loadPage(currentPagePath);
  updatePublishStatus('Brouillon local supprime pour cette page.');
}

function installPreviewStyles(doc) {
  if (doc.getElementById(PREVIEW_STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = PREVIEW_STYLE_ID;
  style.textContent = `
    [data-live-selector] {
      cursor: pointer;
      transition: outline-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
    }

    [data-live-selector]:hover {
      outline: 2px dashed rgba(38, 70, 83, 0.65);
      outline-offset: 2px;
    }

    [data-live-selected="1"] {
      outline: 3px solid rgba(155, 139, 109, 0.95) !important;
      outline-offset: 3px;
      box-shadow: 0 0 0 4px rgba(155, 139, 109, 0.16);
    }
  `;

  doc.head.appendChild(style);
}

function clearSelectionHighlight(doc) {
  doc.querySelectorAll('[data-live-selected="1"]').forEach((node) => {
    node.removeAttribute('data-live-selected');
  });
}

function highlightSelectedItem() {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  clearSelectionHighlight(doc);

  if (!selectedSelector) {
    return;
  }

  const item = itemsBySelector.get(selectedSelector);
  if (item && item.element) {
    item.element.setAttribute('data-live-selected', '1');
  }
}

function detectContactJsonSource(node) {
  const contactNode = node.closest('[data-contact]');
  if (!contactNode) {
    return null;
  }

  const key = contactNode.getAttribute('data-contact');
  if (key === 'phone') {
    return { type: 'contact-json', path: ['phone', 'value'] };
  }
  if (key === 'email') {
    return { type: 'contact-json', path: ['email', 'value'] };
  }

  return null;
}

function detectServicesJsonSource(node) {
  const card = node.closest('.service-card[data-index]');
  if (!card) {
    return null;
  }

  const index = Number(card.getAttribute('data-index'));
  if (Number.isNaN(index)) {
    return null;
  }

  const tag = node.tagName.toLowerCase();
  let field = null;

  if (node.classList.contains('service-icon')) {
    field = 'icon';
  } else if (tag === 'h3') {
    field = 'title';
  } else if (node.classList.contains('service-price')) {
    field = 'price';
  } else if (tag === 'a' && node.classList.contains('btn-service')) {
    field = 'cta_text';
  } else if (tag === 'p') {
    field = 'description';
  }

  if (!field) {
    return null;
  }

  return { type: 'services-json', index, field };
}

function detectHtmlSource(node) {
  const navbarContainer = node.closest('#navbar-container');
  if (navbarContainer) {
    return {
      type: 'html',
      filePath: '/components/navbar.html',
      fileKind: 'fragment',
      sourceSelector: cssPath(node, navbarContainer),
    };
  }

  const footerContainer = node.closest('#footer-container');
  if (footerContainer) {
    return {
      type: 'html',
      filePath: '/components/footer.html',
      fileKind: 'fragment',
      sourceSelector: cssPath(node, footerContainer),
    };
  }

  return {
    type: 'html',
    filePath: normalizePath(currentPagePath),
    fileKind: 'page',
    sourceSelector: cssPath(node),
  };
}

function detectSource(node) {
  return detectContactJsonSource(node) || detectServicesJsonSource(node) || detectHtmlSource(node);
}

function applyDraftsToItems(items) {
  const draft = readDraft(currentPagePath);

  items.forEach((item) => {
    const saved = draft[item.selector];
    if (!saved) {
      return;
    }

    if (item.kind === 'text' && typeof saved.textContent === 'string') {
      item.value = saved.textContent;
      item.element.textContent = saved.textContent;
    }

    if (item.kind === 'image') {
      if (typeof saved.src === 'string') {
        item.values.src = saved.src;
        item.element.setAttribute('src', saved.src);
      }

      if (typeof saved.alt === 'string') {
        item.values.alt = saved.alt;
        item.element.setAttribute('alt', saved.alt);
      }

      if (typeof saved.zoom === 'number') {
        item.values.zoom = saved.zoom;
      }
      if (typeof saved.posX === 'number') {
        item.values.posX = saved.posX;
      }
      if (typeof saved.posY === 'number') {
        item.values.posY = saved.posY;
      }

      applyImagePresentation(item);
    }
  });
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, num));
}

function readImagePresentation(node) {
  const zoom = clampNumber(node.dataset.liveZoom, 100, 300, 100);
  const posX = clampNumber(node.dataset.livePosX, 0, 100, 50);
  const posY = clampNumber(node.dataset.livePosY, 0, 100, 50);
  return { zoom, posX, posY };
}

function applyImagePresentation(item) {
  const node = item.element;
  if (!node) {
    return;
  }

  const zoomScale = (item.values.zoom || 100) / 100;
  node.style.objectFit = 'cover';
  node.style.objectPosition = `${item.values.posX || 50}% ${item.values.posY || 50}%`;
  node.style.transformOrigin = 'center center';
  node.style.transform = `scale(${zoomScale})`;

  node.dataset.liveZoom = String(item.values.zoom || 100);
  node.dataset.livePosX = String(item.values.posX || 50);
  node.dataset.livePosY = String(item.values.posY || 50);
}

function collectEditableItems(doc) {
  itemsBySelector.clear();

  const collected = [];
  let idCounter = 0;

  const textNodes = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, button, a, label, figcaption, small, strong, em, blockquote'));
  for (const node of textNodes) {
    if (node.closest('script, style, noscript, svg, canvas, iframe')) {
      continue;
    }

    if (!isVisibleText(node)) {
      continue;
    }

    if (hasDisruptiveChildStructure(node)) {
      continue;
    }

    const text = normalizeText(node.textContent);
    if (!text) {
      continue;
    }

    const itemId = `item-${idCounter++}`;
    const selector = cssPath(node);
    const item = {
      id: itemId,
      kind: 'text',
      selector,
      label: `${sectionLabel(node)} | ${node.tagName.toLowerCase()} | ${truncateText(text)}`,
      value: text,
      element: node,
      source: detectSource(node),
    };

    node.dataset.liveItemId = itemId;
    node.dataset.liveSelector = selector;
    node.dataset.liveKind = 'text';

    itemsBySelector.set(selector, item);
    collected.push(item);
  }

  const images = Array.from(doc.querySelectorAll('img'));
  for (const node of images) {
    if (node.closest('script, style, noscript, svg, canvas, iframe')) {
      continue;
    }

    const selector = cssPath(node);
    const alt = node.getAttribute('alt') || 'image';
    const itemId = `item-${idCounter++}`;
    const item = {
      id: itemId,
      kind: 'image',
      selector,
      label: `${sectionLabel(node)} | image | ${truncateText(alt)}`,
      values: {
        src: node.getAttribute('src') || '',
        alt: node.getAttribute('alt') || '',
        ...readImagePresentation(node),
      },
      element: node,
      source: detectSource(node),
    };

    node.dataset.liveItemId = itemId;
    node.dataset.liveSelector = selector;
    node.dataset.liveKind = 'image';

    itemsBySelector.set(selector, item);
    collected.push(item);

    applyImagePresentation(item);
  }

  return collected;
}

function getSelectedItem() {
  if (!selectedSelector) {
    return null;
  }

  return itemsBySelector.get(selectedSelector) || null;
}

function findSectionImageSelector(item) {
  if (!item || !item.element) {
    return null;
  }

  const section = item.element.closest('header, nav, main, section, footer, aside, article');
  if (!section) {
    return null;
  }

  const image = section.querySelector('img[data-live-selector]');
  if (!image) {
    return null;
  }

  return image.getAttribute('data-live-selector');
}

function setSelectedItem(selector, options = {}) {
  const normalizedSelector = selector || '';
  selectedSelector = normalizedSelector && itemsBySelector.has(normalizedSelector) ? normalizedSelector : '';
  renderSelection();
  renderDetectedItems();
  highlightSelectedItem();

  if (options.focusEditor) {
    window.setTimeout(() => {
      const firstField = selectionEditor.querySelector('input, textarea');
      if (firstField) {
        firstField.focus();
      }
    }, 0);
  }

  if (options.scrollIntoView && selectedSelector) {
    const selectedCard = editorFields.querySelector(`[data-selector="${CSS.escape(selectedSelector)}"]`);
    if (selectedCard) {
      selectedCard.scrollIntoView({ block: 'nearest' });
    }
  }
}

function updateTextItem(item, value) {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  const node = doc.querySelector(item.selector);
  if (!node) {
    return;
  }

  item.value = value;
  node.textContent = value;
  saveDraft();
  renderDetectedItems();
  highlightSelectedItem();
}

function updateImageItem(item, prop, value) {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  const node = doc.querySelector(item.selector);
  if (!node) {
    return;
  }

  item.values[prop] = value;
  if (prop === 'src' || prop === 'alt') {
    node.setAttribute(prop, value);
  }

  if (prop === 'zoom') {
    item.values.zoom = clampNumber(value, 100, 300, item.values.zoom || 100);
  }

  if (prop === 'posX') {
    item.values.posX = clampNumber(value, 0, 100, item.values.posX || 50);
  }

  if (prop === 'posY') {
    item.values.posY = clampNumber(value, 0, 100, item.values.posY || 50);
  }

  applyImagePresentation(item);
  saveDraft();
  renderDetectedItems();
  highlightSelectedItem();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image'));
    reader.readAsDataURL(file);
  });
}

async function uploadImageAndApply(item, file, buttonEl) {
  if (!file) {
    return;
  }

  const saveApiBase = getSaveApiBaseUrl();
  const previousLabel = buttonEl ? buttonEl.textContent : '';
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Upload...';
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch(`${saveApiBase}/api/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok || typeof payload.path !== 'string') {
      throw new Error((payload && payload.error) || 'Echec de l\'upload image');
    }

    updateImageItem(item, 'src', payload.path);
    updatePublishStatus(`Image importee (${payload.path}). Cliquez sur "Appliquer aux fichiers" pour ecrire les changements.`);
  } catch (error) {
    console.error(error);
    updatePublishStatus(`Upload image impossible: ${error.message}`, true);
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = previousLabel || 'Uploader et remplacer';
    }
  }
}

function renderSelection() {
  if (!selectedSummary || !selectionEditor) {
    return;
  }

  const item = getSelectedItem();
  selectionEditor.innerHTML = '';

  if (!item) {
    selectedSummary.textContent = 'Aucun element selectionne.';
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Cliquez un texte ou une image dans l’aperçu pour commencer.';
    selectionEditor.appendChild(hint);
    return;
  }

  selectedSummary.textContent = item.kind === 'text'
    ? `Texte selectionne: ${item.label}`
    : `Image selectionnee: ${item.label}`;

  const form = document.createElement('div');
  form.className = 'selection-form';

  const meta = document.createElement('p');
  meta.className = 'hint';
  meta.textContent = 'Les changements restent en brouillon local jusqu\'a l\'action "Appliquer aux fichiers".';
  form.appendChild(meta);

  if (item.kind === 'text') {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';

    const label = document.createElement('label');
    label.textContent = 'Texte';

    const useTextarea = item.value.length > 90;
    const input = document.createElement(useTextarea ? 'textarea' : 'input');
    if (!useTextarea) {
      input.type = 'text';
    }
    input.value = item.value;
    input.addEventListener('input', () => updateTextItem(item, input.value));

    fieldRow.appendChild(label);
    fieldRow.appendChild(input);
    form.appendChild(fieldRow);

    const sectionImageSelector = findSectionImageSelector(item);
    if (sectionImageSelector && sectionImageSelector !== item.selector) {
      const jumpRow = document.createElement('div');
      jumpRow.className = 'field-row';

      const jumpButton = document.createElement('button');
      jumpButton.type = 'button';
      jumpButton.className = 'btn-secondary';
      jumpButton.textContent = 'Selectionner l\'image de cette section';
      jumpButton.addEventListener('click', () => {
        setSelectedItem(sectionImageSelector, { focusEditor: true, scrollIntoView: true });
      });

      jumpRow.appendChild(jumpButton);
      form.appendChild(jumpRow);
    }
  } else {
    const srcRow = document.createElement('div');
    srcRow.className = 'field-row';

    const srcLabel = document.createElement('label');
    srcLabel.textContent = 'Image (src)';

    const srcInput = document.createElement('input');
    srcInput.type = 'text';
    srcInput.value = item.values.src;
    srcInput.addEventListener('input', () => updateImageItem(item, 'src', srcInput.value));

    srcRow.appendChild(srcLabel);
    srcRow.appendChild(srcInput);
    form.appendChild(srcRow);

    const altRow = document.createElement('div');
    altRow.className = 'field-row';

    const altLabel = document.createElement('label');
    altLabel.textContent = 'Texte alternatif';

    const altInput = document.createElement('input');
    altInput.type = 'text';
    altInput.value = item.values.alt;
    altInput.addEventListener('input', () => updateImageItem(item, 'alt', altInput.value));

    altRow.appendChild(altLabel);
    altRow.appendChild(altInput);
    form.appendChild(altRow);

    const uploadRow = document.createElement('div');
    uploadRow.className = 'field-row';

    const uploadLabel = document.createElement('label');
    uploadLabel.textContent = 'Remplacer par une image';

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'btn-action';
    uploadButton.textContent = 'Uploader et remplacer';
    uploadButton.addEventListener('click', () => {
      const selectedFile = uploadInput.files && uploadInput.files[0] ? uploadInput.files[0] : null;
      uploadImageAndApply(item, selectedFile, uploadButton);
    });

    uploadRow.appendChild(uploadLabel);
    uploadRow.appendChild(uploadInput);
    uploadRow.appendChild(uploadButton);
    form.appendChild(uploadRow);

    const zoomRow = document.createElement('div');
    zoomRow.className = 'field-row';
    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = `Zoom (${Math.round(item.values.zoom)}%)`;
    const zoomInput = document.createElement('input');
    zoomInput.type = 'range';
    zoomInput.min = '100';
    zoomInput.max = '300';
    zoomInput.step = '1';
    zoomInput.value = String(item.values.zoom);
    zoomInput.addEventListener('input', () => {
      updateImageItem(item, 'zoom', zoomInput.value);
      zoomLabel.textContent = `Zoom (${Math.round(item.values.zoom)}%)`;
    });
    zoomRow.appendChild(zoomLabel);
    zoomRow.appendChild(zoomInput);
    form.appendChild(zoomRow);

    const posXRow = document.createElement('div');
    posXRow.className = 'field-row';
    const posXLabel = document.createElement('label');
    posXLabel.textContent = `Recadrage horizontal (${Math.round(item.values.posX)}%)`;
    const posXInput = document.createElement('input');
    posXInput.type = 'range';
    posXInput.min = '0';
    posXInput.max = '100';
    posXInput.step = '1';
    posXInput.value = String(item.values.posX);
    posXInput.addEventListener('input', () => {
      updateImageItem(item, 'posX', posXInput.value);
      posXLabel.textContent = `Recadrage horizontal (${Math.round(item.values.posX)}%)`;
    });
    posXRow.appendChild(posXLabel);
    posXRow.appendChild(posXInput);
    form.appendChild(posXRow);

    const posYRow = document.createElement('div');
    posYRow.className = 'field-row';
    const posYLabel = document.createElement('label');
    posYLabel.textContent = `Recadrage vertical (${Math.round(item.values.posY)}%)`;
    const posYInput = document.createElement('input');
    posYInput.type = 'range';
    posYInput.min = '0';
    posYInput.max = '100';
    posYInput.step = '1';
    posYInput.value = String(item.values.posY);
    posYInput.addEventListener('input', () => {
      updateImageItem(item, 'posY', posYInput.value);
      posYLabel.textContent = `Recadrage vertical (${Math.round(item.values.posY)}%)`;
    });
    posYRow.appendChild(posYLabel);
    posYRow.appendChild(posYInput);
    form.appendChild(posYRow);
  }

  selectionEditor.appendChild(form);
}

function renderDetectedItems() {
  if (!editorFields) {
    return;
  }

  editorFields.innerHTML = '';

  if (editableItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Aucun element editable detecte sur cette page.';
    editorFields.appendChild(empty);
    return;
  }

  editableItems.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'item-card';
    button.dataset.selector = item.selector;
    if (item.selector === selectedSelector) {
      button.classList.add('is-selected');
    }

    const kind = document.createElement('p');
    kind.className = 'group-title';
    kind.textContent = item.kind === 'text' ? 'Texte' : 'Image';

    const label = document.createElement('p');
    label.className = 'item-label';
    label.textContent = item.label;

    button.appendChild(kind);
    button.appendChild(label);
    button.addEventListener('click', () => {
      setSelectedItem(item.selector, { focusEditor: true, scrollIntoView: false });
    });

    editorFields.appendChild(button);
  });
}

function installClickBridge(doc) {
  if (doc.body && doc.body.dataset.liveBridgeInstalled === '1') {
    return;
  }

  if (doc.body) {
    doc.body.dataset.liveBridgeInstalled = '1';
  }

  doc.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || target.nodeType !== 1) {
      return;
    }

    const node = target.closest('[data-live-selector]');
    if (!node) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selector = node.getAttribute('data-live-selector');
    if (selector) {
      setSelectedItem(selector, { focusEditor: true, scrollIntoView: true });
    }
  }, true);
}

function runScan(token) {
  if (token !== currentToken) {
    return;
  }

  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  try {
    installPreviewStyles(doc);
    applyPublishedOverridesToDocument(doc, currentPagePath);
    editableItems = collectEditableItems(doc);
    applyDraftsToItems(editableItems);

    if (selectedSelector && !itemsBySelector.has(selectedSelector)) {
      selectedSelector = '';
    }

    renderDetectedItems();
    renderSelection();
    installClickBridge(doc);
    highlightSelectedItem();
  } catch (error) {
    console.error('Scan admin live editor failed:', error);
    if (editorFields) {
      editorFields.innerHTML = '';
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Erreur lors de la detection des elements editables. Ouvrez la console pour le detail.';
      editorFields.appendChild(hint);
    }
  }
}

function scheduleRescans() {
  const token = ++currentToken;
  scanTimers.forEach((timerId) => window.clearTimeout(timerId));
  scanTimers = [];

  const delays = [150, 700, 1400];
  delays.forEach((delay) => {
    const timerId = window.setTimeout(() => runScan(token), delay);
    scanTimers.push(timerId);
  });
}

function loadPage(path) {
  const clean = ensurePath(path);
  currentPagePath = clean;
  selectedSelector = '';
  pagePathInput.value = clean;

  const publishedCount = Object.keys(readPublishedOverrides()[normalizePath(clean)] || {}).length;
  if (publishedCount > 0) {
    updatePublishStatus(`Cette page contient ${publishedCount} changements deja appliques aux fichiers.`);
  } else {
    updatePublishStatus('Aucun changement applique aux fichiers pour cette page.');
  }

  const nextSrc = framePath(clean);
  const currentSrc = previewFrame.getAttribute('src') || '';
  if (currentSrc === nextSrc) {
    scheduleRescans();
    return;
  }

  previewFrame.setAttribute('src', nextSrc);
}

function setNestedValue(target, pathSegments, value) {
  let current = target;
  for (let i = 0; i < pathSegments.length - 1; i += 1) {
    const segment = pathSegments[i];
    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[pathSegments[pathSegments.length - 1]] = value;
}

async function fetchTextFile(filePath) {
  const response = await fetch(`${filePath}?cacheBust=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Impossible de lire ${filePath}`);
  }

  return response.text();
}

async function fetchJsonFile(filePath) {
  const response = await fetch(`${filePath}?cacheBust=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Impossible de lire ${filePath}`);
  }

  return response.json();
}

function parseHtml(content) {
  return new DOMParser().parseFromString(content, 'text/html');
}

function serializeHtml(doc, kind) {
  if (kind === 'fragment') {
    return `${doc.body.innerHTML.trim()}\n`;
  }

  return `<!doctype html>\n${doc.documentElement.outerHTML}\n`;
}

function buildFilePlansFromItems(items) {
  const htmlPlans = new Map();
  const contactMutations = [];
  const servicesMutations = [];

  items.forEach((item) => {
    if (!item.source) {
      return;
    }

    if (item.source.type === 'contact-json' && item.kind === 'text') {
      contactMutations.push({ path: item.source.path, value: item.value });
      return;
    }

    if (item.source.type === 'services-json' && item.kind === 'text') {
      servicesMutations.push({ index: item.source.index, field: item.source.field, value: item.value });
      return;
    }

    if (item.source.type !== 'html') {
      return;
    }

    if (!item.source.sourceSelector) {
      return;
    }

    const key = item.source.filePath;
    if (!htmlPlans.has(key)) {
      htmlPlans.set(key, {
        filePath: item.source.filePath,
        fileKind: item.source.fileKind,
        updates: [],
      });
    }

    if (item.kind === 'text') {
      htmlPlans.get(key).updates.push({
        selector: item.source.sourceSelector,
        kind: 'text',
        value: item.value,
      });
      return;
    }

    htmlPlans.get(key).updates.push({
      selector: item.source.sourceSelector,
      kind: 'image',
      src: item.values.src,
      alt: item.values.alt,
      zoom: item.values.zoom,
      posX: item.values.posX,
      posY: item.values.posY,
    });
  });

  return { htmlPlans: Array.from(htmlPlans.values()), contactMutations, servicesMutations };
}

async function buildWritableFiles() {
  const { htmlPlans, contactMutations, servicesMutations } = buildFilePlansFromItems(editableItems);
  const files = [];

  for (const plan of htmlPlans) {
    const htmlContent = await fetchTextFile(plan.filePath);
    const doc = parseHtml(htmlContent);

    plan.updates.forEach((update) => {
      const node = doc.querySelector(update.selector);
      if (!node) {
        return;
      }

      if (update.kind === 'text') {
        node.textContent = update.value;
        return;
      }

      node.setAttribute('src', update.src || '');
      node.setAttribute('alt', update.alt || '');
      const zoom = clampNumber(update.zoom, 100, 300, 100);
      const posX = clampNumber(update.posX, 0, 100, 50);
      const posY = clampNumber(update.posY, 0, 100, 50);
      node.style.objectFit = 'cover';
      node.style.objectPosition = `${posX}% ${posY}%`;
      node.style.transformOrigin = 'center center';
      node.style.transform = `scale(${zoom / 100})`;
      node.setAttribute('data-live-zoom', String(zoom));
      node.setAttribute('data-live-pos-x', String(posX));
      node.setAttribute('data-live-pos-y', String(posY));
    });

    files.push({
      path: plan.filePath,
      content: serializeHtml(doc, plan.fileKind),
    });
  }

  if (contactMutations.length > 0) {
    const contactJson = await fetchJsonFile('/data/contact.json');
    contactMutations.forEach((mutation) => {
      setNestedValue(contactJson, mutation.path, mutation.value);
    });

    files.push({
      path: '/data/contact.json',
      content: `${JSON.stringify(contactJson, null, 2)}\n`,
    });
  }

  if (servicesMutations.length > 0) {
    const servicesJson = await fetchJsonFile('/data/services.json');
    servicesMutations.forEach((mutation) => {
      if (!servicesJson.services || !servicesJson.services[mutation.index]) {
        return;
      }
      servicesJson.services[mutation.index][mutation.field] = mutation.value;
    });

    files.push({
      path: '/data/services.json',
      content: `${JSON.stringify(servicesJson, null, 2)}\n`,
    });
  }

  const byPath = new Map();
  files.forEach((file) => {
    byPath.set(file.path, file);
  });

  return Array.from(byPath.values());
}

async function applyChangesToProjectFiles() {
  if (!editableItems.length) {
    updatePublishStatus('Aucun element detecte a appliquer.', true);
    return;
  }

  updatePublishStatus('Application des changements dans les fichiers...');

  try {
    const files = await buildWritableFiles();
    if (files.length === 0) {
      updatePublishStatus('Aucun changement ecrivable detecte pour cette page.');
      return;
    }

    const saveApiBase = getSaveApiBaseUrl();
    const response = await fetch(`${saveApiBase}/api/write-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Echec lors de l\'ecriture des fichiers');
    }

    updatePublishStatus(`Changements appliques dans ${payload.written.length} fichier(s): ${payload.written.join(', ')}`);
  } catch (error) {
    console.error(error);
    const apiHint = getSaveApiBaseUrl();
    updatePublishStatus(`Impossible d'appliquer les changements: ${error.message}. Verifiez que le Save API est accessible sur ${apiHint}.`, true);
  }
}

function setupControls() {
  loadPageButton.addEventListener('click', () => {
    loadPage(pagePathInput.value);
  });

  pagePathInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadPage(pagePathInput.value);
    }
  });

  if (clearPageDraftButton) {
    clearPageDraftButton.addEventListener('click', () => {
      clearDraft();
    });
  }

  if (publishPageButton) {
    publishPageButton.addEventListener('click', () => {
      applyChangesToProjectFiles();
    });
  }
}

function init() {
  setupControls();
  previewFrame.addEventListener('load', scheduleRescans);
  loadPage(pagePathInput.value);

  window.setTimeout(() => {
    const doc = previewFrame.contentDocument;
    if (doc && doc.readyState !== 'loading') {
      scheduleRescans();
    }
  }, 60);
}

init();
