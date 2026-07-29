/* Geri — couche visuelle partagée : icônes SVG, sans émojis dans l'interface */
(function () {
  'use strict';

  const icon = (name) => {
    const paths = {
      cart: '<path d="M3 4h2l2 11h10l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
      box: '<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
      chart: '<path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/>',
      users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M17 5a3 3 0 0 1 0 6M19 14c2.2.6 3.4 2.3 3.8 5"/>',
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
      wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M16 14h5"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05-2.2 2.2-.05-.05a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56v.08h-3.12v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.05.05-2.2-2.2.05-.05A1.7 1.7 0 0 0 6.72 15a1.7 1.7 0 0 0-1.56-1.04h-.08v-3.12h.08A1.7 1.7 0 0 0 6.72 9.8a1.7 1.7 0 0 0-.34-1.88l-.05-.05 2.2-2.2.05.05a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.56v-.08h3.12v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.05-.05 2.2 2.2-.05.05a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v3.12h-.08A1.7 1.7 0 0 0 19.4 15Z"/>',
      check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      phone: '<path d="M7 3h3l1.5 4-2 1.5c1 2.1 2.4 3.5 4.5 4.5l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C10.6 17.5 6.5 13.4 6.5 6.5c0-1.1.5-2.4.5-3.5Z"/>',
      spark: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/>',
      camera: '<path d="M4 8h3l1.4-2h7.2L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="14" r="3.5"/>',
      lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24" class="ui-icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.spark) + '</svg>';
  };

  const map = {
    '🛒': 'cart', '📦': 'box', '📊': 'chart', '📈': 'chart', '📉': 'chart', '👥': 'users', '👤': 'users', '👔': 'users', '👋': 'users',
    '🧾': 'receipt', '📋': 'receipt', '🖨': 'receipt', '💰': 'wallet', '💳': 'wallet', '💵': 'wallet', '💸': 'wallet',
    '💬': 'phone', '📱': 'phone', '📧': 'phone', '📩': 'phone', '⚙️': 'settings', '⚙': 'settings',
    '✅': 'check', '✓': 'check', '→': 'arrow', '🔄': 'arrow', '📥': 'arrow', '🔒': 'lock', '🔐': 'lock', '🔑': 'lock',
    '📷': 'camera', '🖼': 'camera', '🔍': 'spark', '✨': 'spark', '✦': 'spark', '💡': 'spark', '🤖': 'spark', '🎨': 'spark', '🔔': 'spark',
    '⭐': 'star', '🏆': 'star', '🚀': 'arrow', '🎉': 'spark', '⏳': 'spark', '🕐': 'chart', '📅': 'chart', '📍': 'spark',
    '🏪': 'box', '🗑': 'box', '🚨': 'spark', '🟠': 'spark', '🟢': 'check', '🔴': 'spark', '🟡': 'spark', '💜': 'spark',
    '🌾': 'box', '👕': 'box', '💄': 'box', '📡': 'chart', '🔧': 'settings', '🥤': 'box', '🧴': 'box', '💾': 'box', '🇳': 'spark', '🇸': 'spark'
  };
  const emoji = /🛒|📦|📊|📈|📉|👥|👤|👔|👋|🧾|📋|🖨|💰|💳|💵|💸|💬|📱|📧|📩|⚙️?|✅|✓|→|🔄|📥|🔒|🔐|🔑|📷|🖼|🔍|✨|✦|💡|🤖|🎨|🔔|⭐|🏆|🚀|🎉|⏳|🕐|📅|📍|🏪|🗑|🚨|🟠|🟢|🔴|🟡|💜|🌾|👕|💄|📡|🔧|🥤|🧴|💾|🇳|🇸/g;

  function replaceText(node) {
    emoji.lastIndex = 0;
    if (!node.nodeValue || !emoji.test(node.nodeValue)) return;
    emoji.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    node.nodeValue.replace(emoji, (match, offset) => {
      if (offset > cursor) fragment.appendChild(document.createTextNode(node.nodeValue.slice(cursor, offset)));
      const span = document.createElement('span');
      span.className = 'ui-icon-wrap';
      span.innerHTML = icon(map[match] || 'spark');
      fragment.appendChild(span);
      cursor = offset + match.length;
    });
    if (cursor < node.nodeValue.length) fragment.appendChild(document.createTextNode(node.nodeValue.slice(cursor)));
    node.parentNode.replaceChild(fragment, node);
  }

  function polish(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|CODE|PRE)$/.test(parent.tagName) || parent.closest('[data-no-iconify]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceText);
  }

  window.GeriIcon = icon;
  const start = () => {
    polish(document.body);
    const observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) polish(node);
      if (node.nodeType === 3) replaceText(node);
    })));
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
