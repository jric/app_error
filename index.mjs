/** This description documents many of the logging functions later in this module. */
let LOG_FUNC_DESCRIPTION = `
optional arguments can contain these keys:
 * extra_frames:  a positive integer indicating how many stack frames to
     go up before reporting the code location of this diagnostic [default: 0]
 * as_string:  set True if you want a string back instead of printing to
    self.diag_stream
`;

/**
 * Represents options to be used with the functions in this module.
 * @param {*} aDict : contains key-value pairs for the options
 */
export function Options(aDict) {
    for (let [key, value] of Object.entries(aDict)) {
        this[key] = value;
    }
    return this;
}

/**
 *
 * @returns the number of contiguous stack frames that are in the module where
  numFramesInThisModule() is called, including and starting from the frame of the function
  call.  filename is as close as we can get to "module" in Javascript, so this is by filename.
 */
import { get } from 'stack-trace';
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
 * Turn anything into a compact ASCII string
 * @param {*} s : object that we want to make into an ascii string
 * @returns the ascii string
 */
 import * as serAny from 'serialize-anything';
function makeASCII(s) {
    if (isString(s))
        return Buffer.from(s, "ascii").toString();
    else if (typeof s === 'number')
        return s.toString();
    else
        return JSON.stringify(JSON.parse(serAny.serialize(s))._SA_Content);
}


/**
 * Add file and lineno info to msg.
 * 
 * Last argument can be an options object.
 * 
 * Options object may contain:
 *   extraFrames:  how many extra frames to go up, when capturing file/lineno
 */
let indexMatcher = new RegExp(/^index\..?js/); // index.js doesn't tell us much about a module
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
 * @param verbose : a number, 1+ turns on extra logging, and 0 for no extra logging, but must be set so we know we
 *    didn't just forget to intitialize it
 * @param debug : higher log level than verbose if true; FUTURE: set to a string or list of strings to turn on named
           diagnostic streams.

 */
import * as process from 'process';
export function AppLogger(component_name, verbose, debug=false) {  
    this.component = makeASCII(component_name);
    this.debugTags = new Set();
    if (typeof debug === 'boolean' && debug)
        this.debugTags.add('*');
    // diagnostic stream -- where to write messages
    this.diagStream = process.stderr;
    // may need something with acquire() and release() to keep output from
    //   garbling; omit this for now
    // this.lock = undefined
    this.verbose = verbose;

    this.LOG_FUNC_DESCRIPTION = LOG_FUNC_DESCRIPTION;

    /** for folks who prefer the Java bean style setter
     * @param {*} val : should be a number, typically between 0-3; 0 is mute, 3 is very verbose
    */
    this.setVerbose = function(val) {
        this.verbose = val;
    }

    /**
     * Turns on debugging, which is similar to verbose, but a different channel of logs.
     * This channel can have sub-channels which are named, so you can turn on debugging for a
     *   certain module or class of functions as desired.
     * 
     * @param {*} tagsOrBool : default true; if true, turns on all debug-level logs; if a list of
     *   strings, turns on corresponding debug channels.
     */
    this.setDebug = function(tagsOrBool=true) {
        if (tagsOrBool === true)
            tagsOrBool = ['*'];
        else if (tagsOrBool === false) {
            this.debugTags.clear();
            tagsOrBool = []
        } else if (isinstance(tagsOrBool, str))
            tagsOrBool = [tagsOrBool];
        try {
            for (let tag of tags_or_bool) {
                this.debugTags.add(tag);
                this.info(tag + " debugging enabled",
                        extra_frames=numFramesInThisModule())
            }
        } catch (e) {
            throw new TypeError("Invalid type of argument for setDebug(): " + typeof tags_or_bool + ": " + e.toString());
        }
    }

    /**
     * Returns true if debugging is on
     * 
     * @param {*} tag : check only for the given tag
     */
    this.isSetDebug = function(tag=null) {
        if (tag !== null)
            return tag in this.debugTags;
        return !this.debugTags.isEmpty();
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
    this.commonOut = function(lvl, msg, ...moreMsg) {
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
     * Only if debugging is set, log the given message.
     * 
     * Can be called like
     *   ifdebug(msg)
     * or with any or all log options:
     *   ifdebug(msg, new Options({"tag": "mytag",  // select only certain tagged messages
     *                             "extraFrames": 1,
     *                             "asString": true}))
     */
    this.ifdebug = function(msg, ...moreMsg) {
        let options = getOptions(moreMsg);
        let tag = '*';
        if ('tag' in options) { 
            tag = options.tag;
            if (! isString(tag)) {
                throw new Error("Tag must be a string, but is ", typeof tag, "; tag: ", makeASCII(tag));
            }
        }
        if (tag in this.debugTags) {
            options.extraFrames = 1;
            let tagAdorn = '';
            if (tag !== '*')
                tagAdorn = '[' + tag + ']';
            this.commonOut('DEBUG', tag_adorn, ':', ...moreMsg, options);
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
    this.v1 = function(msg, ...moreMsg) {
        if (this.verbose)
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
    this.v2 = function(msg, ...moreMsg) {
        if (this.verbose >= 2)
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
     this.v3 = function(msg, ...moreMsg) {
        if (this.verbose >= 3)
            this.commonOut('V3', msg, ...moreMsg);
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
    this.debug = function(msg, ...moreMsg) {
        return this.commonOut('DEBUG', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
    this.info = function(msg, ...moreMsg) {
        return this.commonOut('INFO', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
     this.warn = function(msg, ...moreMsg) {
        return this.commonOut('WARN', msg, ...moreMsg);
    }

    /**
     * Final argument can be options object with these keys:
     * extraFrames:  a positive integer indicating how many stack frames to
     *   go up before reporting the code location of this diagnostic [default: 0]
     * asString:  set true if you want a string back instead of printing to
     *   this.diagStream
     * */
    this.error = this.err = function(msg, ...moreMsg) {
        return this.commonOut('ERROR', msg, ...moreMsg);
    }

    return this;
}