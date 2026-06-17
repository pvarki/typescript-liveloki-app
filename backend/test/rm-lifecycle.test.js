import test from 'node:test';
import assert from 'node:assert/strict';

test('rmController exports user lifecycle handlers', async () => {
    const rm = await import('../controllers/rmController.js');
    assert.equal(typeof rm.userCreated, 'function');
    assert.equal(typeof rm.userPromoted, 'function');
    assert.equal(typeof rm.userDemoted, 'function');
    assert.equal(typeof rm.userRevoked, 'function');
    assert.equal(typeof rm.userUpdated, 'function');
});

test('rmController still exports noOp for backwards compat', async () => {
    const rm = await import('../controllers/rmController.js');
    assert.equal(typeof rm.noOp, 'function');
});

test('rmController still exports existing handlers', async () => {
    const rm = await import('../controllers/rmController.js');
    assert.equal(typeof rm.checkHealth, 'function');
    assert.equal(typeof rm.descriptionV1Handler, 'function');
    assert.equal(typeof rm.descriptionV2Handler, 'function');
    assert.equal(typeof rm.instructionsHandler, 'function');
    assert.equal(typeof rm.clientDataHandler, 'function');
    assert.equal(typeof rm.adminClientDataHandler, 'function');
});

test('userCreated returns error when DB unavailable', async () => {
    const { userCreated } = await import('../controllers/rmController.js');
    const req = { body: { uuid: 'test-uuid', callsign: 'test', cert_cn: 'test.cn' } };
    let responseBody = null;
    const res = { json: (body) => { responseBody = body; }, status: () => ({ json: (body) => { responseBody = body; } }) };

    await userCreated(req, res);
    assert.equal(responseBody.success, false);
    assert.ok('error' in responseBody);
});
