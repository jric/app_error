/**
 * Represents options to be used with the functions in this module.
 * @param {*} aDict : contains key-value pairs for the options
 */
export class Options {
    constructor (aDict) {
        for (let [key, value] of Object.entries(aDict)) {
            this[key] = value;
        }    
    }
    addFrames(number) {
        this.extraFrames = (this.extraFrames??0) + number;
    }
}

/**
 *
 * @returns the number of contiguous stack frames that are in the module where
  numFramesInThisModule() is called, including and starting from the frame of the function
  call.  filename is as close as we can get to "module" in Javascript, so this is by filename.
 */
//import { get } from 'stack-trace-anynode';
//var get = require('callsite');
//import get from 'callsite';
import * as get from 'callsite';
export function numFramesInThisModule() {
    let frames = get(); // deepest stack frame is first

    /*
    for (let i of Array.from({length: frames.length}, (x, i) => i)) {
        console.log("frame", i, ": ", frames[i].getFileName());
    } */

    if (frames.length < 2) return 0;
    let thisModule = frames[1].getFileName();
    //console.log("module: ", thisModule);
    for (let i of Array.from({length: frames.length - 2}, (x, i) => i))
        if (frames[2 + i].getFileName() != thisModule) return i + 1;
    return frames.length - 1; // don't count this function call
}

/**
 * Function used to get options if available; returns empty Options if not
 */
function getOptions(args) {
    if (args && args.length && args[args.length - 1] instanceof Options) {
        return args.pop();
    }
    return new Options({});
}

/**
 * @param {*} data 
 * @returns true iff the data is a string.
 */
function isString(data) {
    return typeof data === 'string' || data instanceof String;
}

/**
 * Recursively remove _SA variables, since they are only needed for deserializing, and add clutter for logging
 * @param {*} obj - is edited in place
 * @returns the edited object
 */
const matchSAPrivate = /^_SA/;
function removeSAPrivate(obj) {
    if (! obj instanceof Object) return obj;
    for (const prop of Object.getOwnPropertyNames(obj)) {
        if (matchSAPrivate.test(prop))
            delete obj[prop];
        else if (obj[prop] instanceof Object)
            obj[prop] = removeSAPrivate(obj[prop]);
    }
    return obj;
}

/**
 * Turn anything into a compact ASCII string
 * @param {*} s : object that we want to make into an ascii string
 * @param canonical : if true, strings are encoded as JSON (inside double-quotes)
 * @returns the ascii string
 */
 import * as serAny from 'serialize-anything';
 var firstTwoLines = new RegExp(/([^\n]*\n?){0,2}/m);
export function makeASCII(s, canonical) {
    if (isString(s))
        if (canonical)
            return '"' + Buffer.from(s, "ascii").toString() + '"';
        else
            return Buffer.from(s, "ascii").toString();
    else if (s === null)
        return 'null';
    else if (s === undefined)
        return 'undefined'
    else if (typeof s == 'number')
        return s.toString();
    else if (s instanceof Map)
        return '{' + Array.from(s.entries()).map((x) => makeASCII(x[0], true /* canonical */) + ':' + makeASCII(x[1], true /* canonical */)).join(',') + '}';
    else if (typeof s == 'object') {
        if (s.stack !== undefined && !(s instanceof AppStatus) && !(s instanceof AppError)) return firstTwoLines.exec(s.stack)[0];
        if (!Array.isArray(s) && s.toString !== Object.prototype.toString && typeof s.toString == 'function') {
            return s.toString();
        }
        return JSON.stringify(removeSAPrivate(JSON.parse(serAny.serialize(s))._SA_Content));
    } else {
        return JSON.stringify(removeSAPrivate(JSON.parse(serAny.serialize(s))._SA_Content));
    }
}


/**
 * Add file and lineno info to msg.
 * 
 * Last argument can be an options object.
 * 
 * Options object may contain:
 *   extraFrames:  how many extra frames to go up, when capturing file/lineno
 */
