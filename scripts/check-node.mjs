// Fails the build early, with a readable message, when Node is too old.
//
// Without this the failure is a SyntaxError about "Invalid regular expression
// flags" from deep inside node_modules/string-width, which says nothing about
// Node versions and sends you looking for a bug in your own code.
//
// The chain: @opennextjs/cloudflare -> yargs@18 -> string-width@8, which
// requires Node >= 20 and uses the RegExp `v` flag that Node 18 cannot parse.
// `next dev` does not load it, so development works fine on 18 and only the
// Cloudflare build breaks — which is exactly why it catches people out.

const MIN_MAJOR = 20;
const major = Number(process.versions.node.split(".")[0]);

if (major < MIN_MAJOR) {
  console.error(`
  This build needs Node ${MIN_MAJOR} or newer. You are on ${process.version}.

  The Cloudflare build pulls in string-width@8, which uses a regex flag
  Node 18 cannot parse. It fails with a confusing SyntaxError rather than
  a version error, so this check runs first.

  Fix:
    nvm use            # picks up .nvmrc in this repo
    nvm install 22     # if you do not have it yet

  'npm run dev' is unaffected and works on Node 18.
`);
  process.exit(1);
}
