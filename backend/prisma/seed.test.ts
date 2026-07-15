import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSeedPlan,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ORGANIZATION_NAME,
} from './seed.ts';

test('creates owner bootstrap plan when the database is empty', () => {
  const plan = buildSeedPlan({
    needsSetup: true,
    existingOrg: null,
    existingUser: null,
  });

  assert.equal(plan.organization.name, DEFAULT_ORGANIZATION_NAME);
  assert.equal(plan.user.email, DEFAULT_ADMIN_EMAIL);
  assert.equal(plan.user.password, DEFAULT_ADMIN_PASSWORD);
  assert.equal(plan.user.role, 'owner');
});

test('creates admin bootstrap plan inside the existing organization', () => {
  const plan = buildSeedPlan({
    needsSetup: false,
    existingOrg: {
      id: 'org-1',
      name: 'Existing Org',
    },
    existingUser: null,
  });

  assert.equal(plan.organization.name, 'Existing Org');
  assert.equal(plan.user.orgId, 'org-1');
  assert.equal(plan.user.role, 'admin');
});

test('creates owner bootstrap plan when an organization exists but no users exist yet', () => {
  const plan = buildSeedPlan({
    needsSetup: true,
    existingOrg: {
      id: 'org-1',
      name: 'Existing Org',
    },
    existingUser: null,
  });

  assert.equal(plan.user.orgId, 'org-1');
  assert.equal(plan.user.role, 'owner');
});

test('keeps owner role when the bootstrap account already owns the organization', () => {
  const plan = buildSeedPlan({
    needsSetup: false,
    existingOrg: {
      id: 'org-1',
      name: 'Existing Org',
    },
    existingUser: {
      id: 'user-1',
      email: DEFAULT_ADMIN_EMAIL,
      role: 'owner',
      orgId: 'org-1',
    },
  });

  assert.equal(plan.user.role, 'owner');
  assert.equal(plan.user.id, 'user-1');
});
