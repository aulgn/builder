import archiver from 'archiver';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import pth from 'node:path';
import PluginData from "../config/pluginData";
import type { BuildConfig } from "@aulgn/types/builder";
import type { PluginManifest } from "@aulgn/types/acode";

export default class AulgnZipper {
  private cwd: string;

  constructor() {
    this.cwd = process.cwd();
  }

  /**
   * Main build method - packages files and creates ZIP
   */
  public async package(config: BuildConfig, pluginData: PluginManifest): Promise<void> {
    try {
      const outDir = pth.join(this.cwd, config.output.directory);
      await this.ensureDir(outDir);

      // Process and write plugin manifest
      const processedPluginData = await PluginData.process(pluginData);
      const destJsonPath = pth.join(outDir, pth.basename(config.manifest));
      await fs.writeFile(destJsonPath, JSON.stringify(processedPluginData, null, 2));
      console.log(`✅ Copied and processed ${config.manifest} to ${pth.relative(this.cwd, outDir)}`);

      // Copy optional files
      if (processedPluginData.readme) {
        await this.copyFileIfExists(
          pth.join(this.cwd, processedPluginData.readme),
          pth.join(outDir, pth.basename(processedPluginData.readme))
        );
      }

      if (processedPluginData.changelog) {
        await this.copyFileIfExists(
          pth.join(this.cwd, processedPluginData.changelog),
          pth.join(outDir, pth.basename(processedPluginData.changelog))
        );
      }

      if (processedPluginData.icon) {
        await this.copyFileIfExists(
          pth.join(this.cwd, processedPluginData.icon),
          pth.join(outDir, pth.basename(processedPluginData.icon))
        );
      }

      // Copy additional files
      if (Array.isArray(processedPluginData.files) && processedPluginData.files.length > 0) {
        for (const file of processedPluginData.files) {
          if (typeof file === 'string') {
            await this.copyFileOrDirectory(
              pth.join(this.cwd, file),
              pth.join(outDir, pth.basename(file))
            );
          } else if (typeof file === 'object' && file.path) {
            const destPath = file.dest || pth.basename(file.path);
            const fullDestPath = pth.join(outDir, destPath);

            await this.ensureDir(pth.dirname(fullDestPath));
            await this.copyFileOrDirectory(
              pth.join(this.cwd, file.path),
              fullDestPath
            );
          }
        }
      }

      // Create ZIP
      const zipPath = pth.join(this.cwd, config.output.zip);
      await this.createZipArchive(outDir, zipPath);

      console.log('📦 All files packaged successfully');
    } catch (error) {
      console.error(`❌ Packaging Error: ${error.message}`);
      throw error;
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async copyFileIfExists(src: string, dest: string): Promise<void> {
    try {
      await fs.access(src);
      await this.ensureDir(pth.dirname(dest));
      await fs.copyFile(src, dest);
      console.log(`✅ Copied ${pth.relative(this.cwd, src)}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  File not found: ${pth.relative(this.cwd, src)}`);
      } else {
        console.error(`❌ Error copying ${pth.relative(this.cwd, src)}: ${error.message}`);
      }
    }
  }

  private async copyFileOrDirectory(src: string, dest: string): Promise<void> {
    try {
      const srcStat = await fs.stat(src);

      if (srcStat.isFile()) {
        await this.ensureDir(pth.dirname(dest));
        await fs.copyFile(src, dest);
        console.log(`✅ Copied file ${pth.relative(this.cwd, src)}`);
      } else if (srcStat.isDirectory()) {
        await this.copyDirectory(src, dest);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Path not found: ${pth.relative(this.cwd, src)}`);
      } else {
        console.error(`❌ Error copying ${pth.relative(this.cwd, src)}: ${error.message}`);
      }
    }
  }

  private async copyDirectory(srcDir: string, destDir: string): Promise<void> {
    try {
      await this.ensureDir(destDir);
      console.log(`📁 Copying directory ${pth.relative(this.cwd, srcDir)}`);

      const entries = await fs.readdir(srcDir, { withFileTypes: true });
      let successCount = 0;
      let loggedCount = 0;
      const maxLogs = 20;

      for (const entry of entries) {
        const srcPath = pth.join(srcDir, entry.name);
        const destPath = pth.join(destDir, entry.name);

        try {
          if (entry.isDirectory()) {
            await this.copyDirectory(srcPath, destPath);
            successCount++;
          } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
            successCount++;

            if (loggedCount < maxLogs) {
              console.log(`  ✅ ${pth.relative(this.cwd, srcPath)}`);
              loggedCount++;
            }
          }
        } catch (error) {
          console.error(`  ❌ Failed to copy ${pth.relative(this.cwd, srcPath)}: ${error.message}`);
        }
      }

      const remainingCount = successCount - loggedCount;
      if (remainingCount > 0) {
        console.log(`  ... and ${remainingCount} more files`);
      }

      console.log(`✅ Finished copying directory (${successCount} items)`);
    } catch (error) {
      console.error(`❌ Error copying directory ${pth.relative(this.cwd, srcDir)}: ${error.message}`);
      throw error;
    }
  }

  private async createZipArchive(sourceDir: string, zipFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        console.log(`📦 Created ${pth.relative(this.cwd, zipFilePath)} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', (err) => reject(err));
      output.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
