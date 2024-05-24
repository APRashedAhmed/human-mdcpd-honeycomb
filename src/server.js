const fs = require("fs");
const fsp = require("fs").promises; // Use fsp for promise-based operations
const path = require("path");
const csv = require("csv-parser");
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3001;
app.use(cors());

// Define a function to read the CSV and filter timestamps
const readAndFilterCsv = (csvFilePath) => {
  return new Promise((resolve) => {
    const colorChangeTimestamps = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (data) => colorChangeTimestamps.push(data))
      .on("end", () => {
        const filteredTimestamps = colorChangeTimestamps.filter(
          (timeStamp) => timeStamp["Color Changed"] !== "False"
        );
        resolve(filteredTimestamps);
      });
  });
};

app.get("/api/videos", async (req, res) => {
  function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }
  const randomInt = getRandomInt(5);
  console.log(randomInt);
  let dataset = null;
  switch (randomInt) {
    case 0:
      dataset = "hbb_dataset_240502_180044";
      break;
    case 1:
      dataset = "hbb_dataset_240502_181145";
      break;
    case 2:
      dataset = "hbb_dataset_240502_181650";
      break;
    case 3:
      dataset = "hbb_dataset_240502_182205";
      break;
    case 4:
      dataset = "hbb_dataset_240502_182701";
      break;
  }
  console.log(dataset);
  const directoryPath = path.join(
    __dirname,
    "..",
    "public",
    "assets",
    "videos",
    "datasets",
    dataset,
    "videos"
  );
  let block_videos = [];
  const blocks = await fsp.readdir(directoryPath);

  for (const block of blocks) {
    if (block === ".DS_Store") continue;
    var trial_videos = [];
    const blockPath = path.join(directoryPath, block);
    const examples = await fsp.readdir(blockPath);

    for (const example of examples) {
      if (example === ".DS_Store") continue;
      const examplePath = path.join(blockPath, example);
      const files = await fsp.readdir(examplePath);

      // Collect promises for each file's processing
      const videoPromises = files
        .filter((file) => file.endsWith(".mp4"))
        .map(async (file) => {
          let correct_resp = "";
          switch (file.charAt(file.length - 5)) {
            case "d":
              correct_resp = "1";
              break;
            case "n":
              correct_resp = "2";
              break;
            case "e":
              correct_resp = "3";
              break;
            default:
              break;
          }
          let filePath = path.join(examplePath, file);
          const csvFilePath = filePath.replace(/_(red|green|blue)\.mp4$/, "_color_change.csv");
          filePath = filePath.split("public/")[1];

          // Await the reading and filtering of the CSV
          const filteredTimestamps = await readAndFilterCsv(csvFilePath);

          // Return the video object including the filtered timestamps
          return {
            stimulus: [filePath],
            correct_response: correct_resp,
            csv: csvFilePath,
            color_change_timestamps: filteredTimestamps,
          };
        });

      // Wait for all video processing to complete
      const processedVideos = await Promise.all(videoPromises);
      trial_videos.push(...processedVideos);
    }
    block_videos.push(trial_videos);
  }

  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  const shuffledBlocks = shuffle(block_videos);
  res.json({ videos: shuffledBlocks });
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
