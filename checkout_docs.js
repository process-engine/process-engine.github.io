const shell = require("shelljs");

function sh(command) {
  return shell.exec(command, { silent: true }).toString();
}

function run() {
  sh("mkdir -p tmp");
  sh(
    "git clone git@github.com:process-engine/getting-started.git tmp/getting-started"
  );
  sh("cp -r tmp/getting-started/docs ./src/docs/getting-started");
}

if (module.parent) {
  module.exports = { run };
} else {
  run();
}
