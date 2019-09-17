var process = require("process");
var highlightjs = require("highlight.js");

var Metalsmith = require("metalsmith");
var markdown = require("metalsmith-markdown");
var layouts = require("metalsmith-layouts");
var inplace = require("metalsmith-in-place");
var permalinks = require("metalsmith-permalinks");
var collections = require("metalsmith-collections");
var sass = require("metalsmith-sass");

//
// Markdown
//

var marked = require("marked");
var renderer = new marked.Renderer();
var oldImage = renderer.image;

// replaces relative image urls with %%%<IMAGE_URL>%%%
// for later processing
renderer.image = function(href, title, text) {
  var string = "<img";

  if (href) {
    if (href.match(/^[^\/]/)) {
      href = "%%%" + href + "%%%";
    }

    string = string + ' src="' + href + '"';
  }
  if (title) {
    string = string + ' title="' + title + '"';
  }
  if (text) {
    string = string + ' alt="' + text + '"';
  }

  string = string + ">";

  return string;
};

//
// Template Helpers
//

var Handlebars = require("handlebars");
var authors = require("./authors.json");

Handlebars.registerHelper("formatAuthors", function(author_keys) {
  var author_names = author_keys.map(function(current, index, array) {
    var author = authors[current];
    return (
      '<span class="nowrap">' +
      author.full_name +
      " (@" +
      author.github +
      ")</span>"
    );
  });
  return author_names.join(" und ");
});
Handlebars.registerHelper("formatDate", function(date) {
  var monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return day + ". " + monthNames[monthIndex] + " " + year;
});
Handlebars.registerHelper("formatPath", function(post) {
  return "/" + post.path.replace(/\/index\.md$/, "");
});

Handlebars.registerHelper("json", function(obj) {
  return new Handlebars.SafeString(JSON.stringify(obj));
});
//
// Our own plugins
//

var rereplaceImageUrlsInPost = function() {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(filename) {
      var data = files[filename];

      if (filename.match(/\.(md|html)$/)) {
        var contents = data.contents.toString();
        var regex_pattern = "(%%%)([^%]+)(%%%)";
        var regex = new RegExp(regex_pattern, "g");
        var regex_inner = new RegExp(regex_pattern);
        var base_path = filename.replace("/index.html", "/");

        contents = contents.replace(regex, function(matched_string) {
          var result = matched_string.match(regex_inner);
          var original_image_path = result[2];
          return "/" + base_path + original_image_path;
        });

        data.contents = Buffer.from(contents);

        files[filename] = data;
      }
    });

    done();
  };
};

var parseDatesFromPostPath = function() {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(filename) {
      var data = files[filename];
      var result = filename.match(/(\d\d\d\d-\d\d-\d\d)-.+\.(md|html)$/);

      if (result && !data.date) {
        data.date = new Date(Date.parse(result[1]));
      }

      files[filename] = data;
    });

    done();
  };
};

var setDefaultFrontmatter = function() {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(filename) {
      var data = files[filename];

      data.layout = data.layout || "layout.html";
      data.is_blog_post = !!data.date;

      files[filename] = data;
    });

    done();
  };
};

function addGettingStartedDocs() {
  require("./checkout_docs").run();
}

function getMetaData() {
  const releases = require("./releases");
  const latestStudioReleases = releases.loadLatestReleases();
  const latestStudioRelease = latestStudioReleases.find(release => {
    return release.releaseChannel === "stable";
  });

  const defaultDownloadUrl =
    "https://github.com/process-engine/bpmn-studio/releases/latest";
  const defaultReleaseInfo = {
    name: "",
    assets: {
      win: defaultDownloadUrl,
      mac: defaultDownloadUrl,
      default: defaultDownloadUrl
    }
  };

  return {
    title: "ProcessEngine.io",
    copyright_year: new Date().year,
    latestStudioRelease: latestStudioRelease || defaultReleaseInfo,
    latestStudioReleases: latestStudioReleases
  };
}

//
// Let's build!
//

addGettingStartedDocs();

var app = Metalsmith(__dirname)
  .metadata(getMetaData())
  .source("./src")
  .destination(process.env.BUILD_DIR || "./_site")
  .clean(true)
  .use(parseDatesFromPostPath())
  .use(setDefaultFrontmatter())
  .use(
    collections({
      blog: {
        pattern: "blog/**/*.md",
        reverse: true
      },
      docs: {
        pattern: "docs/**/*.md",
        reverse: true
      }
    })
  )
  .use(permalinks())
  .use(
    markdown({
      renderer: renderer,
      highlight: (code, lang) => {
        if (lang === undefined) {
          return code;
        }

        return highlightjs.highlight(lang, code).value;
      }
    })
  )
  .use(rereplaceImageUrlsInPost())
  .use(
    inplace({
      engine: "handlebars",
      pattern: "**/*.{md,html}"
    })
  )
  .use(
    layouts({
      engine: "handlebars",
      partials: "layouts",
      pattern: "**/*.{md,html}"
    })
  )
  .use(sass());

if (module.parent) {
  module.exports = app;
} else {
  app.build(function(err) {
    if (err) throw err;

    console.log("metadata was", app.metadata());
    console.log("✓ written to", app.destination());
  });
}
