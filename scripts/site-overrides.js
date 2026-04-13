const PUBLISHED_STORAGE_KEY = 'admin-live-editor:published:v1';

function normalizePath(pathname) {
  const raw = (pathname || '').trim();
  if (!raw || raw === '/') {
    return '/index.html';
  }

  if (raw.endsWith('/')) {
    return `${raw}index.html`;
  }

  if (!raw.endsWith('.html')) {
    return `${raw}.html`;
  }

  return raw;
}

function readPublishedOverrides() {
  try {
    const raw = window.localStorage.getItem(PUBLISHED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Impossible de lire les changements publies', error);
    return {};
  }
}

function getPublishedPageOverrides(pathname = window.location.pathname) {
  const all = readPublishedOverrides();
  return all[normalizePath(pathname)] || {};
}

function applyPublishedOverridesToDocument(doc, pathname = window.location.pathname) {
  const pageOverrides = getPublishedPageOverrides(pathname);

  Object.entries(pageOverrides).forEach(([selector, payload]) => {
    const node = doc.querySelector(selector);
    if (!node || !payload || typeof payload !== 'object') {
      return;
    }

    if (payload.kind === 'text' && typeof payload.textContent === 'string') {
      const children = Array.from(node.children || []);
      const allBreaks = children.every((child) => child.tagName && child.tagName.toLowerCase() === 'br');
      if (children.length > 0 && !allBreaks) {
        return;
      }

      node.textContent = payload.textContent;
      return;
    }

    if (payload.kind === 'image') {
      if (typeof payload.src === 'string') {
        node.setAttribute('src', payload.src);
      }
      if (typeof payload.alt === 'string') {
        node.setAttribute('alt', payload.alt);
      }
    }
  });
}

function applyPublishedSiteOverrides() {
  applyPublishedOverridesToDocument(document, window.location.pathname);
}

export {
  PUBLISHED_STORAGE_KEY,
  normalizePath,
  readPublishedOverrides,
  getPublishedPageOverrides,
  applyPublishedOverridesToDocument,
  applyPublishedSiteOverrides,
};
