import fs from 'node:fs/promises';
import pth from 'node:path';
import PluginManifest from "../config/PluginManifest";
import AulgnPackager from "./Packager"
import type { BuildOptions } from "@aulgn/types/builder";

export default class AulgnBuilder {
  private options: BuildOptions;
  private packager: AulgnPackager;
  private cwd: string;

  constructor(options: BuildOptions) {
    this.cwd = process.cwd();
    this.options = options;
    this.packager = new AulgnPackager(this.cwd);

    if (!this.options.bundler) {
      throw new Error('Bundler is required in BuildOptions');
    }
  }

  async build(): Promise<boolean> {
    try {
      console.log('🚀 Starting build process...\n');
      await this.options.bundler.build(this.options);

      const pluginManifest = await PluginManifest.load(pth.join(this.cwd, this.options.manifest));
      if (!pluginManifest) throw new Error("no manifest was found");

      await this.packager.package(this.options, pluginManifest);
      console.log('\n✨ Build completed successfully!');
      return true;
    } catch (err) {
      console.error('\n❌ Build failed:', (err as Error).message);
      return false;
    }
  }

  async dev(): Promise<void> {
    try {
      console.log('🚀 Starting development mode...\n');
      await this.options.bundler.dev(this.options);
    } catch (err) {
      console.error('\n❌ Dev mode failed:', (err as Error).message);
      throw err;
    }
  }

  async clean(): Promise<void> {
    try {
      const outDir = pth.join(this.cwd, this.options.output.directory);
      await fs.rm(outDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned ${pth.relative(this.cwd, outDir)}`);
    } catch (err) {
      console.error('❌ Clean failed:', (err as Error).message);
      throw err;
    }
  }
}