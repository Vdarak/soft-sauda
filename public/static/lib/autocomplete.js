/**
 * Autocomplete Helpers — Wraps autocomp.js for party & commodity search
 * 
 * Usage:
 *   import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';
 *   attachPartyAutocomp('sellerName');  // binds to <input id="sellerName">
 */

import { autocomp } from '../vendor/autocomp.js';
import { clientCache } from './api.js';

/**
 * Attach party name autocomplete to an input field.
 * Filters strictly from the unified payload RAM cache (0 network latency).
 */
export function attachPartyAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        const parties = clientCache.get('/parties?page=1&limit=50') || [];
        const lowerVal = val.toLowerCase();
        return parties
          .filter(p => p.name.toLowerCase().includes(lowerVal))
          .map(p => p.name);
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
 * Filters strictly from the unified payload RAM cache (0 network latency).
 */
export function attachCommodityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      try {
        const commodities = clientCache.get('/commodities?page=1&limit=50') || [];
        const lowerVal = val.toLowerCase();
        return commodities
          .filter(c => c.name.toLowerCase().includes(lowerVal))
          .map(c => c.name);
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
