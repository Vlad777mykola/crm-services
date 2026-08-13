/**
 * Intent-based feature registry — dependency graph for yarn dev <feature>.
 */

import { OUTBOX, SERVICES } from './bundles.mjs';

/** @typedef {{ requires?: string[]; schemas?: string[]; services?: string[]; outboxes?: string[]; frontend?: boolean }} FeatureDef */

/** @type {Record<string, FeatureDef>} */
export const features = {
  auth: {
    services: ['auth', 'users'],
    outboxes: ['auth'],
    frontend: true,
  },
  companies: {
    services: ['companies'],
    outboxes: [],
    frontend: true,
  },
  'companies-members': {
    services: ['companies', 'company-members'],
    outboxes: ['companies'],
    frontend: true,
  },
  dashboard: {
    requires: ['auth'],
    schemas: [
      'companies',
      'company-members',
      'specialists',
      'appointments',
      'notifications',
      'company-specialists',
      'services-catalog',
    ],
    services: ['dashboard'],
    frontend: true,
  },
  core: {
    requires: ['auth', 'companies', 'dashboard'],
    services: [],
    outboxes: [],
    frontend: true,
  },
  full: {
    services: [
      'auth',
      'users',
      'companies',
      'company-members',
      'specialists',
      'company-specialists',
      'services-catalog',
      'appointments',
      'reviews',
      'dashboard',
      'notifications',
    ],
    outboxes: [
      'auth',
      'users',
      'companies',
      'company-members',
      'specialists',
      'company-specialists',
      'services-catalog',
      'appointments',
      'reviews',
    ],
    frontend: true,
  },
};

/** Schema id → owning service id for migrate */
export const SCHEMA_SERVICE_MAP = {
  auth: 'auth',
  users: 'users',
  companies: 'companies',
  'company-members': 'company-members',
  specialists: 'specialists',
  'company-specialists': 'company-specialists',
  'services-catalog': 'services-catalog',
  appointments: 'appointments',
  reviews: 'reviews',
  notifications: 'notifications',
};

/**
 * Resolve a feature to process keys: service ids, outbox:<id>, frontend.
 * @param {string} name
 */
export function resolveFeature(name) {
  const feature = features[name];
  if (!feature) {
    throw new Error(`Unknown feature "${name}". Run: yarn dev list`);
  }

  const visitedFeatures = new Set();
  const serviceIds = new Set(feature.services ?? []);
  const outboxIds = new Set(feature.outboxes ?? []);
  const schemaIds = new Set(feature.schemas ?? []);

  function walkRequires(reqName) {
    if (visitedFeatures.has(reqName)) return;
    visitedFeatures.add(reqName);
    const req = features[reqName];
    if (!req) return;
    for (const s of req.services ?? []) serviceIds.add(s);
    for (const o of req.outboxes ?? []) outboxIds.add(o);
    for (const sc of req.schemas ?? []) schemaIds.add(sc);
    for (const r of req.requires ?? []) walkRequires(r);
  }

  for (const r of feature.requires ?? []) walkRequires(r);

  const keys = [];
  if (feature.frontend) keys.push('frontend');
  for (const id of serviceIds) keys.push(id);
  for (const id of outboxIds) keys.push(`outbox:${id}`);

  return {
    keys,
    schemaIds: [...schemaIds],
    description: name,
  };
}

export function listFeatures() {
  return Object.keys(features);
}
