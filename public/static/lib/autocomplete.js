/**
 * Autocomplete Helpers — Wraps autocomp.js for party & commodity search
 *
 * Filters locally from the clientCache full list loaded during warmup.
 * Zero network requests — results appear instantly.
 *
 * Usage:
 *   import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';
 *   attachPartyAutocomp('sellerName', (name, party) => { ... });
 */

import { autocomp } from '../vendor/autocomp.js';
import { get, clientCache } from './api.js';

/** Return the full parties list from clientCache (populated by warmup). */
async function getPartiesList() {
  if (clientCache.has('/parties')) return clientCache.get('/parties');
  return get('/parties');
}

/** Return the full commodities list from clientCache. */
async function getCommoditiesList() {
  if (clientCache.has('/commodities')) return clientCache.get('/commodities');
  return get('/commodities');
}

/**
 * Attach party name autocomplete to an input field.
 * Passes (name, partyObject) to onSelectCb.
 */
export function attachPartyAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getPartiesList();
      const matches = (all || [])
        .filter(p => p.name && p.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(p => p.name + (p.place ? ` (${p.place})` : ''));
    },
    onSelect: (val) => {
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(p => p.name === name);
      }
      if (onSelectCb) onSelectCb(name, matchedObj);
      return name;
    },
  });
}

/**
 * Attach commodity name autocomplete to an input field.
 * Passes (name, commodityObject) to onSelectCb.
 */
export function attachCommodityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getCommoditiesList();
      const matches = (all || [])
        .filter(c => c.name && c.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(c => c.name + (c.unit ? ` (${c.unit})` : ''));
    },
    onSelect: (val) => {
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(c => c.name === name);
      }
      if (onSelectCb) onSelectCb(name, matchedObj);
      return name;
    },
  });
}
