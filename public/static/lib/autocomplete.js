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

/** Return the full cities list from clientCache. */
export async function getCitiesList() {
  if (clientCache.has('/cities')) return clientCache.get('/cities');
  return get('/cities');
}

/**
 * Attach city name autocomplete to an input field.
 * Passes (name, cityObject) to onSelectCb.
 */
export function attachCityAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getCitiesList();
      const matches = (all || [])
        .filter(c => c.name && c.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(c => c.name + (c.stateName ? ` (${c.stateName})` : ''));
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

// ── Additional Master Data Autocomplete Helpers ──

/** Return the full transporters list from clientCache. */
async function getTransportersList() {
  if (clientCache.has('/transporters')) return clientCache.get('/transporters');
  return get('/transporters');
}

/** Return the full vehicles list from clientCache. */
async function getVehiclesList() {
  if (clientCache.has('/vehicles')) return clientCache.get('/vehicles');
  return get('/vehicles');
}

/** Return the full expense heads list from clientCache. */
async function getExpenseHeadsList() {
  if (clientCache.has('/expense-heads')) return clientCache.get('/expense-heads');
  return get('/expense-heads');
}

/** Return the full terms list from clientCache. */
async function getTermsList() {
  if (clientCache.has('/terms')) return clientCache.get('/terms');
  return get('/terms');
}

/** Return the full brands list from clientCache. */
async function getBrandsList() {
  if (clientCache.has('/brands')) return clientCache.get('/brands');
  return get('/brands');
}

/**
 * Attach transporter name autocomplete to an input field.
 */
export function attachTransporterAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getTransportersList();
      const matches = (all || [])
        .filter(t => t.name && t.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(t => t.name + (t.phone ? ` (${t.phone})` : ''));
    },
    onSelect: (val) => {
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(t => t.name === name);
      }
      if (onSelectCb) onSelectCb(name, matchedObj);
      return name;
    },
  });
}

/**
 * Attach vehicle type autocomplete to an input field.
 */
export function attachVehicleAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getVehiclesList();
      const matches = (all || [])
        .filter(v => v.vehicleType && v.vehicleType.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(v => v.vehicleType + (v.capacity ? ` (${v.capacity})` : ''));
    },
    onSelect: (val) => {
      const name = val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val;
      el.value = name;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(v => v.vehicleType === name);
      }
      if (onSelectCb) onSelectCb(name, matchedObj);
      return name;
    },
  });
}

/**
 * Attach expense head autocomplete to an input field.
 */
export function attachExpenseHeadAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getExpenseHeadsList();
      const matches = (all || [])
        .filter(e => e.name && e.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(e => e.name);
    },
    onSelect: (val) => {
      el.value = val;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(e => e.name === val);
      }
      if (onSelectCb) onSelectCb(val, matchedObj);
      return val;
    },
  });
}

/**
 * Attach brand autocomplete to an input field.
 */
export function attachBrandAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getBrandsList();
      const matches = (all || [])
        .filter(b => b.name && b.name.toLowerCase().includes(q))
        .slice(0, 15);
      el._matches = matches;
      return matches.map(b => b.name);
    },
    onSelect: (val) => {
      el.value = val;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(b => b.name === val);
      }
      if (onSelectCb) onSelectCb(val, matchedObj);
      return val;
    },
  });
}

/**
 * Attach terms & conditions autocomplete to an input field.
 */
export function attachTermsAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getTermsList();
      const matches = (all || [])
        .filter(t => {
          const searchText = (t.title || t.narration || '').toLowerCase();
          return searchText.includes(q);
        })
        .slice(0, 15);
      el._matches = matches;
      return matches.map(t => t.title || t.narration || '');
    },
    onSelect: (val) => {
      el.value = val;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(t => (t.title || t.narration) === val);
      }
      if (onSelectCb) onSelectCb(val, matchedObj);
      return val;
    },
  });
}

// ── Bank Master Autocomplete ──

/** Return the full banks list from clientCache. */
async function getBanksList() {
  if (clientCache.has('/banks?all=true')) return clientCache.get('/banks?all=true');
  return get('/banks?all=true');
}

/**
 * Attach bank name autocomplete to an input field.
 * Returns unique bank names and passes (bankName, bankObject) to onSelectCb.
 * Bank object contains: id, bankName, branch, ifscCode, center.
 */
export function attachBankAutocomp(inputId, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getBanksList();
      const matches = (all || [])
        .filter(b => b.bankName && b.bankName.toLowerCase().includes(q))
        .slice(0, 20);
      el._matches = matches;
      return matches.map(b => b.bankName + (b.branch ? ` - ${b.branch}` : '') + (b.ifscCode ? ` (${b.ifscCode})` : ''));
    },
    onSelect: (val) => {
      // Extract just the bank name part
      const name = val.includes(' - ') ? val.slice(0, val.indexOf(' - ')) : (val.includes(' (') ? val.slice(0, val.lastIndexOf(' (')) : val);
      el.value = name;
      let matchedObj = null;
      if (el._matches) {
        // Try to match by full display string first, then by name
        const fullIdx = el._matches.findIndex(b => {
          const display = b.bankName + (b.branch ? ` - ${b.branch}` : '') + (b.ifscCode ? ` (${b.ifscCode})` : '');
          return display === val;
        });
        matchedObj = fullIdx >= 0 ? el._matches[fullIdx] : el._matches.find(b => b.bankName === name);
      }
      if (onSelectCb) onSelectCb(name, matchedObj);
      return name;
    },
  });
}

// ── Broker Autocomplete (filtered by party roles) ──

/**
 * Attach broker autocomplete to an input field.
 * Filters parties by the specified broker role (BUYER_BROKER or SELLER_BROKER).
 * Passes (name, partyObject) to onSelectCb.
 */
export function attachBrokerAutocomp(inputId, brokerRole, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;

  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      const all = await getPartiesList();
      const matches = (all || [])
        .filter(p => {
          if (!p.name || !p.name.toLowerCase().includes(q)) return false;
          // Filter by broker role if roles data is available
          if (p.roles && Array.isArray(p.roles)) {
            return p.roles.some(r => (r.role || r) === brokerRole);
          }
          // If no roles data, show all matching names as fallback
          return true;
        })
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

