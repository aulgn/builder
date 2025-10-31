import archiver from 'archiver';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import pth from 'node:path';

export default class AulgnZipper {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  public async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  public async copyFileIfExists(src: string, dest: string): Promise<void> {
    try {
      await fs.access(src);
      await this.ensureDir(pth.dirname(dest));
      await fs.copyFile(src, dest);
      console.log(`✅ Copied ${pth.relative(this.cwd, src)}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  File not found: ${pth.relative(this.cwd, src)}`);
      } else {
        console.error(`❌ Error copying ${pth.relative(this.cwd, src)}: ${error.message}`);
      }
    }
  }

  public async copyFileOrDirectory(src: string, dest: string): Promise<void> {
    try {
      const srcStat = await fs.stat(src);

      if (srcStat.isFile()) {
        await this.ensureDir(pth.dirname(dest));
        await fs.copyFile(src, dest);
        console.log(`✅ Copied file ${pth.relative(this.cwd, src)}`);
      } else if (srcStat.isDirectory()) {
        await this.copyDirectory(src, dest);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Path not found: ${pth.relative(this.cwd, src)}`);
      } else {
        console.error(`❌ Error copying ${pth.relative(this.cwd, src)}: ${error.message}`);
      }
    }
  }

  private async copyDirectory(srcDir: string, destDir: string): Promise<void> {
    await this.ensureDir(destDir);
    console.log(`📁 Copying directory ${pth.relative(this.cwd, srcDir)}`);

    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = pth.join(srcDir, entry.name);
      const destPath = pth.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
        console.log(`  ✅ ${pth.relative(this.cwd, srcPath)}`);
      }
    }
  }

  public async createZipArchive(sourceDir: string, zipFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

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