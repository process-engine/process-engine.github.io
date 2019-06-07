const shell = require("shelljs");

function sh(command) {
  return shell.exec(command).toString();
}

function run() {
  const repoName = "process-engine/getting-started";
  const gitUrl = `https://github.com/${repoName}.git`;
  const targetPath = "./src/docs/getting-started";

  console.log("Removing getting-started contents");
  sh("mkdir -p src/docs/getting-started");
  sh("mkdir -p tmp");

  console.log(`Cloning getting-started contents from ${gitUrl}`);
  sh(`rm -rf tmp/getting-started`);
  sh(`git clone ${gitUrl} tmp/getting-started`);

  console.log(`Replacing content in ${targetPath}`);
  sh(`rm -rf ${targetPath}`);
  sh(`cp -r tmp/getting-started/docs ${targetPath}`);
}

if (module.parent) {
  module.exports = { run };
} else {
  run();
}
