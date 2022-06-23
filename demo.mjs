import { AppLogger } from './index.mjs';

// Basic usage - logger

export var l = new AppLogger('demo', 0 /* verbose */);

/**
 * Illustrates using the logger
 * @param {*} l - an AppLogger instance to log onto
 */
export function doBasicLogging(l) {
    l.error("I owe: $", 300 + 100, " dollars to my ex");
    l.warn("I don't have enough money in the bank:  $", 0);
    l.info("wise to pay your debts!");
    l.debug("i probably shouldn't have borrowed gas money from her");
    l.verbose = 2;
    l.v1("I borrowed $400");
    l.v2("First it was $300");
    l.v2("Then it was another $100");
    l.v3("(It was to pay the rent)");
    return `
demo: ERROR: demo.js:38: I owe: $400 dollars to my ex
demo: WARN: demo.js:39: I don't have enough money in the bank:  $0
demo: INFO: demo.js:40: wise to pay your debts!
demo: DEBUG: demo.js:41: i probably shouldn't have borrowed gas money from her
demo: V1: demo.js:43: I borrowed $400
demo: V2: demo.js:44: First it was $300
demo: V2: demo.js:45: Then it was another $100
`;
}

// Advanced usage

/**
 * Test numFramesInThisModule()
 * 
 * numFramesInThisModul() tells you how deep you are into the callstack for the current module
### frame X: test.mjs (different file)
### frame 1: doTellMeHowDeepIAm(l)
### frame 2: c()
### frame 3: b()
### frame 4: a()
 */
import { numFramesInThisModule } from './index.mjs';
export function doTellMeHowDeepIAm(l) {
    function a() {
        l.info("num frames deep in this module: ", numFramesInThisModule());
    }
    function b() {
        a()
        l.info("num frames deep in this module: ", numFramesInThisModule());
    }
    function c() {
        b();
        l.info("num frames deep in this module: ", numFramesInThisModule());
    }
    c();
    return `
demo: INFO: demo.mjs:50: num frames deep in this module: 4
demo: INFO: demo.mjs:54: num frames deep in this module: 3
demo: INFO: demo.mjs:58: num frames deep in this module: 2
`;
}

import { adorn } from './index.mjs';
export function doAdornMessage(l) {
    l.info(adorn("Hello!"));  // adorn and info both stamp linenumber (we wouldn't normally use both)
    l.info(adorn("Hello", " world!"));
    l.info(adorn("Hello", " and check out my object! ", {foo: "bar"}));
    return `
    demo: INFO: demo.mjs:79: demo.mjs:79: Hello!
    demo: INFO: demo.mjs:79: demo.mjs:80: Hello world!
    demo: INFO: demo.mjs:79: demo.mjs:81: Hello and check out my object! {"foo":"bar"}
`;
}

doTellMeHowDeepIAm(l);
doAdornMessage(l);
