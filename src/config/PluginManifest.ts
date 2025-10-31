import fs from "node:fs/promises";
import pth from "node:path";
import type {
  PluginManifest as IPluginManifest
} from "@aulgn/types/acode";
import type {
  BuilderPluginManifest
} from "@aulgn/types/builder";

export default class PluginManifest {
  static async load(path: string | BuilderPluginManifest): Promise < BuilderPluginManifest | undefined > {
    if (typeof path !== "string") {
      return path;
    } else if (path.endsWith(".js")) {
      const module = require(pth.resolve(path));
      return module.default || module;
    } else if (path.endsWith(".ts")) {
      const module = await import(pth.resolve(path));
      return module.default || module;
    }

    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  }

  static process(data: BuilderPluginManifest): IPluginManifest {
    if (Array.isArray(data.files)) {
      data.files = data.files.map(file =>
        typeof file === "object" ? file.dest: file
      ) as string[];
    }

    return data as IPluginManifest;
  }
}