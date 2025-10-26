import fs from 'node:fs/promises';
import pth from 'node:path';
import AulgnZipper from "./zipper";
import PluginData from "../config/pluginData";
import type { BuildConfig } from "@aulgn/types/builder";

export default class AulgnBuilder {
  private config: BuildConfig;
  private zipper: AulgnZipper;
  private cwd: string;

  constructor(config: BuildConfig) {
    this.cwd = process.cwd();
    this.config = config;
    this.zipper = new AulgnZipper();

    // Validate bundler
    if (!this.config.bundler) {
      throw new Error('Bundler is required in BuildConfig');
    }
  }

  /**
   * Build the project
   */
  async build(): Promise<boolean> {
    try {
      console.log('🚀 Starting build process...\n');

      // Step 1: Bundle with the configured bundler
      await this.config.bundler.build(this.config);

      // Step 2: Load plugin data
      const pluginData = await PluginData.load(pth.join(this.cwd, this.config.manifest));

      // Step 3: Package and create ZIP
      await this.zipper.package(this.config, pluginData);

      console.log('\n✨ Build completed successfully!');
      return true;
    } catch (err) {
      console.error('\n❌ Build failed:', err.message);
      return false;
    }
  }

  /**
   * Start development mode
   */
  async dev(): Promise<void> {
    try {
      console.log('🚀 Starting development mode...\n');
      await this.config.bundler.dev(this.config);
    } catch (err) {
      console.error('\n❌ Dev mode failed:', err.message);
      throw err;
    }
  }

  /**
   * Clean build directory
   */
  async clean(): Promise<void> {
    try {
      const outDir = pth.join(this.cwd, this.config.output.directory);
      await fs.rm(outDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned ${pth.relative(this.cwd, outDir)}`);
    } catch (err) {
      console.error('❌ Clean failed:', err.message);
      throw err;
    }
  }
}