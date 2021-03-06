#!/usr/bin/env node

// System objects
const fs = require("fs");
const path = require("path");

// Third party objects
const glob = require("glob");
const toc = require("markdown-toc");
const mdlink = require("markdown-link");
const yargs = require("yargs");
const yargv = yargs
  .strict()
  .usage("Usage: ./scripts/toc.js <notes-folder>")
  .example("./scripts/toc.js es9/2018-03/")
  .option("all", {
    alias: "a",
    default: false
  });

const argv = yargv.argv;

if (argv.all) {
  glob("./es+([0-9])/20[1-2][0-9]-[0-3][0-9]", (error, results) => {
    if (error) {
      throw error;
    }

    results.forEach(main);
  });
} else if (argv._.length) {
  main(argv._[0]);
} else {
  yargv.showHelp();
}

function main(folder) {
  glob(`./${folder}/*.md`, (error, results) => {
    if (error) {
      throw error;
    }

    const writable = fs.createWriteStream(`${folder}/toc.md`, { flags: "w" });
    const filePattern = /^\w*-\d+\.[mM][dD]$/;
    let hasTitle = false;
    let hasSummary = false;

    try {
      hasSummary = fs.existsSync(`${folder}/summary.md`);
    } catch (error) {}

    // writable.
    results.forEach(file => {
      if (!filePattern.test(path.basename(file))) {
        return;
      }
      const contents = fs.readFileSync(file, "utf8");
      const fileToc = toc(contents, {
        filter(str, ele) {
          return ele.lvl < 3;
        },
        append: "\n",
        linkify({ lvl }, title, slug) {
          if (!hasTitle && lvl === 1) {
            const part = title.replace(/^(\w*)\s*\d*,\s*(20\d+) Meeting Notes/, "$1 $2");
            writable.write(`# ${part} - Table of Contents\n\n`);

            if (hasSummary) {
              const yearMonth = folder.match(/(\d{4}-\d{2})/)[1];
              writable.write(`- [Summary](${yearMonth}_summary.html)\n`);
            }
            hasTitle = true;
          }
          // prepends the filename to the link
          let content = mdlink(title, `${path.basename(file)}#${slug}`);
          return {
            content,

            // lvl is required to find the highest level links and order it
            lvl
          };
        }
      });

      writable.write(fileToc.content);
    });

    writable.end();
  });
}
