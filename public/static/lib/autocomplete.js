/**
 * Autocomplete Helpers — Wraps autocomp.js for party & commodity search
 *
 * Filters locally from the clientCache full list loaded during warmup.
 * Zero network requests — results appear instantly.
 *
 * Usage:
 *   import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';
 *   attachPartyAutocomp('sellerName');  // binds to <input id="sellerName">
 */

import { autocomp } from '../vendor/autocomp.js';
import { get, clientCache } from './api.js';

/** Return the full parties list from clientCache (populated by warmup). */
async function getPartiesList() {
  // clientCache has '/parties' → full array, loaded at login via warmup payload
  if (clientCache.has('/parties')) return clientCache.get('/parties');
  // Fallback: fetch once and it will be cached by the api client
  return get('/parties');
}

/** Return the full commodities list from clientCache. */
async function getCommoditiesList() {
  if (clientCache.has('/commodities')) return clientCache.get('/commodities');
  return get('/commodities');
}

/**
 * Attach party name autocomplete to an input field.
 * Filters locally — no network request per keystroke.
 */
export function attachPartyAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getPartiesList();
      return (all || [])
        .filter(p => p.name && p.name.toLowerCase().includes(q))
        .slice(0, 15)
        .map(p => p.name + (p.place ? ` (${p.place})` : ''));
    },
    onSelect: (val) => {
      // Strip the " (place)" suffix that was appended for display
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      if (onSelectCb) onSelectCb(name);
      return name;
    },
  });
}

/**
 * Attach commodity name autocomplete to an input field.
 * Filters locally — no network request per keystroke.
 */
export function attachCommodityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getCommoditiesList();
      return (all || [])
        .filter(c => c.name && c.name.toLowerCase().includes(q))
        .slice(0, 15)
        .map(c => c.name + (c.unit ? ` (${c.unit})` : ''));
    },
    onSelect: (val) => {
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      if (onSelectCb) onSelectCb(name);
      return name;
    },
  });
}
