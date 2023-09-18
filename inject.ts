import fs from "fs";
import https from "https";
import sha256 from "crypto-js/sha256";
import { spawn } from "child_process";
import { Octokit } from "octokit";
import { Extract } from "unzipper";
import xml from "xml-js";
import { Endpoints } from "@octokit/types";

type Release =
  Endpoints["GET /repos/{owner}/{repo}/releases"]["response"]["data"][0];
const javaVariants = [
  "voicevoxcore",
  "voicevoxcore-cuda",
  "voicevoxcore-directml",
  "voicevoxcore-android",
];

const download = async (url: string, path: string) => {
  await new Promise<void>((resolve) => {
    const handle = (res) => {
      if (res.headers.location) {
        console.log(`-> ${res.headers.location}`);
        https.get(res.headers.location, handle);
      } else {
        res.pipe(fs.createWriteStream(path));
        res.on("end", () => resolve());
      }
    };
    https.get(url, handle);
  });
};

const getPythonPackages = async (releases: Release[]) => {
  const wheels: [url: string, name: string][] = [];

  for (const release of releases) {
    for (const asset of release.assets) {
      if (asset.name.endsWith(".whl")) {
        wheels.push([asset.browser_download_url, asset.name]);
      }
    }
  }

  console.log("Found wheels:", wheels.length);

  const variants = new Set(
    releases.flatMap((release) =>
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
          await download(url, `./cache/${name}`);
          console.log(`Downloaded ${name}`);
          hash = await new Promise<string>((resolve) => {
            const proc = spawn("sha256sum", [`./cache/${name}`]);
            let stdout = "";
            proc.stdout.on("data", (data) => {
              stdout += data;
            });
            proc.on("close", () => {
              const hash = stdout.split(" ")[0];
              if (!hash) throw new Error(`invalid hash: ${stdout}`);
              resolve(hash);
            });
          });
          await fs.promises.writeFile(`./cache/${name}.sha256`, hash, "utf-8");
          metadataText = await new Promise<string>((resolve) => {
            const strippedName = name.match(/^([^-]+-[^-]+)-.+\.whl$/)?.[1];
            if (!strippedName) throw new Error(`invalid wheel name: ${name}`);

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
};

const getJavaPackages = async (releases: Release[]) => {
  const archives: { url: string; version: string }[] = [];

  for (const release of releases) {
    for (const asset of release.assets) {
      if (asset.name === "java_packages.zip") {
        archives.push({
          url: asset.browser_download_url,
          version: release.tag_name,
        });
      }
    }
  }

  console.log("Found archives: ", archives.length);

  await Promise.all(
    archives.map(async ({ url, version }) => {
      if (
        await fs.promises
          .stat(`./cache/java_packages-${version}`)
          .catch(() => false)
      ) {
        console.log(`Using cached archive for ${version}`);
        return;
      }

      if (
        await fs.promises
          .stat(`./cache/java_packages-${version}.zip`)
          .catch(() => false)
      ) {
        console.log(`Using cached archive for ${version}`);
      } else {
        console.log(`Downloading archive for ${version}`);
        await download(url, `./cache/java_packages-${version}.zip`);

        console.log(`Downloaded archive for ${version}`);
      }

      console.log(`Extracting archive for ${version}`);
      await new Promise<void>((resolve) => {
        fs.createReadStream(`./cache/java_packages-${version}.zip`)
          .pipe(
            Extract({
              path: `./cache/java_packages-${version}`,
            })
          )
          .on("close", () => {
            resolve();
          });
      });
      console.log(`Extracted archive for ${version}`);
    })
  );

  for (const name of javaVariants) {
    await fs.promises.mkdir(`./dist/jp/hiroshiba/voicevoxcore/${name}`, {
      recursive: true,
    });
  }

  for (const name of await fs.promises.readdir("./cache")) {
    if (!name.startsWith("java_packages-") || name.endsWith(".zip")) continue;

    for (const dir of await fs.promises.readdir(
      `./cache/${name}/jp/hiroshiba/voicevoxcore`
    )) {
      const dirs = await fs.promises.readdir(
        `./cache/${name}/jp/hiroshiba/voicevoxcore/${dir}`
      );
      for (const version of dirs) {
        if (version.endsWith(".xml")) continue;
        await fs.promises.cp(
          `./cache/${name}/jp/hiroshiba/voicevoxcore/${dir}/${version}`,
          `./dist/jp/hiroshiba/voicevoxcore/${dir}/${version}`,
          {
            recursive: true,
          }
        );
      }
    }
  }
  for (const name of javaVariants) {
    await fs.promises.writeFile(
      `./dist/jp/hiroshiba/voicevoxcore/${name}/maven-metadata.xml`,
      xml.js2xml(
        {
          _declaration: {
            _attributes: {
              version: "1.0",
              encoding: "utf-8",
            },
          },
          metadata: {
            groupId: "jp.hiroshiba.voicevoxcore",
            artifactId: name,
            versioning: {
              latest: archives[0].version,
              release: archives[0].version,
              versions: {
                version: archives.map((archive) => archive.version),
              },
            },
          },
        },
        {
          compact: true,
        }
      )
    );
  }

  await fs.promises.writeFile(
    `./dist/archetype-catalog.xml`,
    xml.js2xml({
      _declaration: {
        _attributes: {
          version: "1.0",
          encoding: "utf-8",
        },
      },
      "archetype-catalog": {
        archetypes: {
          archetype: javaVariants.map((name) => ({
            groupId: "jp.hiroshiba.voicevoxcore",
            artifactId: name,
            version: archives[0].version,
            description: name,
          })),
        },
      },
    })
  );
};

(async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const releases = await octokit.rest.repos
    .listReleases({
      owner: "sevenc-nanashi",
      repo: "voicevox_core",
    })
    .then((res) => res.data.filter((release) => !release.draft));
  await fs.promises.mkdir("./dist", { recursive: true });
  await getPythonPackages(releases);
  await getJavaPackages(releases);
})();
