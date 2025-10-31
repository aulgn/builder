import pth from 'node:path';
import fs from 'node:fs/promises';
import type { BuildOptions, BuilderPluginManifest } from "@aulgn/types/builder";
import PluginManifest from "../config/PluginManifest";
import AulgnZipper from "./Zipper";

export default class AulgnPackager {
  private cwd: string;
  private zipper: AulgnZipper;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.zipper = new AulgnZipper(this.cwd);
  }

  public async package(options: BuildOptions, pluginManifest: BuilderPluginManifest): Promise<void> {
    try {
      const outDir = pth.join(this.cwd, options.output.directory);
      await this.zipper.ensureDir(outDir);

      const processedManifest = await PluginManifest.process(pluginManifest);

      // Write manifest JSON
      if (typeof options.manifest === "string") {
        const destJsonPath = pth.join(outDir, pth.basename(options.manifest));
        await fs.writeFile(destJsonPath, JSON.stringify(processedManifest));
        console.log(`✅ Processed manifest written to ${pth.relative(this.cwd, destJsonPath)}`);
      }

      // Copy optional files
      for (const key of ["readme", "changelog", "icon"] as const) {
        if (processedManifest[key]) {
          await this.zipper.copyFileIfExists(
            pth.join(this.cwd, processedManifest[key]),
            pth.join(outDir, pth.basename(processedManifest[key]))
          );
        }
      }

      // Copy additional files
      if (Array.isArray(pluginManifest.files)) {
        for (const file of pluginManifest.files) {
          if (typeof file === "string") {
            await this.zipper.copyFileOrDirectory(
              pth.join(this.cwd, file),
              pth.join(outDir, pth.basename(file))
            );
          } else if (typeof file === "object" && file.path) {
            const destPath = file.dest || pth.basename(file.path);
            const fullDestPath = pth.join(outDir, destPath);
            await this.zipper.ensureDir(pth.dirname(fullDestPath));
            await this.zipper.copyFileOrDirectory(
              pth.join(this.cwd, file.path),
              fullDestPath
            );
          }
        }
      }

      // Create ZIP
      const zipPath = pth.join(this.cwd, options.output.zip || processedManifest.id);
      await this.zipper.createZipArchive(outDir, zipPath);

      console.log("📦 All files packaged successfully");
    } catch (error: any) {
      console.error(`❌ Packaging Error: ${error.message}`);
      throw error;
    }
  }
}