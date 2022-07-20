import { AppError, AppLogger, AppStatus, makeASCII, Options } from './index.mjs';

// Basic usage - logger

export var moduleLogger = new AppLogger('demo', {verbose: 0});

// ------------ Copy below this line into README ---------------------
/**
 * Basic usage of the logger
 * @param {AppLogger} l - an instance to log onto
 * @returns what will be logged to diagnostic stream set on logger
 */
export function doBasicLogging(l) {
    l.error("I owe: $", 300 + 100, " dollars to my ex");
    l.warn("I don't have enough money in the bank:  $", 0);
    l.info("wise to pay your debts!");
    l.debug("i probably shouldn't borrow from her");
    l.verbose = 2;
    l.v1("I borrowed $400");
    l.v2("First it was $300");
    l.v2("Then it was another $100");
    l.v3("(It was to pay the rent)");
    return `
demo: ERROR: demo.js:38: I owe: $400 dollars to my ex
demo: WARN: demo.js:39: I don't have enough money in the bank:  $0
demo: INFO: demo.js:40: wise to pay your debts!
demo: DEBUG: demo.js:41: i probably shouldn't borrow from her
demo: V1: demo.js:43: I borrowed $400
demo: V2: demo.js:44: First it was $300
demo: V2: demo.js:45: Then it was another $100
`;
}

// Basic usage - using a status object

/** 
 * Illustrates using the AppStatus object
 * @param {AppLogger} l - an instance to log into
 */
export function doBasicStatus(l) {
    let s = new AppStatus();
    if (s.ok) l.info("we're doing fine");
    
    s = new AppStatus("unable to find boot sector");
    s.addWarn("backup all data now");
    if (s.hasErrors()) // show whole status, inc. the warning
        l.error("We have a problem: ", s);
    return `
demo: INFO: demo.mjs:37: we're doing fine
demo: ERROR: demo.mjs:43: We have a problem: ERROR: demo.mjs:39: unable to find boot sector; WARN: demo.mjs:40: backup all data now
`;
}

// Intermediate usage - different verbosity levels

/** Illustrates ensuring that verbose is explicitly set, if used */
export function doCheckVerbose(l) {
    let l1 = new AppLogger('here we set verbosity', {verbose: 0});
    l1.v1("won't print (verbose=0), but also won't throw an error, ",
         "because verbosity explicitly set");
    let l2 = new AppLogger('here we did not set verbosity');
    try {
        l2.v1("will throw an error (verbosity not set)");
    } catch (err) {
        l.err(err.toString());
    }
    return 'demo: ERROR: demo.js:38: Error: verbosity not set on logger \'here we did not set verbosity\'';
}

/** helper function to show effects of verbosity */
function showVerbosity(l) {
    let v2 = new Options({"level": 2});    
    l.ifVerbose("ok, we're verbose!");
    l.ifVerbose("very verbose!", v2);          // checks verbosity >=2 before writing log
    if (l.verbose > 2)                         // manual check, verbosity >=3 before writing
        l.warn("we're too darned verbose!");
}

/** Illustrates how to change verbosity of logger */
export function doShowVerbose(l) {
    // helper function
    let l1 = new AppLogger('demo', {verbose: 2});  // can set verbosity in the constructor
    l1.diagStream = l.diagStream;                  // mirror output to original logger
    showVerbosity(l1);
    l1.v1("a verbose message");
    l1.v2("a very verbose message");
    l1.v3("a very, very verbose message");
    l1.verbose = 1;                                // property way to set
    showVerbosity(l1);
    l1.setVerbose(0);                              // or set with setter
    showVerbosity(l1);
    return `
demo: V1: demo.mjs:68: ok, we're verbose!
demo: V2: demo.mjs:69: very verbose!
demo: V1: demo.mjs:77: a verbose message
demo: V2: demo.mjs:78: a very verbose message
demo: V1: demo.mjs:68: ok, we're verbose!
`;
}

/** turn anything in javascript to a compact string representation */
export function doMakeASCII(l1) {
    l1.info('a string: ', makeASCII('foo'));
    l1.info('a number: ', makeASCII(42));
    l1.info('null: ', makeASCII(null));
    l1.info('undefined: ', makeASCII(undefined));
    l1.info('an array: ', makeASCII(['foo', 42]));
    l1.info('an object: ', {'foo': 42});
    l1.info('a map: ', makeASCII(new Map().set('foo', 42)));
    return `
demo: INFO: demo.mjs:98: a string: foo
demo: INFO: demo.mjs:98: a number: 42
demo: INFO: demo.mjs:98: null: null
demo: INFO: demo.mjs:98: undefined: undefined
demo: INFO: demo.mjs:98: an array: ["foo",42]
demo: INFO: demo.mjs:98: an object: {"foo":42}
demo: INFO: demo.mjs:98: a map: {"foo":42}
`;
}

