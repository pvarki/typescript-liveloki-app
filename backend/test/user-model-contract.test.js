import test from 'node:test';
import assert from 'node:assert/strict';

test('getUserCn accepts legacy cert_cn payloads', async () => {
    const { getUserCn } = await import('../models/users.js');

    assert.equal(getUserCn({ certCn: 'legacy.cn', callsign: 'callsign' }), 'legacy.cn');
});

test('getUserCn falls back to callsign for RM product lifecycle payloads', async () => {
    const { getUserCn } = await import('../models/users.js');

    assert.equal(getUserCn({ uuid: 'user-id', callsign: 'firstadmin' }), 'firstadmin');
});