var indexMatcher = new RegExp(/^index\..?js/); // index.js doesn't tell us much about a module
export function adorn(msg, ...moreMsg) {
    let options = getOptions(moreMsg);
    let extraFrames = options?.extraFrames ?? 0; // by default, we use calling stack frame
    let frames = get();
    let callingFrameNum = 1 + extraFrames < frames.length ? 1 + extraFrames : frames.length - 1;
    let callingFrame = frames[callingFrameNum];
    let lineNo = callingFrame.getLineNumber();
    let callFile = callingFrame.getFileName();

    let filePath = callFile.split('/');
    callFile = filePath[filePath.length - 1].match(indexMatcher) ? filePath[filePath.length - 2] : filePath[filePath.length - 1];

    let pmsg = [msg, ...moreMsg].map(x => makeASCII(x));
    return callFile + ':' + lineNo + ': ' + pmsg.join('');
}

/**
 * Encapsulates some convenience functions for error-logging
 * 
 * @param component_name : prepended to all logs from this logger, so you know what system generated the noise
 * @param options :
 *     verbose : a number, 1+ turns on extra logging, and 0 for no extra logging; if using verbosity-based logging,
 *         this must be set or logging functions will throw error to remind you to set it
 *     debug : set to a string or list of strings to turn on named diagnostic streams or set to '*' or true to
 *         turn on all named log streams

 */
import * as process from 'process';
export class AppLogger {
    constructor(componentName, options) {
        if (options !== undefined && ! (options instanceof Object))
            throw new AppError("options must be an object, but was ", typeof options);
        if (arguments.length > 2)
            throw new AppError("only two arguments accepted by AppLogger constructor");
        this.component = makeASCII(componentName);
        this.debugTags = new Set();
        let debug = options?.debug??false;
        let verbose = options?.verbose??process.env.VERBOSE; // defaults to undefined
        if (typeof debug == 'boolean' && debug)
            this.debugTags.add('*');
        // diagnostic stream -- where to write messages
        this.diagStream = process.stderr;
        // may need something with acquire() and release() to keep output from
        //   garbling; omit this for now
        // this.lock = undefined
        this.verbose = verbose;
    }

    /** for folks who prefer the Java bean style setter
     * @param {*} val : should be a number, typically between 0-3; 0 is mute, 3 is very verbose
    */
        setVerbose(val) {
        this.verbose = val;
    }

    /** getVerbose() checks to make sure verbosity level has been set, else throws an error
     * @returns verbosity level
    */
    getVerbose() {
        if (this.verbose===undefined) throw new Error("verbosity not set on logger '" + this.component + "'");
        return this.verbose;
    }

    /**
     * Turns on debugging, which is similar to verbose, but a different channel of logs.
     * This channel can have sub-channels which are named, so you can turn on debugging for a
     *   certain module or class of functions as desired.
     * 
     * @param {*} tagsOrBool : default true; if true, turns on all debug-level logs; if a list of
     *   strings, turns on corresponding debug channels.
     */
    setDebug(tagsOrBool=true) {
        if (tagsOrBool === true)
            tagsOrBool = ['*'];
        else if (tagsOrBool === false) {
            this.debugTags.clear();
            tagsOrBool = [];
        } else if (isString(tagsOrBool))
            tagsOrBool = [tagsOrBool];
        try {
            for (let tag of tagsOrBool) {
                this.debugTags.add(tag);
                this.info(tag + " debugging enabled",
                        new Options({"extraFrames": numFramesInThisModule()}));
            }
        } catch (e) {
            throw new TypeError("Invalid type of argument for setDebug(): " + typeof tagsOrBool + ": " + e.toString());
        }
    }

    /**
     * Returns true if debugging is on
     * 
     * @param {*} tag : check only for the given tag
     */
    isSetDebug(tag=null) {
        if (tag !== null)
            return tag in this.debugTags;
        return !this.debugTags.isEmpty();
    }

    /**
     * Set the verbose and debug levels from an object which should either be
     * - a dictionary with keys '--verbose' and '--debug', or
     * - an object with attributes 'verbose' and 'debug'
     * Value of debug can be a comma-seperated list of channel names to enable debugging for,
     *   or they can be passed as separate options
    */
    setFromArgs(args) {
        let verbose = args['verbose'] ?? args['--verbose'] ?? (typeof args.get == 'function' ? args.get('--verbose') : 0);
        this.verbose = (typeof verbose == 'object' ? verbose.length : verbose) ?? verbose | 0; // convert to number
    
        let debug = args['debug'] ?? args['--debug'] ?? (typeof args.get == 'function' ? args.get('--debug') : false);
        
        let debugTags = [];

        try {
            for (let tag of debug)
                debugTags.push(...tag.split(','));
        } catch {
            // debug option that is not iterable treated as true/false instead
            if (debug) debugTags.push('*');
        }

        this.setDebug(debugTags);
    }

