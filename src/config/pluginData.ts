import fs from "node:fs/promises";
import pth from "node:path";

export default {
  async load(path) {
    if (path.endsWith(".js")) {
      const module = require(pth.resolve(path));
      return module.default || module;
    } else if (path.endsWith(".ts")) {
      const module = await import(pth.resolve(path));
      return module.default || module;
    }

    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  },

  async process(data) {
    if (Array.isArray(data.files)) {
      data.files = data.files.map(file => {
        if (typeof file === 'object' && file.path && file.dest) {
          return file.dest;
        }
        return file;
      });
    }
    return data;
  }
}