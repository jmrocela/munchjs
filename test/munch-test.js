var vows = require('vows'),
    assert = require('assert');

vows.describe('Parse HTML').addBatch({
    'truthy': {
        'isTruthy': function () {
            assert.isTrue(true);
        }
    }
}).export(module);