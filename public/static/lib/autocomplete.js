/**
 * Autocomplete Helpers — Wraps autocomp.js for party & commodity search
 * 
 * Usage:
 *   import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';
 *   attachPartyAutocomp('sellerName');  // binds to <input id="sellerName">
 */

import { autocomp } from '../vendor/autocomp.js';
import { get } from './api.js';

/**
 * Attach party name autocomplete to an input field.
 * Queries the backend for exact matches across the full DB.
 */
export function attachPartyAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        if (!val || val.trim() === '') return [];
        // fetch directly from API (bypasses limit cache)
        const parties = await get(`/parties?q=${encodeURIComponent(val)}`);
        return parties.map(p => p.name);
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
 * Queries the backend for exact matches across the full DB.
 */
export function attachCommodityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        if (!val || val.trim() === '') return [];
        const commodities = await get(`/commodities?q=${encodeURIComponent(val)}`);
        return commodities.map(c => c.name);
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
