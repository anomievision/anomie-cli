/* eslint-disable @typescript-eslint/naming-convention */
import { isPackageInstalled } from "../../../utils";
import { $ } from "bnx";
import { Listr } from "listr2";
import path from "node:path";

type Ctx = {
    packageJSONPath: string
};

const ctx: Ctx = {
    packageJSONPath: path.join(process.cwd(), "package.json")
};

type PackageJSON = {
    scripts?: Record<string, string>,
    "lint-staged"?: Record<string, Array<string>>
};

export async function init({
    devDependencies,
    generate
}: {
    devDependencies: boolean,
    generate: boolean
}): Promise<void> {
    const tasks = new Listr<Ctx>(
        [
            {
                title: "Installing husky & lint-staged",
                task: async (_ctx, task) => {
                    if (
                        await isPackageInstalled("husky")
            || await isPackageInstalled("lint-staged")
                    )
                        task.title = "Husky already installed";
                    else {
                        await $`bun add -D husky --silent`;
                        await $`bun add -D lint-staged --silent`;
                        task.title = "Husky & lint-staged installed to devDependencies";
                    }
                },
                skip: () => {
                    if (!devDependencies) return "Skipping devDependencies";

                    return false;
                }
            },
            {
                title: "Initialize husky",
                task: async (_ctx, task) => {
                    await $`bunx husky install`;

                    const packageJSON: PackageJSON = await Bun.file(_ctx.packageJSONPath).json();

                    if (!packageJSON.scripts) packageJSON.scripts = {};

                    if (!packageJSON.scripts["prepare:husky"])
                        packageJSON.scripts["prepare:husky"] = "husky install";

                    if (!packageJSON.scripts.prepare)
                        packageJSON.scripts.prepare = "bun run prepare:husky";
                    else if (
                        !packageJSON.scripts.prepare.includes("bun run prepare:husky")
                    )
                        packageJSON.scripts.prepare += " && bun run prepare:husky";

                    if (!packageJSON["lint-staged"]) {
                        packageJSON["lint-staged"] = {
                            "**/*.{js,jsx,ts,tsx}": ["bun run check --apply --error-on-warnings"]
                        };
                    }

                    await Bun.write(
                        ctx.packageJSONPath,
                        JSON.stringify(packageJSON, null, 2)
                    );

                    await $`bunx husky add .husky/pre-commit "bunx lint-staged"`;
                    await $`git add .husky/pre-commit`;

                    task.title = "Husky initialized";
                },
                skip: () => {
                    if (!generate) return "Skipping initializing husky";

                    return false;
                }
            }
        ],
        {
            ctx
        }
    );

    await tasks.run();
}
