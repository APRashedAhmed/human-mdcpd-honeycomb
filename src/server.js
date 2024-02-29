const fs = require("fs").promises;
const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3001;
app.use(cors());

app.get("/api/videos", async (req, res) => {
  const directoryPath = path.join(__dirname, "..", "public", "assets", "videos", "blocks");
  let block_videos = [];
  const blocks = await fs.readdir(directoryPath);

  for (const block of blocks) {
    if (block === ".DS_Store") continue;
    var trial_videos = [];
    const blockPath = path.join(directoryPath, block);
    const examples = await fs.readdir(blockPath);

    for (const example of examples) {
      if (example === ".DS_Store") continue;
      const examplePath = path.join(blockPath, example);
      const files = await fs.readdir(examplePath);

      trial_videos.push(
        ...files
          .filter((file) => file.endsWith(".mp4"))
          .map((file) => {
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
            filePath = filePath.split("public/")[1];
            console.log(filePath);
            return {
              stimulus: [filePath],
              correct_response: correct_resp,
            };
          })
      );
    }
    console.log(trial_videos);
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
  console.log(shuffledBlocks);
  res.json({ videos: shuffledBlocks });
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
