/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

/**
 * Publish individual built-in VS Code extensions to an
 * Open VSX registry (default: open-vsx.org) . It is
 * assumed that the extensions to be published are present
 * in directory "dist" at the root of this repo.
 *
 * The publishing of the extensions is delegated to `ovsx`,
 * which uses the following environment variables to know
 * to which registry to publish-to and what personal
 * authentication token to use to authenticate:
 *  OVSX_REGISTRY_URL, OVSX_PAT
 */
// @ts-check
const fs = require('fs')
const os = require('os');
const ovsx = require('ovsx');
const { dist } = require('./paths.js');
const { isPublished } = require('./version');
const packName = 'builtin-extension-pack';

(async () => {
    const result = [];
    const extensions = fs.readdirSync(dist());

    // Publish individual builtin extensions.
    await Promise.all(extensions.map(async vsix => {
        if (!vsix.startsWith(packName)) {
            const publishedVsix = await publishExtension(vsix);
            result.push(`Successfully published extension: ${publishedVsix}`);
        }
    }));

    // Publish builtin extension-packs.
    await Promise.all(extensions.map(async vsix => {
        if (vsix.startsWith(packName)) {
            const publishedVsix = await publishExtension(vsix);
            result.push(`Successfully published extension-pack: ${publishedVsix}`);
        }
    }));

    console.log(result.join(os.EOL));
})();

/**
 * Publish the extension.
 * @param {*} vsix the vsix extension.
 */
async function publishExtension(vsix) {

    // e.g.: bat-1.45.1.vsix
    //       css-language-features-1.45.1.vsix
    //       bat-1.45.2-next.5763d909d5.vsix
    //       css-language-features-1.45.2-next.5763d909d5.vsix
    let regexp = /^([\w-]+)-([\d\w\.-]+)\.vsix$/m;
    const matches = vsix.match(new RegExp(regexp));
    let [, extension, version] = matches;

    // Determine if the extension/version is already published.
    try {
        let found = await isPublished(version, extension);
        if (found) {
            console.log(`Extension ${extension} v${version} is already published - skipping!`);
        } else {
            console.log('Publishing: ', dist(vsix), ' ...');
            await ovsx.publish({ extensionFile: dist(vsix), yarn: true });
        }
        return vsix;
    } catch (e) {
        console.error(`Failed to publish: ${vsix}. Stopping here. Fix the problem and retry.\n`);
        process.exitCode = 1;
        throw e;
    }
}
