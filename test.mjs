import * as assert from 'assert';
import { Transform } from 'stream';

import { AssertionError } from 'assert';
import * as Demo from './demo.mjs';

import { AppLogger } from './index.mjs';
import { trim } from 'lodash-es';
var l = new AppLogger('demo');

/**
 * Asserts that the log lines from string, a, match the log lines in the string, b.
 * We ignore leading/trailing whitespace, line-numbers, and the filepath before demo and test.
 * @param {*} a : the expected string / pattern
 * @param {*} b : the actual string
 */
let normFilepath = new RegExp(/\S*demo[^:]*:\d+/, 'g');
let normPytest = new RegExp(/\S*pytest[3]?/);
function assertMatching(a, b) {
    let a_lines = trim(a).split("\n");
    let b_lines = trim(b).split("\n");
    if (a_lines.length != b_lines.length)
        throw new AssertionError({"message": "a has " + a_lines.length + ", but b has " + b_lines.length + " lines: a={" + a + "}, b={" + b + "}"});
    for (let i of Array.from({length: a_lines.length}, (x, i) => i)) {
        let a_line = trim(a_lines[i]).replace(normFilepath, 'demo:<LINE>');
        a_line = a_line.replace(normPytest, 'pytest');
        let b_line = trim(b_lines[i]).replace(normFilepath, 'demo:<LINE>');
        b_line = b_line.replace(normPytest, 'pytest');
        assert.equal(b_line, a_line); // actual, expected
    }
}

/**
 * Runs a function and makes sure that it writes to the logger what is expected.
 * 
 * @param {*} func : a function which should write to the logger and return a string
 *    with the output that is expected on the logger due to running that function.
 * @param {*} funcName : name of the function under test
 */
function assertLogOutputIsAsExpected(func, funcName) {
    // First buffer the results
    const stringStream = new Transform({ // identity transform, just allows read/write of buffered stream
        transform(chunk, encoding, callback) {
          this.push(chunk);
          callback();
        }
      });
    let restore = l.diagStream;
    l.diagStream = stringStream;
    // make the call
    let sampleOutput = func(l);
    // check the result
    let warning = '';
    let error = null;
    try {
        l.diagStream.end();
        let stringStreamData = (stringStream.read() ?? '').toString();
        // console.log(stringStreamData);
        assertMatching(sampleOutput, stringStreamData);
    } catch (e) {
        console.error("got error matching actual against expected for " + funcName + ": " + e.toString());
        error = e;
    } finally {
        // free the buffer / restore logger to normal
        l.diagStream = restore;
        stringStream.destroy();
        if (error) throw error;
    }

}

// Mocha test cases
describe('module', function() {
    for (let [key, val] of Object.entries(Demo)) {
        if (key.slice(0, 2) == 'do') {
            describe(key, function() {
                it('should not throw an error when checking output is as-expected for  ' + key, function() {
                    assertLogOutputIsAsExpected(val, key);
                });
            });
        } else {
            l.info("skipping ", key);
        }
    }
});