# app_error

The purpose of this module is to make logging and reporting of errors easier, more informative, and more consistent.

This is the javascript version of https://github.com/CheggEng/apperror.

AppLogger logs messages to include

* The name of the system generating the message (helpful in pipelines)
* The file name and line number where the log is written (helpful for quickly finding the relevant code)
* The log level of the message (useful for quick identification and filtering)
* The actual message

In addition, there is a bunch of other helpful functionality, see demo code below.

## Usage

Install with `npm i apperror_js` or put `apperror_js` into `package.json` dependencies.

Then in code:

```
import { AppLogger, AppStatus, Options } from 'apperror'; // or just import some of these
l = new AppLogger('demo');
l.debug("This call won't build a big string from my list of numbers, ", [0, 1, 2, 3], " or serialize ",
        my_complex_object, " unless debugging is turned on, so I can feel free to make lots of logging statements!");
if (l.isSetDebug())
    l.debug("I do want to protect logging inside conditional if I need to log with ", slowFunctionCall());
```
Output
```
demo: DEBUG: demo.mjs:25: This call won't build a big string from my list of numbers, [0, 1, 2, 3], or serialize { "complex": "object" } unless debugging is turned on, so I can feel free to make lots of logging statements!
demo: DEBUG: demo.mjs:28: I do want to protect logging inside conditional if I need to log with output of slow function call
```

## Demo Code 

```
// Basic usage - logger

export var l = new AppLogger('demo', 0 /* verbose */);

/**
 * Basic usage - illustrates using the logger
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

// Basic usage - status

/** Illustrates using the AppStatus object */
export function doBasicStatus(lChecked) {
    let s = new AppStatus();
    if (s.ok) lChecked.info("we're doing fine");
    
    s = new AppStatus("unable to find boot sector");
    s.addWarn("backup all data now");
    if (s.hasErrors())
        lChecked.error("We have a problem: ", s);  // shows whole status, inc. the warning
    return `
demo: INFO: demo.mjs:37: we're doing fine
demo: ERROR: demo.mjs:43: We have a problem: ERROR: demo.mjs:39: unable to find boot sector; WARN: demo.mjs:40: backup all data now
`;
}

// Intermediate usage - different verbosity levels

/** Illustrates ensuring that verbose is explicitly set, if used */
export function doCheckVerbose(l) {
    let l1 = new AppLogger('here we set verbosity', 0 /* verbosity */);
    l1.v1("won't print (verbose=0), but also won't throw an error, because verbosity explicitly set");
    let l2 = new AppLogger('here we did not set verbosity');
    try {
        l2.v1("won't print (verbosity not set); will throw an error");
    } catch (err) {
        l.err(err.toString());
    }
    return 'demo: ERROR: demo.js:38: Error: verbosity not set on logger \'here we did not set verbosity\'';
}

/** Illustrates how to change verbosity of logger */
export function doShowVerbose(l) {
    // helper function
    let v2 = new Options({"level": 2});
    function showVerbosity(l) {
        l.ifverbose("ok, we're verbose!");
        l.ifverbose("very verbose!", v2);          // checks verbosity >=2 before writing log
        if (l.verbose > 2)                         // manual check, verbosity >=3 before writing
            l.warn("we're too darned verbose!");
    }
    
    let l1 = new AppLogger('demo', 2 /* verbose */);  // can set verbosity in the constructor
    l1.diagStream = l.diagStream;
    showVerbosity(l1);
    l1.v1("a verbose message");
    l1.v2("a very verbose message");
    l1.v3("a very, very verbose message");
    l1.verbose = 1;                                   // property way to set
    showVerbosity(l1);
    l1.setVerbose(0);                                 // or set with setter
    showVerbosity(l1);
    return `
demo: V1: demo.mjs:68: ok, we're verbose!
demo: V2: demo.mjs:69: very verbose!
demo: V1: demo.mjs:77: a verbose message
demo: V2: demo.mjs:78: a very verbose message
demo: V1: demo.mjs:68: ok, we're verbose!
`;
}

// Intermediate usage - debug and tag / filter the messages

export function doShowDebug(l) {
    
    let mathTag = new Options({"tag": "math"});
    let spellingTag = new Options({"tag": 'spelling'});
    function showDebugLevel(l) {
        l.ifdebug("we're debuggin!");                          // only shows if debug set to true or '*'
        l.ifdebug(5, " =? ", 2 + 3, mathTag);                  // only shows if debug includes '*' or 'math'
        l.ifdebug("spelling is a breeze", spellingTag);        // only shows if debug includes '*' or 'spelling'
    }
    
    let l1 = new AppLogger('second-logger', 0 /* verbose */, true /* debug */);  // can set in the constructor
    l1.diagStream = l.diagStream;                              // echo all data onto stream for logger, l
    showDebugLevel(l1);
    l1.setDebug(false);                                        // equivalent way to set
    showDebugLevel(l1);
    l1.setDebug('math');                                       // can set to debug by tagname, but then we filter
    showDebugLevel(l1);
    l1.setDebug(['math', 'art']);                              // or multiple tags
    showDebugLevel(l1);
    return `
