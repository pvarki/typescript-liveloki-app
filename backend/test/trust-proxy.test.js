import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../app.js';

test('sets trust proxy hop count from config', () => {
    const app = createApp({
        baseUrl: '/',
        trustProxyHops: 1,
    });

    assert.equal(app.get('trust proxy'), 1);
});
