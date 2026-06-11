const { execSync } = require('node:child_process')

// Ad-hoc sign the whole bundle after packing. Apple Silicon requires a
// valid signature on every binary; without this, a quarantined copy is
// reported as "damaged" instead of showing the normal Gatekeeper prompt.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
}