    /**
     * Used to write diagnostic message at given log level.
     * 
     * @param {*} lvl - any string to indicate log level, e.g. 'INFO', 'WARN', 'ERROR', 'DEBUG', 'V1", etc.
     * @param {*} msg - first component of a message to write
     * @param  {...any} moreMsg - more components of the message; the last item may be an options object with
     *    fields:
     *       * extraFrames:  a positive integer indicating how many stack frames to
     *           go up before reporting the code location of this diagnostic [default: 0]
     *       * asString:  set true if you want a string back instead of printing to
     *           this.diagStream
     * @returns the diagnostic string if 'asString' set, else the AppLogger
     */
    commonOut(lvl, msg, ...moreMsg) {
        let options = getOptions(moreMsg);
        let extraFrames = (options?.extraFrames ?? 0) + 2 /* get above commonOut() and error()/warn()/etc */;
        let asString = options?.asString ?? false;
        let formatted = this.component + ": " + lvl + ": " +
            adorn(msg, ...moreMsg, new Options({"extraFrames": extraFrames}));
        if (asString)
            return formatted;
        else {
            /* if self.lock is not None:
                self.lock.acquire() */
            this.diagStream.write(formatted + "\n");
            /*
            if self.lock is not None:
                self.lock.release() */
        }
    }

    /**
     * announceMyself() Writes diagnostic indicating arguments used to execute current program.
     * @param {*} asString [default false] indicates whether to return a string, or write INFO level log message
     * @returns 
     */
    announceMyself(asString=false) {
        return this.info("called as: ", process.argv.join(' '),
                    new Options({"extraFrames": 1, "asString": asString}));
    }


    /**
     * Only if debugging is set, log the given message.
     * 
     * Can be called like
     *   ifDebug(msg)
     * or with any or all log options:
     *   ifDebug(msg, new Options({"tag": "mytag",  // select only certain tagged messages
     *                             "extraFrames": 1,
     *                             "asString": true}))
     */
    ifDebug(msg, ...moreMsg) {
        let options = getOptions(moreMsg);
        let tag = '*';
        if ('tag' in options) { 
            tag = options.tag;
            if (! isString(tag)) {
                throw new Error("Tag must be a string, but is ", typeof tag, "; tag: ", makeASCII(tag));
            }
        }
        //this.debug('tag: ', tag, '; debugTags: ', this.debugTags);
        if (this.debugTags.has(tag) || this.debugTags.has('*')) {
            //options.extraFrames = 1;
            let tagAdorn = '';
            if (tag != '*')
                tagAdorn = '[' + tag + ']';
            this.commonOut('DEBUG' + tagAdorn, msg, ...moreMsg, options);
        }
    }
    
    /**
     * Logs the given message iff verbose is set to at least level 1
     * @param {*} msg : message to log
     * @param  {...any} moreMsg and Options object which may contain:
     *   extraFrames:  a positive integer indicating how many stack frames to
     *     go up before reporting the code location of this diagnostic [default: 0]
     *   asString [default: false]:  set true if you want a string back instead of 
     *     printing to this.diagStream
     */
    v1(msg, ...moreMsg) {
        if (this.getVerbose() > 0)
            this.commonOut('V1', msg, ...moreMsg);
    }

    /**
     * Logs the given message iff verbose is set to at least level 2
     * @param {*} msg : message to log
     * @param  {...any} moreMsg and Options object which may contain:
     *   extraFrames:  a positive integer indicating how many stack frames to
     *     go up before reporting the code location of this diagnostic [default: 0]
     *   asString [default: false]:  set true if you want a string back instead of 
     *     printing to this.diagStream
     */
    v2(msg, ...moreMsg) {
        if (this.getVerbose() >= 2)
            this.commonOut('V2', msg, ...moreMsg);
    }

