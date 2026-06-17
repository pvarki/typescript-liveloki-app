import test from 'node:test';
import assert from 'node:assert/strict';

function createResponse() {
    return {
        body: null,
        statusCode: 200,
        json(body) {
            this.body = body;
            return this;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
    };
}

test('BattleLog exposes its card on the main product description endpoint', async () => {
    const { descriptionV2Handler } = await import('../controllers/rmController.js');
    const response = createResponse();

    await descriptionV2Handler({ params: { language: 'en' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.shortname, 'bl');
    assert.equal(response.body.component.type, 'link');
});

test('BattleLog does not expose a separate admin tools product card', async () => {
    const { descriptionV2AdminHandler } = await import('../controllers/rmController.js');
    const response = createResponse();

    await descriptionV2AdminHandler({ params: { language: 'en' } }, response);

    assert.equal(response.statusCode, 404);
});
