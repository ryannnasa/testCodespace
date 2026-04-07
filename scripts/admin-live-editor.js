const previewFrame = document.getElementById('preview-frame');
const pagePathInput = document.getElementById('page-path');
const loadPageButton = document.getElementById('load-page');
const editorFields = document.getElementById('editor-fields');

const fieldsById = new Map();
let editableItems = [];
let currentToken = 0;
let scanTimers = [];

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

function cssPath(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  const steps = [];
  let node = element;
  while (node && node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'html') {
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
  const section = element.closest('header, nav, main, section, footer, aside');
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

function makeItem(id, kind, element, prop, label, value) {
  return {
    id,
    kind,
    selector: cssPath(element),
    prop,
    label,
    value
  };
}

function collectEditableItems(doc) {
  const collected = [];
  let idCounter = 0;

  const textNodes = Array.from(doc.querySelectorAll('h1, h2, h3, h4, p, li, span'));
  for (const node of textNodes) {
    if (node.closest('script, style, noscript')) {
      continue;
    }
    if (!isVisibleText(node)) {
      continue;
    }
    if (node.children.length > 0 && node.tagName.toLowerCase() === 'span') {
      continue;
    }

    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    const section = sectionLabel(node);
    const shortText = text.length > 55 ? `${text.slice(0, 55)}...` : text;
    const itemId = `item-${idCounter++}`;
    node.dataset.liveItemId = itemId;
    collected.push(makeItem(itemId, 'Texte', node, 'textContent', `${section} | ${node.tagName.toLowerCase()} | ${shortText}`, text));
  }

  const anchors = Array.from(doc.querySelectorAll('a'));
  for (const node of anchors) {
    const section = sectionLabel(node);
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim() || 'lien';

    const hrefId = `item-${idCounter++}`;
    node.dataset.liveItemId = node.dataset.liveItemId || hrefId;
    collected.push(makeItem(hrefId, 'Lien URL', node, 'href', `${section} | lien | ${text}`, node.getAttribute('href') || ''));
  }

  const images = Array.from(doc.querySelectorAll('img'));
  for (const node of images) {
    const section = sectionLabel(node);
    const alt = node.getAttribute('alt') || 'image';

    const srcId = `item-${idCounter++}`;
    node.dataset.liveItemId = node.dataset.liveItemId || srcId;
    collected.push(makeItem(srcId, 'Image src', node, 'src', `${section} | image | ${alt}`, node.getAttribute('src') || ''));

    const altId = `item-${idCounter++}`;
    collected.push(makeItem(altId, 'Image alt', node, 'alt', `${section} | image alt | ${alt}`, node.getAttribute('alt') || ''));
  }

  return collected;
}

function focusField(itemId) {
  const input = fieldsById.get(itemId);
  if (!input) {
    return;
  }

  input.focus({ preventScroll: false });
  input.classList.add('field-focus');
  window.setTimeout(() => input.classList.remove('field-focus'), 900);
}

function applyItemChange(item, value) {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  const node = doc.querySelector(item.selector);
  if (!node) {
    return;
  }

  if (item.prop === 'textContent') {
    node.textContent = value;
    return;
  }

  node.setAttribute(item.prop, value);
}

function buildField(item) {
  const card = document.createElement('div');
  card.className = 'item-card';

  const row = document.createElement('div');
  row.className = 'field-row';

  const kind = document.createElement('p');
  kind.className = 'group-title';
  kind.textContent = item.kind;

  const label = document.createElement('label');
  label.className = 'item-label';
  label.textContent = item.label;

  const useTextarea = item.prop === 'textContent' && item.value.length > 70;
  const input = document.createElement(useTextarea ? 'textarea' : 'input');
  if (!useTextarea) {
    input.type = 'text';
  }
  input.value = item.value;
  input.dataset.itemId = item.id;

  input.addEventListener('input', () => {
    item.value = input.value;
    applyItemChange(item, input.value);
  });

  fieldsById.set(item.id, input);
  row.appendChild(kind);
  row.appendChild(label);
  row.appendChild(input);
  card.appendChild(row);
  return card;
}

function renderFields() {
  editorFields.innerHTML = '';
  fieldsById.clear();

  if (editableItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Aucun element editable detecte sur cette page.';
    editorFields.appendChild(empty);
    return;
  }

  editableItems.forEach((item) => {
    editorFields.appendChild(buildField(item));
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
    if (!(target instanceof Element)) {
      return;
    }

    const node = target.closest('[data-live-item-id]');
    if (!node) {
      return;
    }

    event.preventDefault();
    const itemId = node.getAttribute('data-live-item-id');
    if (itemId) {
      focusField(itemId);
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

  editableItems = collectEditableItems(doc);
  renderFields();
  installClickBridge(doc);
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
  pagePathInput.value = clean;
  previewFrame.src = framePath(clean);
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
}

function init() {
  setupControls();
  previewFrame.addEventListener('load', scheduleRescans);
  loadPage(pagePathInput.value);
}

init();