second-logger: DEBUG: demo.mjs:100: we're debuggin!
second-logger: DEBUG[math]: demo.mjs:101: 5 =? 5
second-logger: DEBUG[spelling]: demo.mjs:102: spelling is a breeze
second-logger: INFO: demo.mjs:110: math debugging enabled
second-logger: DEBUG[math]: demo.mjs:101: 5 =? 5
second-logger: INFO: demo.mjs:112: math debugging enabled
second-logger: INFO: demo.mjs:112: art debugging enabled
second-logger: DEBUG[math]: demo.mjs:103: 5 =? 5
`;
}

// Intermediate usage - writing log messages as strings

/** getting log string instead of actually logging to the current diagnostics stream, e.g. stderr */
export function doLogToString(l) {
    let forLater = 'sleep this: ' + l.warn("I want to capture this log message for later", new Options({"asString": true}));
    l.info("Earlier I saw this message: ", forLater);
    return `
demo: INFO: demo.mjs:134: Earlier I saw this message: sleep this: demo: WARN: demo.mjs:133: I want to capture this log message for later
`;
}

// Intermediate usage - more ways to use AppStatus

/** is status ok? */
export function doAppStatusAsBool(l) {
    function checkOk(s) {
        if (s.ok()) l.info('we\'re ok');
        else l.info('not ok: ', s.errorMsg());
    }
    let s = new AppStatus();
    checkOk(s);
    s.addWarn("something fishy");
    checkOk(s);
    s.addError('fish is rotten');
    checkOk(s);
    return `
demo: INFO: demo.mjs:142: we're ok
demo: INFO: demo.mjs:144: we're ok
demo: INFO: demo.mjs:146: not ok: ERROR: demo.mjs:145: fish is rotten
`;
}

/** dumping the status object
 *  shows all info, warnings, errors, and everything else in the status object
 */
export function doAppStatusDump(l) {
    l.info(new AppStatus());
    return `
demo: INFO: demo.mjs:160: ok
`;
}

/** adding/removing info/warnings/errors to the status */
export function doAddDiagnosticsToStatus(l) {
    let s = new AppStatus();
    s.addInfo("threshold 1 was not met");
    s.addInfo("threshold 2 was not met");
    if (s.hasInfo()) {
        l.info(s.infoMsg());
        s.clearInfo();                    // way to clear diagnostics 
    }
    s.addWarn("I think the wheels fell off");
    if (s.hasWarnings()) {
        l.warn(s.warnMsg());
        for (let warn of s.warnings)      // it's a list we can iterate
            if (warn.includes("the wheels fell off"))
                s.addError(warn);         // will record this line number and line number of warning
        s.warnings = [];                  // We can also assign directly to the list, e.g. to clear
    }
    if (s.hasErrors())
        l.error(s.errorMsg());            // N.B. l.error(s) would be the same
    return `
demo: INFO: demo.mjs:175: INFO: demo.mjs:172: threshold 1 was not met; demo.mjs:173: threshold 2 was not met
demo: WARN: demo.mjs:180: WARN: demo.mjs:178: I think the wheels fell off
demo: ERROR: demo.mjs:186: ERROR: demo.mjs:182: demo.mjs:177: I think the wheels fell off
`
}

/** adding additional values to the status object */
export function doAddAdditionalValuesToStatus(l) {
    let s = new AppStatus();
    s.myOtherValue = "bar";   // I can use any property name here
    s.myFooValue = "foo";
    l.info("my status also has value ", s.myOtherValue);
    
    // getExtraAttrs() returns a Map with all the custom values as kv pairs (does not include s.getValue())
    l.info("custom value: ", s.getExtraAttrs()["myOtherValue"]);
    return `
demo: INFO: demo.mjs:207: my status also has value bar
demo: INFO: demo.mjs:210: custom value: bar
`;
}

export function doDedupMessages(l) {
    let s = new AppStatus()
    // deduping messages to remove clutter
    for (let i of [1, 2])
        s.addInfo("threshold 1 was not met");
    s.dedupInfo();  // two messages about threshold 1 on same line become a single message with (x2) indicator
    l.info(s.infoMsg());
    return `
demo: INFO: demo.mjs:227: INFO: demo.mjs:225: threshold 1 was not met (x2)
`;
}

/** the "last_error" added to the status */
export function doCheckLastError(l) {
    let s = new AppStatus("1. bad stuff happened");  // last_error = "1. bad stuff ..."
    s.addError("2. the driver bailed");              // last_error  = "2. the driver ..."
    let currentStatus = new AppStatus("3. the wheels fell off the bus");
    s.addStatus(currentStatus);                      // last_error = "3. the wheels ..."
    if (s.lastError.includes("the wheels fell off"))
        l.info("at the end of the day, the wheels fell off");
    else
        l.error("unexpected sequence of events; last error was: ", s.lastError);
    return `
demo: INFO: demo.mjs:236: at the end of the day, the wheels fell off
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

/** write a diagnostic at INFO level showing how the program has been called
 I like to put this at the start of every program, so I can easily tell what log level the program ran at  */
export function doAnnounceMyself(l) {
    l.announceMyself();  // can also be called with asString=True parameter if you don't want to log immediately
    return `
demo: INFO: demo.mjs:296: called as: node mocha
`;
}
```

## Changelog

1.4.0: Added AppStatus

## For Maintainers

### to publish new version of apperror_js

1. Update version in package.json, using semantic versioning
2. Re-paste demo code above (if changed)
3. Update Changelog section above
4. git commit -a; git push
5. npm login (if needed)
6. npm publish