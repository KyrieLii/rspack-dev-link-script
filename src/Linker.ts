import path from "path";
import fs from "fs";
import { exec, resolvePath } from "./utils";

const Deps = {
  core: "@rspack/core",
  cli: "@rspack/cli",
  binding: "@rspack/binding",
};

enum State {
  unlink = 0,
  linked = 1,
}

interface Paths {
  resolved?: string; // require.resolve('@rspack/xxx')
  local?: string; // Your local rspack project
  backup?: string; // backup resolved
}

class Linker {
  private pathMap: Record<string, Paths> = {
    core: {},
    cli: {},
    binding: {},
  };

  private localDir = ""; // rspack project local directory.

  private state: State = State.unlink;

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
  async link() {
    if (this.state === State.linked) {
      console.log(`Had Linked !`);
      return;
    }
    const core = this.pathMap.core;
    const binding = this.pathMap.binding;

    await exec(`rm -rf ${core.resolved}`);
    await exec(`ln -s ${core.local} ${core.resolved}`);

    await exec(`rm -rf ${binding.resolved}`);
    await exec(`ln -s ${binding.local} ${binding.resolved}`);

    console.log("linked");
  }

  /**
   * restore rspack dependency
   */
  restore() {}

  async backup() {
    const core = this.pathMap.core;
    const binding = this.pathMap.binding;

    if (core.backup && !fs.existsSync(core.backup)) {
      // core is a dir
      await exec(`cp -rf ${core.resolved}, ${core.backup}`);
    }

    if (binding.backup && !fs.existsSync(binding.backup)) {
      // binding is a link
      fs.symlinkSync(
        fs.readlinkSync(binding.resolved as string),
        binding.backup
      );
    }
  }

  /**
   * prepare paths
   */
  private async prepare() {
    if (this.read()) {
      return;
    }

    this.getLocalDir();
    const cliPath = resolvePath(Deps.cli);
    const corePath = resolvePath(Deps.core);

    if (!cliPath && !corePath) {
      throw new Error(`Cannot find @rspack/cli or @rspack/core !`);
    }

    if (corePath) {
      this.getPathByCore();
    } else {
      this.getPathByCli();
    }

    await this.backup();
    this.save();
  }

  private getPathByCore() {
    const _p = resolvePath(Deps.core);
    // path in node_modules/xxx/xxx/xxx/@rspack/
    const resolved = _p.substring(0, _p.indexOf(Deps.core) + 8);

    this.pathMap.core = {
      resolved: path.join(resolved, "core"),
      local: path.join(this.localDir, "/packages/rspack"),
      backup: path.join(resolved, "core_backup"),
    };

    this.pathMap.binding = {
      resolved: path.join(resolved, "binding"),
      local: path.join(this.localDir, "/crates/node_binding"),
      backup: path.join(resolved, "binding_backup"),
    };
  }

  private getPathByCli() {
    // TODO
  }

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

    throw Error(
      'Cannot find neither process.env.RSPACK_DIR nor "rspackDir" in package.json !'
    );
  }
}

export default Linker;
