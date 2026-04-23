/**
 * Autocomplete Helpers — Wraps autocomp.js for party & commodity search
 * 
 * Usage:
 *   import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';
 *   attachPartyAutocomp('sellerName');  // binds to <input id="sellerName">
 */

import { autocomp } from '../vendor/autocomp.js';

/**
 * Attach party name autocomplete to an input field.
 * @param {string} inputId — the DOM id of the input element
 * @param {Function} [onSelectCb] — optional callback after selection
 */
export function attachPartyAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        const res = await fetch(`/api/search/parties?q=${encodeURIComponent(val)}`);
        const items = await res.json();
        return items.map(i => i.value);
      } catch {
        return [];
      }
    },
    onSelect: (val) => {
      el.value = val;
      if (onSelectCb) onSelectCb(val);
      return val;
    },
  });
}

/**
 * Attach commodity name autocomplete to an input field.
 * @param {string} inputId — the DOM id of the input element
 * @param {Function} [onSelectCb] — optional callback after selection
 */
export function attachCommodityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        const res = await fetch(`/api/search/commodities?q=${encodeURIComponent(val)}`);
        const items = await res.json();
        return items.map(i => i.value);
      } catch {
        return [];
      }
    },
    onSelect: (val) => {
      el.value = val;
      if (onSelectCb) onSelectCb(val);
      return val;
    },
  });
}
