// Metro config: share pure TypeScript modules from ../lib with the Next.js app,
// but block every server-only file (node:crypto, Redis, mail, sessions...).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedLib = path.resolve(projectRoot, "../lib");

const config = getDefaultConfig(projectRoot);

// Watch ../lib so Metro can bundle it and hot-reload edits.
config.watchFolders = [...(config.watchFolders || []), sharedLib];

// Resolve packages from mobile/node_modules (files in ../lib only use relative imports).
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// Server-only modules. Anything that imports node:crypto or Redis must never be bundled.
const BLOCKED = [
  "store",
  "seasonStore",
  "galleryStore",
  "practiceStore",
  "ownerAuth",
  "authStore",
  "presence",
  "mail",
  "session",
];
const escapeForRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const blockRegex = new RegExp(
  `^${escapeForRegex(sharedLib)}[\\\\/](${BLOCKED.map(escapeForRegex).join("|")})\\.(ts|tsx|js|jsx)$`,
);

const existing = config.resolver.blockList;
config.resolver.blockList = existing
  ? [].concat(existing, [blockRegex])
  : [blockRegex];

module.exports = config;
