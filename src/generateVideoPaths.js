#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

async function getVideoFilePaths() {
  const directoryPath = path.join(
    __dirname,
    "..",
    "public",
    "assets",
    "videos",
    "hbb_dataset_250324_115252_1185959417",
    "videos",
  );
  let videoFilePaths = [];
  const blocks = await fs.readdir(directoryPath);

  for (const block of blocks) {
    if (block === ".DS_Store") continue;
    const blockPath = path.join(directoryPath, block);
    const examples = await fs.readdir(blockPath);

    for (const example of examples) {
      if (example === ".DS_Store") continue;
      const examplePath = path.join(blockPath, example);
      const files = await fs.readdir(examplePath);

      files
        .filter((file) => file.endsWith(".mp4"))
        .forEach((file) => {
          const filePath = path.join(examplePath, file);
          videoFilePaths.push(filePath);
        });
    }
  }

  return videoFilePaths;
}

getVideoFilePaths()
  .then((videoFilePaths) => {
    fs.writeFile(path.join(__dirname, "videoPaths.json"), JSON.stringify(videoFilePaths, null, 2))
      .then(() => console.log("Video paths written to videoPaths.json"))
      .catch((error) => console.error("Error writing video paths:", error));
  })
  .catch((error) => {
    console.error("Error fetching video file paths:", error);
  });
