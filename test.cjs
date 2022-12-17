var apperror=require("./dist-cjs");
const { AppLogger } = apperror;

l = new AppLogger('test.cjs');

l.info('hello world');