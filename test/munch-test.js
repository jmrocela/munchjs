var vows = require('vows'),
    assert = require('assert');

vows.describe('Parse Views').addBatch({
    'with HTML': {
        'ids': function () {
            assert.isTrue(true);
        },
        'classes': function () {
            assert.isTrue(true);
        }
    },
    'with CSS Blocks in HTML': {
        'ids': function () {
            assert.isTrue(true);
        },
        'classes': function () {
            assert.isTrue(true);
        }
    },
    'with JS Blocks in HTML': {
        'ids': function () {
            assert.isTrue(true);
        },
        'classes': function () {
            assert.isTrue(true);
        }
    }
}).export(module);

vows.describe('Parse CSS').addBatch({
    'selectors': {
        'ids': function () {
            assert.isTrue(true);
        },
        'classes': function () {
            assert.isTrue(true);
        }
    },
    'within': {
        'media queries': function () {
            assert.isTrue(true);
        }
    },
}).export(module);

vows.describe('Parse JS').addBatch({
    'selectors': {
        'ids': function () {
            assert.isTrue(true);
        },
        'classes': function () {
            assert.isTrue(true);
        }
    }
}).export(module);

vows.describe('Utilities').addBatch({
    'map file': {
        'create': function () {
            assert.isTrue(true);
        },
        'read & use': function () {
            assert.isTrue(true);
        }
    }
}).export(module);