import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {getLatestVersion} from './get-latest-version';
import {installer} from './installer';

export interface actionResult {
  exitcode: number;
  output: string;
}

export async function showVersion(
  cmd: string,
  args: string[]
): Promise<actionResult> {
  try {
    let result: actionResult = {
      exitcode: 0,
      output: ''
    };

    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          result.output += data.toString();
        }
      }
    };

    result.exitcode = await exec.exec(cmd, args, options);
    core.debug(`
      exit code: ${result.exitcode}
      stdout: ${result.output}
    `);
    return result;
  } catch (e) {
    return e;
  }
}

// most @actions toolkit packages have async methods
export async function run(): Promise<any> {
  try {
    let toolVersion: string = core.getInput('mdbook-version');
    let shouldInstallLinkcheck: boolean = Boolean(
      core.getInput('use-linkcheck')
    );
    let toolVersionLinkcheck: string = core.getInput('linkcheck-version');
    let installVersion: string = '';
    let installVersionLinkcheck: string = '';

    let result: actionResult = {
      exitcode: 0,
      output: ''
    };

    if (toolVersion === '' || toolVersion === 'latest') {
      installVersion = await getLatestVersion('rust-lang', 'mdbook', 'brew');
    } else {
      installVersion = toolVersion;
    }

    if (shouldInstallLinkcheck) {
      if (toolVersionLinkcheck === '' || toolVersionLinkcheck === 'latest') {
        installVersionLinkcheck = await getLatestVersion(
          'Michael-F-Bryan',
          'mdbook-linkcheck',
          'github'
        );
      } else {
        installVersionLinkcheck = toolVersionLinkcheck;
      }
    }

    core.info(`mdbook version: ${installVersion}`);
    await installer(installVersion);

    if (shouldInstallLinkcheck) {
      core.info(`mdbook-linkcheck version: ${installVersionLinkcheck}`);
      await installer(installVersionLinkcheck, 'linkcheck');
    }

    result = await showVersion('mdbook', ['--version']);

    if (shouldInstallLinkcheck) {
      result = await showVersion('mdbook-linkcheck', ['--version']);
    }

    return result;
  } catch (e) {
    core.setFailed(`Action failed with error ${e}`);
    return e;
  }
}
