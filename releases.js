const { writeFileSync } = require("fs");
const fetch = require("node-fetch");

const GITHUB_REPO = "process-engine/bpmn-studio";
const RELEASES_API_URI = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

const LATEST_RELEASES_FILENAME = "./latest_releases.json";

async function fetchAndWriteLatestReleases() {
  const result = await fetch(RELEASES_API_URI);
  const data = await result.text();

  writeFileSync(LATEST_RELEASES_FILENAME, data, "utf-8");
}

function loadLatestReleases() {
  const data = require(LATEST_RELEASES_FILENAME);
  const releases = data.filter(x => !x.prerelease && !x.draft);

  const releaseData = releases.map(release => {
    return {
      name: release.name,
      assets: {
        win: findAsset(release.assets, /.exe$/),
        mac: findAsset(release.assets, /.dmg$/)
      }
    };
  });

  return releaseData;
}

function findAsset(assets, matcher) {
  const asset = assets.find(asset => {
    return asset.name.match(matcher);
  });

  if (asset) {
    return asset.browser_download_url;
  }
}

if (module.parent) {
  module.exports = {
    loadLatestReleases
  };
} else {
  fetchAndWriteLatestReleases();
}
