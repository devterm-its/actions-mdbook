import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import {v4 as uuid} from 'uuid';
import {getOS} from './get-os';
import {getLinkcheckURL, getURL} from './get-url';

export function getBaseLocation(): string {
  let baseLocation: string = '';

  if (process.platform === 'win32') {
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    baseLocation = `${process.env.HOME}`;
  }

  core.debug(`tempDir: ${baseLocation}`);

  return baseLocation;
}

export async function createTempDir(baseLocation: string): Promise<string> {
  let tempDir: string = process.env['RUNNER_TEMP'] || '';

  if (tempDir === '') {
    tempDir = path.join(baseLocation, 'tmp');
    process.env['RUNNER_TEMP'] = tempDir;
  }

  tempDir = path.join(tempDir, uuid());
  await io.mkdirP(tempDir);
  core.debug(`tempDir: ${tempDir}`);

  return tempDir;
}

export async function installer(version: string, tool?: string) {
  const osName: string = getOS(process.platform);
  core.info(`Operating System: ${osName}`);

  let toolURL: string;
  if (tool === 'linkcheck') {
    toolURL = getLinkcheckURL(osName, version);
  } else {
    toolURL = getURL(osName, version);
  }
  core.info(`toolURL: ${toolURL}`);

  const baseLocation: string = getBaseLocation();
  const toolPath: string = path.join(baseLocation, 'toolbin');
  await io.mkdirP(toolPath);
  core.addPath(toolPath);

  // Download and extract mdbook binary
  const tempDir: string = await createTempDir(baseLocation);
  const toolAssets: string = await tc.downloadTool(toolURL);
  let toolBin: string = '';
  let toolExtractedFolder: string;
  if (tool === 'linkcheck') {
    toolExtractedFolder = await tc.extractZip(toolAssets, tempDir);
    toolBin = `${toolExtractedFolder}/mdbook-linkcheck${
      process.platform === 'win32' ? '.exe' : ''
    }`;
  } else {
    if (process.platform === 'win32') {
      toolExtractedFolder = await tc.extractZip(toolAssets, tempDir);
      toolBin = `${toolExtractedFolder}/mdbook.exe`;
    } else {
      toolExtractedFolder = await tc.extractTar(toolAssets, tempDir);
      toolBin = `${toolExtractedFolder}/mdbook`;
    }
  }
  await io.mv(toolBin, toolPath);
}
