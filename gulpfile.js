const { src, watch, series, parallel } = require("gulp");
const fs = require("fs-extra");
const Bundler = require("parcel-bundler");
const { spawn } = require("child_process");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const packager = require("electron-packager");
const createDMG = require("electron-installer-dmg");
const createEXE = require("electron-installer-windows");
const path = require("path");
const debug = !!process.env.DEBUG_E;

const DARWIN_PACKAGER_OPTIONS = {
  name: "Cloud Manager Desktop",
  dir: "./",
  platform: "darwin",
  arch: "x64",
  overwrite: true,
  icon: "icon/icon",
  ignore: [
    // ignored from the produced electron app when packaging.
    ".cache",
    ".vscode",
    "app",
    "@adobe/coral-spectrum",
    "@adobe/spectrum-css",
    "vue",
    "popper.js",
    "core-js"
  ].map(toWildRegex)
};

const WIN_PACKAGER_OPTIONS = Object.assign({}, DARWIN_PACKAGER_OPTIONS, {
  platform: "win32"
});

const PRETTIER_FILES = [
  "main.js",
  "preload.js",
  "index.html",
  "gulpfile.js",
  "./app/**/*.js",
  "./app/**/*.ts",
  "./app/**/*.vue",
  "!./app/client/typescript-axios/*"
];

// makes any passed string a wile regex. Example: test => /.*test.*/g
function toWildRegex(str) {
  var escaped = str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`.*${escaped}.*`, "g");
}

// spawn proccess and pipe output to stdout and stderr
function spawnAndLog(command, params) {
  var env = Object.create(process.env);
  const cp = spawn(command, params, { env: env, shell: process.platform == "win32" });
  if (debug) {
    cp.stdout.pipe(process.stdout);
  }
  cp.stderr.pipe(process.stderr);
  return cp;
}

async function execAndLog(command) {
  var env = Object.create(process.env);
  const cp = await exec(command, { env: env });
  if (debug) {
    console.log(cp.stdout);
  }
  console.error(cp.stderr);
  return cp;
}

function prettierTask(watchFiles) {
  const prettify = filePath => {
    if (!filePath) return;
    execAndLog(`prettier --write ${filePath}`);
  };
  return (prettier = cb => {
    if (watchFiles) {
      watcher = watch(PRETTIER_FILES);
      "change add unlink".split(" ").forEach(e => watcher.on(e, prettify));
    } else {
      src(PRETTIER_FILES).on("data", file => prettify(file.path));
    }
    cb();
  });
}

function copyAssetsTask(cb) {
  return fs.copy("node_modules/@adobe/coral-spectrum/dist/resources", "dist/resources");
}

function bundleTask(watch) {
  const publicUrl = path.join(__dirname, "dist");
  const bundler = new Bundler("./app/main.ts", {
    watch: !!watch,
    hmrHostname: "localhost",
    publicUrl: publicUrl
  });
  return (bundle = () => bundler.bundle());
}

function electronTask(debug) {
  return (electron = () => {
    process.env.DEBUG_E = debug;
    return spawnAndLog("electron", ["."]);
  });
}

async function packageDarwinTask(cb) {
  const appPaths = await packager(DARWIN_PACKAGER_OPTIONS);
  console.log(`Electron app bundles created:\n${appPaths.join("\n")}`);
  cb();
}

async function packageWinTask(cb) {
  const appPaths = await packager(WIN_PACKAGER_OPTIONS);
  console.log(`Electron app bundles created:\n${appPaths.join("\n")}`);
  cb();
}

function dmgTask(options) {
  return (dmg = cb => {
    const appFolder = `${options.name}-${options.platform}-${options.arch}`;
    const appName = `${options.name}.app`;
    createDMG(
      {
        appPath: path.join(appFolder, appName),
        out: appFolder,
        title: options.name,
        name: options.name,
        icon: `${options.icon}.icns`,
        overwrite: true
      },
      err => {
        console.error(err);
        console.log(`Electron DMG created`);
      }
    );
    cb();
  });
}

function exeTask(options) {
  return (exe = cb => {
    const appFolder = `${options.name}-${options.platform}-${options.arch}`;
    const appName = `${options.name}.exe`;
    createEXE(
      {
        src: appFolder,
        dest: appFolder,
        exe: appName,
        title: options.name,
        name: options.name,
        icon: `${options.icon}.ico`,
        overwrite: true
      },
      err => {
        if (err) {
          console.error(err);
        }
        console.log(`Electron EXE created`);
      }
    );
    cb();
  });
}

exports["prettier"] = prettierTask(false);
exports["prettier:watch"] = prettierTask(true);
exports["ui:build"] = series(this["prettier"], copyAssetsTask, bundleTask());
exports["ui:watch"] = series(this["prettier:watch"], copyAssetsTask, bundleTask(true));
exports["electron:watch"] = parallel(this["prettier:watch"], this["ui:watch"], electronTask(false));

exports["electron:watch:debug"] = parallel(
  this["prettier:watch"],
  this["ui:watch"],
  electronTask(true)
);

exports["electron:package:darwin"] = series(this["ui:build"], packageDarwinTask);
exports["electron:package:win"] = series(this["ui:build"], packageWinTask);
exports["electron:dmg"] = series(this["electron:package:darwin"], dmgTask(DARWIN_PACKAGER_OPTIONS));
exports["electron:exe"] = series(this["electron:package:win"], exeTask(WIN_PACKAGER_OPTIONS));
