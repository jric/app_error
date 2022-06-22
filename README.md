# app_error

The purpose of this module is to make logging and reporting of errors easier, more informative, and more consistent.

This is the javascript version of https://github.com/CheggEng/apperror, but not as feature-rich at this point.

AppLogger logs messages to include

* The name of the system generating the message (helpful in pipelines)
* The file name and line number where the log is written (helpful for quickly finding the relevant code)
* The log level of the message (useful for quick identification and filtering)
* The actual message

AppLogger allows you to specify the actual message as a list instead of a string, which makes it efficient enough that you typically don't have to check the log level, and you can just call the log function blindly. Example:

```
l = new AppLogger('demo');
l.debug("This call won't build a big string from my list of numbers, ", [0, 1, 2, 3], " or serialize ",
        my_complex_object, " unless debugging is turned on, so I can feel free to make lots of logging statements!");
if (l.isSetDebug())
    l.debug("I do want to protect logging inside conditional if I need to log with ", slow_function_call());
```
