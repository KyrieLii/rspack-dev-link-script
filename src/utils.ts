import util from "util";
import path from "path";
import fs from "fs";
import { exec as _exec } from "child_process";

export const exec = util.promisify(_exec);

export const resolvePath = (name: string) => {
  try {
    return require.resolve(name);
  } catch (err) {
    return "";
  }
};
