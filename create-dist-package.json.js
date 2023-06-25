const fs = require('fs');
const path = require('path');

const pkg = process.argv[2];

if (!pkg) {
    throw new Error("es6 or cjs must be specified");
}

const fileToCreate = './dist-' + pkg;
const module_type = pkg == 'es6' ? 'module' : 'commonjs';

fs.writeFile(path.resolve(fileToCreate, 'package.json'), `{
    "type": "${module_type}"
}
`, err => {
  if (err) {
    console.error(err)
    return
  }
  //file written successfully
  console.log("File written successfully");
})