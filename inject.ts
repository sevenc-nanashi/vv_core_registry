import fs from "fs";
import https from "https";
import sha256 from "crypto-js/sha256";
import { spawn } from "child_process";
import { Octokit } from "octokit";

(async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const releases = await octokit.rest.repos.listReleases({
    owner: "voicevox",
    repo: "voicevox_core",
  });

  const releasesToList = releases.data.filter(
    (release) =>
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
          const match = asset.name.match(/core.+[+_]([a-z]+?)-/);
          if (!match) throw new Error(`invalid asset name: ${asset.name}`);
          return match[1];
        })
    )
  );
  console.log("Found variants:");
  for (const variant of variants) {
    console.log("- " + variant);
  }
  const variantAssets = new Map<
    string,
    {
      url: string;
      name: string;
      hash: string;
      python: string;
      metadata: string;
      metadataHash: string;
    }[]
  >([...variants].map((v) => [v, []]));
  await fs.promises.mkdir("./cache", { recursive: true });
  while (wheels.length > 0) {
    await Promise.all(
      wheels.splice(0, 5).map(async (wheel) => {
        const match = wheel[1].match(/core.+[+_]([a-z]+?)-/);
        if (!match) throw new Error("invalid asset name");
        const variant = match[1];
        const variantUrls = variantAssets.get(variant);
        if (!variantUrls) throw new Error("invalid state");

        const [url, name] = wheel;
        let metadataText: string;
        let hash: string;
        if (
          await fs.promises.stat(`./cache/${name}.metadata`).catch(() => false)
        ) {
          console.log(`Using cached metadata for ${name}`);
          metadataText = await fs.promises.readFile(
            `./cache/${name}.metadata`,
            "utf-8"
          );
          hash = await fs.promises.readFile(`./cache/${name}.sha256`, "utf-8");
        } else {
          console.log(`Downloading ${name}`);
          await new Promise<void>((resolve) => {
            const handle = (res) => {
              if (res.headers.location) {
                console.log(`-> ${res.headers.location}`);
                https.get(res.headers.location, handle);
              } else {
                res.pipe(
                  fs.createWriteStream(`./cache/${name}`, { flags: "w" })
                );
                res.on("end", () => resolve());
              }
            };
            https.get(url, handle);
          });
          console.log(`Downloaded ${name}`);
          hash = await new Promise<string>((resolve) => {
            const proc = spawn("sha256sum", [`./cache/${name}`]);
            let stdout = "";
            proc.stdout.on("data", (data) => {
              stdout += data;
            });
            proc.on("close", () => {
              const hash = stdout.split(" ")[0];
              if (!hash) throw new Error("invalid hash");
              resolve(hash);
            });
          });
          await fs.promises.writeFile(`./cache/${name}.sha256`, hash, "utf-8");
          metadataText = await new Promise<string>((resolve) => {
            const strippedName = name.match(/^([^-]+-[^-]+)-.+\.whl$/)?.[1];
            if (!strippedName) throw new Error("invalid wheel");

            const metadataPath = `${strippedName}.dist-info/METADATA`;
            const proc = spawn("unzip", [
              "-p",
              `./cache/${name}`,
              metadataPath,
            ]);
            let stdout = "";
            proc.stdout.on("data", (data) => {
              stdout += data;
            });

            proc.on("close", () => {
              resolve(stdout);
            });
          });
          await fs.promises.writeFile(
            `./cache/${name}.metadata`,
            metadataText,
            "utf-8"
          );
          await fs.promises.unlink(`./cache/${name}`);
          console.log(`Saved metadata for ${name}`);
        }
        const metadataLines = metadataText.split("\n");
        const requiresPythonLine = metadataLines.find((line) =>
          line.startsWith("Requires-Python:")
        );
        if (!requiresPythonLine) throw new Error("invalid wheel");
        const requiresPython = requiresPythonLine.split(":")[1].trim();
        const metadataHash = sha256(metadataText).toString();
        variantUrls.push({
          url,
          name,
          hash,
          python: requiresPython,
          metadata: metadataText,
          metadataHash: metadataHash,
        });
      })
    );
  }

  const cpuAssets = variantAssets.get("cpu");
  if (!cpuAssets) throw new Error("invalid state");
  variantAssets.set(".", cpuAssets);

  for (const [variant, wheels] of variantAssets) {
    await fs.promises.mkdir(`./dist/${variant}/voicevox-core`, {
      recursive: true,
    });
    await fs.promises.writeFile(
      `./dist/${variant}/voicevox-core/index.html`,
      `<!DOCTYPE html><html><body>${wheels
        .map(
          ({ url, name, python, hash }) =>
            `<a href="${url}#sha256=${hash}" data-requires-python="${python}">${name}</a>`
        )
        .join("<br>")}</body></html>`
    );
    if (variant === ".") {
      console.log(`Wrote package list for default (CPU)`);
    } else {
      await fs.promises.writeFile(
        `./dist/${variant}/index.html`,
        `<a href="./voicevox-core/">voicevox-core</a>`
      );
      console.log(`Wrote package list for ${variant}`);
    }
  }
})();