    /**
     * Logs the given message iff verbose is set to at least level 3
     * @param {*} msg : message to log
     * @param  {...any} moreMsg last part can be Options object which may contain:
     *   extraFrames:  a positive integer indicating how many stack frames to
     *     go up before reporting the code location of this diagnostic [default: 0]
     *   asString [default: false]:  set true if you want a string back instead of 
     *     printing to this.diagStream
     */
    v3(msg, ...moreMsg) {
        if (this.getVerbose() >= 3)
            this.commonOut('V3', msg, ...moreMsg);
    }

    /**
     * ifVerbose
     * Only log if verbose, or if verbosity higher than given verbosity.
     * @param {*} msg the message to log when verbosity > 0
     * @param  {...any} moreMsg - more message to log, last arg can be Options:
     *   level: only log if verbosity above this level
     *   extraFrames:  a positive integer indicating how many stack frames to
     *     go up before reporting the code location of this diagnostic [default: 0]
     *   asString [default: false]:  set true if you want a string back instead of 
     *     printing to this.diagStream
     */
    ifVerbose(msg, ...moreMsg) {
        let options = getOptions(moreMsg);
        let lvl = options.level ?? 1;
        l.ifDebug("lvl: ", lvl, "; this.verbose: ", this.verbose);
        if (lvl <= this.verbose)
            this.commonOut('V' + lvl, msg, ...moreMsg, options);
    }

