import test from 'node:test';
import assert from 'node:assert/strict';

test('parseDistinguishedName extracts CN from comma-separated DN', async () => {
    const { parseDistinguishedName } = await import('../middleware/mtlsUserMiddleware.js');
    const result = parseDistinguishedName('CN=testuser,O=PVarki');
    assert.equal(result.CN, 'testuser');
    assert.equal(result.O, 'PVarki');
});

test('parseDistinguishedName extracts CN from slash-separated DN', async () => {
    const { parseDistinguishedName } = await import('../middleware/mtlsUserMiddleware.js');
    const result = parseDistinguishedName('/CN=testuser/O=PVarki');
    assert.equal(result.CN, 'testuser');
});

test('parseDistinguishedName returns empty object for empty input', async () => {
    const { parseDistinguishedName } = await import('../middleware/mtlsUserMiddleware.js');
    assert.deepStrictEqual(parseDistinguishedName(''), {});
    assert.deepStrictEqual(parseDistinguishedName(null), {});
    assert.deepStrictEqual(parseDistinguishedName(undefined), {});
});

test('mtlsUserMiddleware returns 401 when enforcement on and no header', async () => {
    const { createMtlsUserMiddleware } = await import('../middleware/mtlsUserMiddleware.js');
    const middleware = createMtlsUserMiddleware({ enforce: true, header: 'x-clientcert-dn' });

    const req = { get: () => undefined };
    let statusCode = null;
    let responseBody = null;
    const res = {
        status: (code) => { statusCode = code; return { json: (body) => { responseBody = body; } }; },
    };
    const next = () => { assert.fail('next should not be called'); };

    await middleware(req, res, next);
    assert.equal(statusCode, 401);
});

test('mtlsUserMiddleware returns 401 when DN has no CN', async () => {
    const { createMtlsUserMiddleware } = await import('../middleware/mtlsUserMiddleware.js');
    const middleware = createMtlsUserMiddleware({ enforce: true, header: 'x-clientcert-dn' });

    const req = { get: () => 'O=PVarki' };
    let statusCode = null;
    const res = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
    };
    const next = () => { assert.fail('next should not be called'); };

    await middleware(req, res, next);
    assert.equal(statusCode, 401);
});

test('mtlsUserMiddleware attaches default user when enforcement off', async () => {
    const { createMtlsUserMiddleware } = await import('../middleware/mtlsUserMiddleware.js');
    const middleware = createMtlsUserMiddleware({ enforce: false, header: 'x-clientcert-dn' });

    const req = { get: () => undefined };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await middleware(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(req.user.cn, 'unknown');
    assert.equal(req.user.isAdmin, true);
});
