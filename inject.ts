import fs from "fs";
import { Octokit } from "octokit";

(async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const releases = await octokit.rest.repos.listReleases({
    owner: "voicevox",
    repo: "voicevox_core",
  });

  const releasesToList = releases.data.filter(
    (release) =>
      !release.prerelease &&
      !release.draft &&
      release.assets.find((asset) => asset.name.endsWith(".whl"))
  );
  const wheels: [url: string, name: string][] = [];

  for (const release of releasesToList) {
    for (const asset of release.assets) {
      if (asset.name.endsWith(".whl")) {
        wheels.push([asset.browser_download_url, asset.name]);
      }
    }
  }

  console.log("Found wheels:", wheels.length);

  const variants = new Set(
    releasesToList.flatMap((release) =>
      release.assets
        .filter((asset) => asset.name.endsWith(".whl"))
        .map((asset) => {
          const match = asset.name.match(/\+(.+?)-/);
          if (!match) throw new Error("invalid asset name");
          return match[1];
        })
    )
  );
  console.log("Found variants:");
  for (const variant of variants) {
    console.log("- " + variant);
  }
  const variantAssets = new Map<string, [url: string, name: string][]>(
    [...variants].map((v) => [v, []])
  );
  for (const wheel of wheels) {
    const match = wheel[1].match(/\+(.+?)-/);
    if (!match) throw new Error("invalid asset name");
    const variant = match[1];
    const variantUrls = variantAssets.get(variant);
    if (!variantUrls) throw new Error("invalid state");

    variantUrls.push(wheel);
  }

  const cpuAssets = variantAssets.get("cpu");
  if (!cpuAssets) throw new Error("invalid state");
  variantAssets.set(".", cpuAssets);

  for (const [variant, urls] of variantAssets) {
    await fs.promises.mkdir(`./dist/${variant}/voicevox-core`, {
      recursive: true,
    });
    await fs.promises.writeFile(
      `./dist/${variant}/voicevox-core/index.html`,
      `<!DOCTYPE html><html><body>${urls
        .map(
          ([url, name]) => `<a href="${url}">${name.replace(/\+.+?-/, "")}</a>`
        )
        .join("<br>")}</body></html>`
    );
    if (variant === ".") {
      console.log(`Wrote package list for default (CPU)`);
    } else {
      await fs.promises.writeFile(
        `./dist/${variant}/index.html`,
        `<a href="./voicevox-core/" data-requires-python=">=3.8.0">voicevox-core</a>`
      );
      console.log(`Wrote package list for ${variant}`);
    }
  }
})();