    /**
     * This function always writes a message prepended by DEBUG (use ifdebug() for conditional logging)
     * @param {*} msg : message to log
     * @param  {...any} moreMsg last part can be Options object which may contain:
     *   extraFrames:  a positive integer indicating how many stack frames to
     *     go up before reporting the code location of this diagnostic [default: 0]
     *   asString [default: false]:  set true if you want a string back instead of 
     *     printing to this.diagStream
     *   
     */
    debug(msg, ...moreMsg) {
        return this.commonOut('DEBUG', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
    info(msg, ...moreMsg) {
        return this.commonOut('INFO', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
    warn(msg, ...moreMsg) {
        return this.commonOut('WARN', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
    error(msg, ...moreMsg) {
        return this.commonOut('ERROR', msg, ...moreMsg);
    }
    err(msg, ...moreMsg) {
        return this.commonOut('ERROR', msg, ...moreMsg);
    }
}

/** A logger, pre-declared for use throughout this class to enable internal logging
 * - very meta and eating our own dogfood */
 var l = new AppLogger("apperror_js");

/**
 * AppStatus - object represents a status; can add diagnostics and values and retrieve them
 * 
 * Instead of using a logger, which has to write to a stream, you can pass this AppStatus object up and
      down your call stack and deal with the errors, warnings, etc. at a point of your application's
      choosing.
    Functions that return values, also store those values into this object.
 * 
 * @param msg - If provided, an error is created for this status
 * @param moreMsg - Additional things to write into the error message, or the final item in this list
 *   can be an Options object; currently only this one is supported
 *    - extraFrames - an integer number of stack frames that should be skipped when logging the location of a
        diagnostic message
 * 
 * @returns A new AppStatus object (call with new)
 */

export class AppStatus {
    constructor (msg, ...moreMsg) {
        this._info = [];
        this.warnings = [];
        this.errors = [];
        this.lastError = '';
        // let options = getOptions(moreMsg);
        // options.addFrames(1);
        if (msg !== undefined)
            this.addError(msg, ...moreMsg);
        this.value = undefined;
    }

    /**
     * toString()
     * 
     * Provides for printable view of this status object.
     * 
     * Shows errors first, if any, then warnings, if any, then info, if any.
     * 
     * If custom attributes have been set on the object, then those are displayed at the end.
     * 
     */
    toString() {
        let buff = '';
        if (this.hasErrors())
            buff += this.errorMsg();
        if (this.warnings.length) {
            if (buff.length)
                buff += "; ";
            buff += this.warnMsg();
        }
        if (this._info.length) {
            if (buff.length)
                buff += "; ";
            buff += this.infoMsg();
        }
        if (! buff.length)
            buff = 'ok';
        
        let xtraAttrs = this.xtraAttrsToStr();
        if (xtraAttrs.length) {
            buff += '; '
            buff += xtraAttrs;
        } 
        
        return buff;
    }
    
    /**
     * xtraAttrsToStr()
     * 
     * @returns String representation of any extra values (aka attributes) that were set on this status object.
     */
    xtraAttrsToStr() {
        let extraAttrs = this.getExtraAttrs();

        return (extraAttrs.size ? "extra attributes: " + makeASCII(extraAttrs) : '');
    }
    
    /**
     * dedup()
     * 
     * Identifies duplicate messages and dedups them but appends the count, e.g.
     *   No such key found 'foo' (x14)
     * 
     * @param msg - a list of messages, will be de-duplicated
     */    
    dedup(msgs) {
        let counts = new Map();
        for (let msg of msgs)
            if (counts.has(msg))
                counts.set(msg, counts.get(msg) + 1);
            else
                counts.set(msg, 1);
        msgs.length = 0;
        for (let [key, val] of counts.entries())
            if (val > 1)
                msgs.push(key + " (x" + val + ')');
            else
                msgs.push(key);
    }
    
    /**
     * Creates the adorned message (adding line number, filename, etc.); starts at the first
     *   stack frame outside this module
     * @param {*} msg - the message to adorn
     * @param  {...any} moreMsg - more message components and/or final argument can be Options:
     *    - extraFrames : number of extra frames to move up, before reporting the code location
     * @returns the adorned message
     */
    #getAdornedMsg(msg, ...moreMsg) {
        let extraFrames=numFramesInThisModule();

        let options = getOptions(moreMsg)?? new Options();
        options.addFrames(extraFrames);
        return adorn(msg, ...moreMsg, options);
    }
    
    /**
     * Adds an INFO-level message to the status object.
     * @param {*} msg - anything to log
     * @param  {...any} moreMsg; more to log and/or last item can be Options:
     *   - extraFrames: extra frames to move up before capturing the code location of the message
     * @returns the status object itself (for chaining)
     */
    addInfo(msg, ...moreMsg) {
        let adornedMsg = this.#getAdornedMsg(msg, ...moreMsg);
        l.ifDebug("adorned message: ", adornedMsg);
        this._info.push(adornedMsg);
        return this;
    }

    /**
     * Adds a WARN-level message to the status object.
     * @param {*} msg - anything to log
     * @param  {...any} moreMsg  - more to log and/or last item can be Options:
     *   - extraFrames: extra frames to move up before capturing the code location of the message
     * @returns the status object itself (for chaining)
     */
    addWarning(msg, ...moreMsg) {
        let adornedMsg = this.#getAdornedMsg(msg, ...moreMsg);
        this.warnings.push(adornedMsg);
        return this;
    }
    
    /**
     * Adds a WARN-level message to the status object.  (Alias for addWarning().)
     * @param {*} msg - anything to log
     * @param  {...any} moreMsg  - more to log and/or last item can be Options:
     *   - extraFrames: extra frames to move up before capturing the code location of the message
     * @returns the status object itself (for chaining)
     */
    addWarn(msg, ...moreMsg) {
        return this.addWarning(msg, ...moreMsg);
    }

    /**
     * Adds a ERROR-level message to the status object.
     * @param {*} msg - anything to log
     * @param  {...any} moreMsg  - more to log and/or last item can be Options:
     *   - extraFrames: extra frames to move up before capturing the code location of the message
     * @returns the status object itself (for chaining)
     */
     addError(msg, ...moreMsg) {
        let adornedMsg = this.#getAdornedMsg(msg, ...moreMsg);
        this.errors.push(adornedMsg);
        this.lastError = adornedMsg;
        return this;
    }

    /**
     * Combines the diagnostics from another status object to this object.
     * @param {*} other - another status object
     * @returns - this status object (for chaining)
     */
    addStatus(other) {
        if (! other instanceof AppStatus)
            throw new Error("addStatus() is for merging in another AppStatus object; object type is " + typeof other);
        this.errors.push(...other.errors);
        if (other.lastError)
            this.lastError = other.lastError;
        this.warnings.push(...other.warnings);
        this._info.push(...other._info);
        if (other.value !== undefined)
            this.value = other.value;
        for (let [key, val] of other.getExtraAttrs().entries())
            this[key] = val;
        
        return this;
    }
    
    /**
     * Sets a return value on the status object.
     * @param {*} val - the value to set
     * @returns the status object (for chaining)
     */
    addValue(val) {
        this.value = val;
        
        return this;
    }
    
    /**
     * Alias for !hasErrors()
     * @returns true iff status has no errors, else false
     */
    ok() {
        return ! this.hasErrors();
    }
    
    /**
     * Does this status object have errors attached to it?
     * @returns true iff status has errors, else false
     */
    hasErrors() {
        return this.errors.length > 0;
    }
    
    /**
     * Removes errors from the status object.
     * 
     * @returns this status object (for chaining)
     */
    clearErrors() {
        this.errors = [];

        return this;
    }
    
    /**
     * Does this status object have warnings attached to it?
     * @returns true iff status has warnings, else false
     */
    hasWarnings() {
        return this.warnings.length > 0;
    }
    
    /**
     * Removes warnings from the status object.
     * 
     * @returns this status object (for chaining)
     */
    clearWarnings() {
        this.warnings = [];
    }
    
    /**
     * Does this status object have info attached to it?
     * @returns true iff status has info, else false
     */
    hasInfo() {
        return this._info.length > 0;
    }

    /**
     * Removes info from the status object.
     * 
     * @returns this status object (for chaining)
     */
    clearInfo() {
        this._info = [];
        return this;
    }

    /**
     * Deduplicates info messages (see dedup())
     */
    dedupInfo() {
        this.dedup(this._info);
    }

    /** log()
     * spit out any diagnostics to the logger at the corresponding log levels
     * @param msg - optional message / Options
     */
    log(logger, ...msg) {
        let prepend = '';
        let options = getOptions(msg)?? new Options();
        options.addFrames(1);
        if (msg.length)
            prepend = msg.map(x => makeASCII(x)) + ": ";
        if (this.hasErrors())
            logger.error(prepend, this.errMsg(), options);
        if (this.hasWarnings())
            logger.warn(prepend, this.warnMsg(), options);
        if (this.hasInfo())
            logger.info(prepend, this.infoMsg(), options);
    }

    /**
     * infoMsg
     * @returns all INFO level messages in the status object as a single string
     */
    infoMsg() {
        return this._info.length ? 'INFO: ' + this._info.join('; ') : '';
    }

    /**
     * warnMsg
     * @returns all WARN level messages in the status object as a single string
     */
    warnMsg() {
        return this.warnings.length ? 'WARN: ' + this.warnings.join('; ') : '';
    }

    /**
     * errorMsg
     * @returns all ERROR level messages in the status object as a single string
     */
    errorMsg() {
        return this.errors.length ? 'ERROR: ' + this.errors.join('; ') : '';
    }

    /**
     * errMsg - alias for errorMsg()
     * @returns all ERROR level messages in the status object as a single string
     */
    errMsg() { return this.errorMsg(); }

    /**
     * getInfo
     * @returns list of INFO level messages attached to this status object
     */
    getInfo() { return this._info; }

    /**
     * @returns value assigned to this status object; clear errors before getting value
     */
    getValue() {
        if (this.hasErrors())
            throw new AppError("You must clear errors on status object before accessing value: ", this.errMsg());
        return this.value;
    }

    /**
     * @returns true iff the status has a value set
     */
    hasValue() {
        return this.value === undefined ? false : true;
    }

    /**
     * getExtraAttrs
     * @returns a Map of the extra attributes (aka values) assigned to this status object - including
     *  any value from setValue()
     */
    getExtraAttrs() {
        let xtraAttrs = new Map();
        for (let key of Object.getOwnPropertyNames(this)) {
            if (!key.length || key[0] == '_') continue;
            if (['_info', 'warnings', 'errors', 'lastError'].includes(key)) continue;
            if (key == 'value' && this[key] === undefined) continue;
            xtraAttrs.set(key, this[key]);
        }

        return xtraAttrs;
    }
}

/** A javascript Error object that is created just like an AppStatus object and can be used as such with the toStatus() member.
    @see AppStatus for more information on parameters and behavior */
export class AppError extends Error {
    /** @see AppStatus init for more information on parameters and behavior */
    constructor (msg, ...moreMsg) {
        let status = new AppStatus(msg, ...moreMsg);
        super(status.toString());
        this.status = status;
        this.name = "AppError";
    }
        
    toStatus() {
        return this.status;
    }
}