// Intermediate usage - debug and tag / filter the messages

export function doShowDebug(l) {
    
    let mathTag = new Options({"tag": "math"});
    let spellingTag = new Options({"tag": 'spelling'});
    function showDebugLevel(l) {
        l.ifDebug("we're debuggin!");                          // only shows if debug set to true or '*'
        l.ifDebug(5, " =? ", 2 + 3, mathTag);                  // only shows if debug includes '*' or 'math'
        l.ifDebug("spelling is a breeze", spellingTag);        // only shows if debug includes '*' or 'spelling'
    }
    
    let l1 = new AppLogger('second-logger', {verbose: 0, debug: true});
    l1.diagStream = l.diagStream;                              // echo all data onto stream for logger, l
    showDebugLevel(l1);
    l1.setDebug(false);                                        // can set (or reset)
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

/** adding a return value to status object (e.g. to pass it up the call stack along with the diagnostics) */
export function doAddValueToStatus(l1) {
    let s = new AppStatus("Houston, we have a problem");
    l1.info("status hasValue(): ", s.hasValue()); // no value yet, but ok to check
    s.addValue("foo");
    try {
        l1.info("got value '", s.getValue(), "'");
    } catch (err) {
        l1.warn(err);
        l1.info("status hasValue(): ", s.hasValue()); // ok to see if there is a value; just don't retrieve until handling errors
        s.clearErrors(); // normally, handle errors before clearing them (e.g. log them)
        l1.info("got value '", s.getValue(), "'");  // now, no problem
    }
    return `
demo: INFO: demo.mjs:220: status hasValue(): false
demo: WARN: demo.mjs:225: AppError: ERROR: demo.mjs:223: You must clear errors on status object before accessing value: ERROR: demo.mjs:219: Houston, we have a problem
demo: INFO: demo.mjs:226: status hasValue(): true
demo: INFO: demo.mjs:228: got value 'foo'
`;
}

/** adding additional values to the status object */
export function doAddAdditionalValuesToStatus(l) {
    let s = new AppStatus();
    s.myOtherValue = "bar";   // I can use any property name here
    s.myFooValue = "foo";
    l.info("my status also has value ", s.myOtherValue);
    
    // getExtraAttrs() returns a Map with all the custom values as kv pairs
    l.info("custom value: ", s.getExtraAttrs().get("myOtherValue"));
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

/** converting between status object and exception */
export function doSwitchBetweenStatusAndException(l) {
    let s = new AppStatus("the wheels fell off the bus");
    try {
        // We can turn the status object to an AppError exception
        throw new AppError(s); // same as new AppError(s.toString());
        // Or we can directly create the AppError as easily as an AppStatus object
        throw new AppError("Unexpectedly, we still have ", 4, " wheels");
    } catch (err) {
        // we turn the exception back to a status object, e.g. to combine it with other status objects, etc.
        let currentStatus = err instanceof AppError ? err.toStatus() : null;
        if (currentStatus) {
            currentStatus.addWarn("Now we can do more with the status object");
            l.info(currentStatus);
        } else {
            l.err('Unexpected exception: ', err.message);
        }
    }
    return `
demo: INFO: demo.mjs:268: ERROR: demo.mjs:260: ERROR: demo.mjs:257: the wheels fell off the bus; WARN: demo.mjs:267: Now we can do more with the status object
`;
}

/** Sometimes you want to attach multiple values to an AppStatus, as a return value. 
 * You can find out which extra attributes have been added. */
export function doGetExtraAttributes(l1) {
    // 800-464-4000
    let s = new AppStatus();
    s.addValue(2); // this value is reported as an "extra" attribute
    s.addWarn("haha"); // diagnostics are not: error, warning, info, debug, v1, ...
    s.foo = "bar";
    let e = s.getExtraAttrs();
    l1.info('extra attributes: ', Array.from(e.keys()).sort());
    l1.info('foo: ', e.get('foo'));
    return `
    demo: INFO: demo.mjs:286: extra attributes: ["foo","value"]
    demo: INFO: demo.mjs:287: foo: bar
`;
}

/** merging status objects together
  *   Handy to keep track of the cumulative outcome of multiple, but unrelated function calls
  */
function _getMergedStatusObjects() {
    let s1 = new AppStatus().addInfo("Stuff is going well").addValue(1);
    let s2 = new AppStatus("This time we blew it").addValue(2);
    s2.foo = 'bar';  // extra attribute
    // here we'll combine the info, error, and custom values set on both status objects, but when there are
    //   conflicts, the last status object wins, so value will be 2
    s1.addStatus(s2);
    return s1;
}

export function doMergeStatusObjects(l1) {
    let s1 = _getMergedStatusObjects();
    l1.info(s1);
    return `
    demo: INFO: demo.mjs:196: ERROR: demo.mjs:191: This time we blew it; INFO: demo.mjs:190: Stuff is going well; extra attributes: {"value":2,"foo":"bar"}
`;
}

/**
## Logging all status levels at the appropriate log level
### The logger will create an INFO for each info entry in the status object, a WARN entry for each warn
###  etnry, etc.
 */
export function doLogAllLevels(l) {
    let s1 = _getMergedStatusObjects();
    s1.log(l);
    // we can also prepend a custom message to each of those log lines
    s1.log(l, "This is how it went down");
    return `
demo: ERROR: demo.mjs:284: ERROR: demo.mjs:191: This time we blew it
demo: INFO: demo.mjs:284: INFO: demo.mjs:190: Stuff is going well
demo: ERROR: demo.mjs:286: This is how it went down: ERROR: demo.mjs:191: This time we blew it
demo: INFO: demo.mjs:286: This is how it went down: INFO: demo.mjs:190: Stuff is going well
`;
}

// Advanced usage

/** capture all log messages into a buffer  */
import {PassThrough} from 'node:stream';
export function doCaptureIntoABuffer(l) {
    let buff = new PassThrough();
    let restore = l.diagStream;
    l.diagStream = buff;
    l.info("logging to a buffer now - we have to take care not to log more than the default buffer size before reading the data back");
    l.diagStream = restore;
    l.info("logging normally again; earlier we got: " + buff.read());
    buff.end(); // ends write stream
    buff.destroy(); // ends read stream
    return `
demo: INFO: demo.mjs:305: logging normally again; earlier we got: demo: INFO: demo.mjs:301: logging to a buffer now - we have to take care not to log more than the default buffer size before reading the data back
`;
}

/** easily set log levels from your commandline arguments
  *   -- only works if you're using a "standard" commandline parser like docopt and you define 'debug' or 'verbose'
  *   arguments, which will set 'debug'/'verbose' properties in your object or keys in a dict
  */
 import {docopt} from 'docopt';
 export function doSetFromArgs(l1) {
    let usage = `
Usage: 
  demo [--verbose]... [--debug]
  `;
    let args = docopt(usage, {argv: ['--verbose', '--verbose'], version: 'demo 1.0'});
    l1.setFromArgs(args);
    showVerbosity(l1);  // will show how verbose we are, depending on which arguments were passed to demo
    return `
demo: V1: demo.mjs:78: ok, we're verbose!
demo: V2: demo.mjs:79: very verbose!
`;
}

/** logging a line from higher in the call stack
  * When you have an error handler you don't want to put the file location of the handler in the log.  
  *  Instead, you want to log the location where the error was detected.  All of the logger functions have 
  *  the ability to specify higher stack frames to use when constructing the log message.
  *  See this example:
  */
export function doHideDeepCallStack(l) {
    /** We return the string, instead of logging immediately because of asString parameter */
    function constructStatus(msg) {
        return l.error("I'm deep in the error handler: ", msg, new Options({extraFrames: 2, asString: true}));
    }
    /**
     *  Maybe I want to send diagnostics somewhere other than the standard log file, or do other processing on errors,
     *  so I make an error handler for my message
     */
    function handleError(msg) {
        let deepMsg = constructStatus(msg);  // this is just for illustration
        // AppLogger functions accept the extraFrames parameter
        l.warn("I'm in the error handler: ", deepMsg, new Options({extraFrames: 1}));
    }
    handleError("Root problem is here"); // all logging will cite this same line number
    return `
demo: WARN: demo.mjs:368: I'm in the error handler: demo: ERROR: demo.mjs:368: I'm deep in the error handler: Root problem is here
`;
}

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

// ------------ Copy above this line into README ---------------------

export function doCheckGuardAgainstOldOptionStyle(l) {
    let l1 = new AppLogger('logger1', {verbose: 1, debug: 0}); // make sure no error
    let problem = 'did not fail when calling AppLogger constructor second argument that is not an object';
    try {
        l1 = new AppLogger('logger2', 0 /* verbose */);
    } catch (err) {
        try {
            problem = 'did not fail when calling AppLogger constructor with too many arguments';
            l1 = new AppLogger('logger1', 0 /* verbose */, true /* debug */);
        } catch (err) {
            return '';  // if we are here, everything went as planned
        }
    }
    l.error(problem);
}