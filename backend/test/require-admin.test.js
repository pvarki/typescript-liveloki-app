import test from 'node:test';
import assert from 'node:assert/strict';

test('requireAdmin calls next when user is admin', async () => {
    const { requireAdmin } = await import('../middleware/requireAdmin.js');

    const req = { user: { cn: 'admin.user', isAdmin: true } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    requireAdmin(req, res, next);
    assert.equal(nextCalled, true);
});

test('requireAdmin returns 403 when user is not admin', async () => {
    const { requireAdmin } = await import('../middleware/requireAdmin.js');

    const req = { user: { cn: 'normal.user', isAdmin: false } };
    let statusCode = null;
    let responseBody = null;
    const res = {
        status: (code) => { statusCode = code; return { json: (body) => { responseBody = body; } }; },
    };
    const next = () => { assert.fail('next should not be called'); };

    requireAdmin(req, res, next);
    assert.equal(statusCode, 403);
    assert.ok(responseBody.error);
});

test('requireAdmin returns 401 when no user on request', async () => {
    const { requireAdmin } = await import('../middleware/requireAdmin.js');

    const req = {};
    let statusCode = null;
    const res = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
    };
    const next = () => { assert.fail('next should not be called'); };

    requireAdmin(req, res, next);
    assert.equal(statusCode, 401);
});
