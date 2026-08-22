'use strict';

const platformActivityService = require('./platformActivity.service');

describe('services/platformActivity.service', () => {
  it('log() assigns an incrementing id and prepends to findAll() (newest first)', () => {
    const first = platformActivityService.log(
      1,
      'PROVISION_ORGANIZATION',
      501,
      'Provisioned "Test Org"',
    );
    const second = platformActivityService.log(
      1,
      'SUSPEND_ORGANIZATION',
      501,
      'Suspended "Test Org"',
    );

    expect(second.id).toBe(first.id + 1);
    const all = platformActivityService.findAll();
    expect(all[0]).toEqual(second);
    expect(all).toContainEqual(first);
  });

  it('log() records the acting platform user and target organization', () => {
    const entry = platformActivityService.log(
      7,
      'SET_MODULE_FLAG',
      99,
      'INSURANCE disabled',
    );
    expect(entry.platform_user_id).toBe(7);
    expect(entry.target_organization_id).toBe(99);
    expect(entry.action).toBe('SET_MODULE_FLAG');
    expect(entry.created_at).toBeTruthy();
  });
});
