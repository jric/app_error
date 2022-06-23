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
 * Function used to get options if available
 */
function getOptions(args) {
    if (args && args.length && args[args.length - 1] instanceof Options) {
        return args.pop();
    }
    return null;
}


/**
 * Turn anything into a compact ASCII string
 * @param {*} s : object that we want to make into an ascii string
 * @returns the ascii string
 */
 import * as serAny from 'serialize-anything';
function makeASCII(s) {
    if (typeof s === 'string' || s instanceof String)
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