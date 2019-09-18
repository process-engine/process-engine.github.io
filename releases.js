const { writeFileSync } = require("fs");
const fetch = require("node-fetch");

const GITHUB_REPO = "process-engine/bpmn-studio";
const RELEASES_API_URI = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=50`;

const LATEST_RELEASES_FILENAME = "./latest_releases.json";
const MIN_COUNT_STABLE_RELEASES = 5;
const MIN_COUNT_BETA_RELEASES = 5;

async function fetchAndWriteLatestReleases() {
  const releases = [];

  let stableReleaseCount = 0;
  let betaReleaseCount = 0;

  let pageIndex = 1;

  while (
    stableReleaseCount < MIN_COUNT_STABLE_RELEASES ||
    betaReleaseCount < MIN_COUNT_BETA_RELEASES
  ) {
    const nextReleases = await fetchLatestReleases(pageIndex);
    releases.push(...nextReleases);

    stableReleaseCount = getAmountOfStableReleases(releases);
    betaReleaseCount = getAmountOfBetaReleases(releases);

    pageIndex++;
  }

  writeFileSync(LATEST_RELEASES_FILENAME, JSON.stringify(releases), "utf-8");
}

async function fetchLatestReleases(page) {
  const pageIndex = page !== undefined && page > 0 ? page : 1;

  const result = await fetch(`${RELEASES_API_URI}&page=${pageIndex}`);
  const data = await result.text();

  return JSON.parse(data);
}

function getAmountOfStableReleases(releases) {
  return releases.filter(release => {
    if (release.draft || release.name === null) {
      return false;
    }

    return !release.name.includes("-");
  }).length;
}

function getAmountOfBetaReleases(releases) {
  return releases.filter(release => {
    if (release.draft || release.name === null) {
      return false;
    }

    return release.name.includes("-beta.");
  }).length;
}

function loadLatestReleases() {
  const data = require(LATEST_RELEASES_FILENAME);
  const releases = data.filter(
    x => !x.draft && x.name !== null && !x.name.includes("-pre")
  );

  const releaseData = releases.map(release => {
    const name = release.name.replace(/^Release v/, "");

    return {
      name: name,
      releaseChannel: getReleaseChannelByName(release.name),
      assets: {
        win: findAsset(release.assets, /.exe$/),
        mac: findAsset(release.assets, /.dmg$/)
      },
      publishedAt: release.published_at
    };
  });

  return releaseData;
}

function getReleaseChannelByName(releaseName) {
  if (releaseName.includes("beta")) {
    return "beta";
  } else if (releaseName.includes("alpha")) {
    return "alpha";
  } else {
    return "stable";
  }
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
