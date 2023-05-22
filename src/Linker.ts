import path from "path";
import fs from "fs";
import { exec, resolvePath } from "./utils";

class Linker {
  /**
   * @private pathMap
   * [current, local, backup]
   * - current: current directory after dependency install.
   * - local: local rspack directory.
   * - backup: backup current directory.
   */
  private pathMap: Record<string, string[]> = {
    core: [],
    cli: [],
    binding: [],
  };
  private localDir = ""; // rspack project local directory.

  // tmp file path
  private tmpFile = path.join(
    __dirname,
    "node_modules/.rspack-link-cli-log.json"
  );

  constructor() {
    this.prepare();
  }

  /**
   * link rspack dependency
   */
  link() {}

  /**
   * restore rspack dependency
   */
  restore() {}

  /**
   * prepare paths
   */
  private prepare() {
    if (this.read()) {
      return;
    }

    this.getLocalDir();
    const cliPath = resolvePath("@rspack/cli");
    const corePath = resolvePath("@rspack/core");

    if (!cliPath && !corePath) {
      throw new Error(`Cannot find @rspack/cli or @rspack/core !`);
    }

    if (corePath) {
      this.getPathByCore();
    } else {
      this.getPathByCli();
    }

    this.save();
  }

  private getPathByCore() {}

  private getPathByCli() {}

  private save() {
    if (!fs.existsSync(this.tmpFile)) {
      fs.writeFileSync(this.tmpFile, JSON.stringify(this.pathMap, null, 2));
    }
  }

  private read() {
    if (fs.existsSync(this.tmpFile)) {
      this.pathMap = JSON.parse(
        fs.readFileSync(this.tmpFile, { encoding: "utf-8" })
      );
      return true;
    }

    return false;
  }

  getLocalDir(): string {
    if (process.env.RSPACK_DIR) {
      return process.env.RSPACK_DIR;
    }

    const pkgPath = path.join(__dirname, "package.json");
    if (fs.existsSync(pkgPath)) {
      const { rspackDir } = JSON.parse(
        fs.readFileSync(pkgPath, { encoding: "utf-8" })
      );
      if (rspackDir) {
        return rspackDir;
      }
    }

    throw Error('Cannot find "rspackDir" in package.json !');
  }
}

export default Linker;
