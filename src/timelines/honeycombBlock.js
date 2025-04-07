import jsPsychVideoKeyboardResponse from "@jspsych/plugin-video-keyboard-response";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import jsPsychHtmlButtonResponse from "@jspsych/plugin-html-button-response";
import jsPsychVideoButtonResponse from "@jspsych/plugin-video-button-response";
import jsPsychHtmlSliderResponse from "@jspsych/plugin-html-slider-response";

import jsPsychPreload from "@jspsych/plugin-preload";
import instructionsResponse from "@jspsych/plugin-instructions";
import Papa from "papaparse";
import { language, taskSettings } from "../config/main";
import { p, b, div, body } from "../lib/markup/tags";
import videoPaths from "../videoPaths.json";

const honeycombLanguage = language.trials.honeycomb;

async function fetchHtmlContentIfNeeded(content) {
  // Check if the content is a path to an HTML file
  if (content.endsWith(".html")) {
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch content from ${content}`);
    }
    return await response.text();
  }
  // If not a path, return the content as is
  return p(content);
}

const getColor = (number) => {
  let color;
  switch (number) {
    case 0:
      color = "red";
      break;
    case 1:
      color = "green";
      break;
    case 2:
      color = "blue";
      break;
  }
  return color;
};

async function createHoneycombBlock(jsPsych) {
  const readAndFilterCsv = (csvFilePath) => {
    return new Promise((resolve, reject) => {
      fetch(csvFilePath)
        .then((response) => response.text())
        .then((csvText) => {
          Papa.parse(csvText, {
            header: true,
            complete: (results) => {
              const colorChangeTimestamps = results.data;
              // Filter out empty rows
              const nonEmptyTimestamps = colorChangeTimestamps.filter((timeStamp) =>
                Object.keys(timeStamp).some((key) => timeStamp[key].trim() !== "")
              );
              // Apply the desired filter
              const filteredTimestamps = nonEmptyTimestamps.filter(
                (timeStamp) => timeStamp["Color Changed"] !== "False"
              );
              resolve(filteredTimestamps);
            },
            error: (error) => {
              reject(error);
            },
          });
        })
        .catch((error) => reject(error));
    });
  };

  const generateTrialMetadata = async () => {
    let block_videos = [];

    for (let filePath of videoPaths) {
      filePath = filePath.split("public/")[1];
      const pathParts = filePath.split("/");
      const block = parseInt(pathParts[pathParts.length - 3].replace("block_", ""), 10);
      const fileName = pathParts[pathParts.length - 1];

      // Check if the current length of block_videos is less than the current block number
      while (block_videos.length < block) {
        block_videos.push([]);
      }

      // Determine the correct response based on the file name
      let correct_resp = "";
      switch (fileName.charAt(fileName.length - 5)) {
        case "d":
          correct_resp = 0;
          break;
        case "n":
          correct_resp = 1;
          break;
        case "e":
          correct_resp = 2;
          break;
        default:
          break;
      }

      const csvFilePath = filePath.replace(/_(red|green|blue)\.mp4$/, "_color_change.csv");

      const videoObject = {
        stimulus: [filePath],
        correct_response: correct_resp,
        csv: csvFilePath,
      };

      block_videos[block - 1].push(videoObject);
    }

    // Shuffle function
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    return shuffle(block_videos);
  };

  let lastDebriefTrialIndex = 0;

  // const completeMarkup = await fetchHtmlContentIfNeeded(debriefLanguage.completeBlock);
  const debriefTrial = (jsPsych) => ({
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      const currentLastIndex = lastDebriefTrialIndex; // Save old value

      const responseTrials = jsPsych.data
        .get()
        .filterCustom(
          (trial) =>
            trial.trial_index > currentLastIndex &&
            (trial.task === "response" || trial.trial_type === "html-slider-response")
        );

      const correct_trials = responseTrials.filter({ correct: true });
      let accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
      const debriefLanguage = honeycombLanguage.debrief;
      if (isNaN(accuracy)) {
        accuracy = 0;
      }

      lastDebriefTrialIndex = jsPsych.data.get().last(1).values()[0].trial_index;

      let validResponseCounter = 0;
      for (let i = 0; i < responseTrials.count(); i += 2) {
        const trial1 = responseTrials.values()[i];
        const trial2 = responseTrials.values()[i + 1];
        if (trial1 && trial2 && trial1.response !== null && trial2.response !== null) {
          validResponseCounter++;
        }
      }

      const videoTrials = jsPsych.data
        .get()
        .filterCustom(
          (trial) =>
            trial.trial_index > currentLastIndex && trial.trial_type === "video-keyboard-response"
        );

      const attentionRatio = Math.round((validResponseCounter / videoTrials.count()) * 100);
      console.log(attentionRatio);

      const header = debriefLanguage.header;

      let accuracyColor;
      if (accuracy < 33) {
        accuracyColor = "red";
      } else if (accuracy >= 33 && accuracy <= 50) {
        accuracyColor = "yellow";
      } else {
        accuracyColor = "green";
      }
      const accuracyMarkup = p(
        debriefLanguage.accuracy.block.start +
          `<span style="color: ${accuracyColor};">` +
          b(accuracy) +
          `%` +
          `</span>` +
          debriefLanguage.accuracy.block.end
      );

      let attentionColor;
      if (attentionRatio < 80) {
        attentionColor = "red";
      } else if (attentionRatio >= 80 && attentionRatio <= 90) {
        attentionColor = "yellow";
      } else {
        attentionColor = "green";
      }

      const attentionMarkup = p(
        debriefLanguage.attention.start +
          `<span style="color: ${attentionColor};">` +
          b(`${attentionRatio}%`) +
          `</span>` +
          debriefLanguage.attention.end
      );
      const breakMarkup = p(debriefLanguage.takeBreak);
      const completeBlockMarkup = p(debriefLanguage.completeBlock);

      return (
        header +
        body(
          div(accuracyMarkup + attentionMarkup + breakMarkup + completeBlockMarkup, {
            class: "container",
          })
        )
      );
    },
    on_load: function () {
      window.q_key_handler = function (e) {
        if (e.key == "q") {
          window.clear_timer = -1;
        }
      };
      document.addEventListener("keydown", window.q_key_handler);
      window.clear_timer = 1;

      var wait_time = 1 * 60 * 1000; // 1 minute
      var start_time = performance.now();

      var interval = setInterval(function () {
        var time_left = wait_time - (performance.now() - start_time);
        var minutes = Math.floor(time_left / 1000 / 60);
        var seconds = Math.floor((time_left - minutes * 60 * 1000) / 1000);
        var seconds_str = seconds.toString().padStart(2, "0");

        const clockElement = document.querySelector("#clock");
        if (time_left <= 0) {
          if (clockElement) clockElement.innerHTML = "0:00";
          window.clear_timer = -1;
        }
        if (window.clear_timer > 0) {
          if (clockElement) clockElement.innerHTML = minutes + ":" + seconds_str;
        } else {
          clearInterval(interval);
        }
      }, 250);
    },

    on_finish: function () {
      document.removeEventListener("keydown", window.q_key_handler);
    },
    choices: ["Continue"],
    trial_duration: 60000,
    data: {
      task: "Block Debrief",
    },
  });

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    // stimulus: '<div style="font-size:60px;">+</div>',
    stimulus: " ",
    choices: "NO_KEYS",
    trial_duration: 250,
    data: {
      task: "fixation",
    },
  };

  let videoTrial = {
    type: jsPsychVideoKeyboardResponse,
    stimulus: jsPsych.timelineVariable("stimulus"),
    choices: [" "], // Allow space just to keep structure; adjust as needed
    trial_ends_after_video: true,
    response_ends_trial: false,
    on_start: function () {
      console.log(jsPsych.timelineVariable("color_change_timestamps"));
    },
    on_load: function () {
      const responseTrials = jsPsych.data
        .get()
        .filterCustom(
          (trial) =>
            trial.trial_index > lastDebriefTrialIndex &&
            trial.trial_type === "video-keyboard-response"
        );
      console.log(responseTrials.count());
    },
  };

  if (process.env.REACT_APP_MODE === "spacebar") {
    //if spacebar mode
    videoTrial.on_start = function (trial) {
      console.log(jsPsych.timelineVariable("color_change_timestamps"));
      const startTime = performance.now();
      trial.eventHandler = handleSpacebarPress(startTime);
      // Attach event listener to log spacebar keypresses
      window.addEventListener("keydown", trial.eventHandler);
    };

    videoTrial.on_finish = function (trial) {
      // Remove event listener when trial finishes
      window.removeEventListener("keydown", trial.eventHandler);
    };
  }

  // Define the event handler function
  function handleSpacebarPress(startTime) {
    return function (event) {
      if (event.code === "Space") {
        // Log the spacebar press time or any other relevant information
        const timePressed = jsPsych.getTotalTime(); // Get the time since the start of the experiment
        const nodeID = jsPsych.getCurrentTimelineNodeID();
        const trial = jsPsych.getCurrentTrial();
        jsPsych.data.get().push({
          response: "spacebar-press",
          time_elapsed: timePressed,
          internal_node_id: nodeID,
          stimulus: trial.stimulus,
          trial_type: trial.type.info.name,
          rt: performance.now() - startTime,
        });

        // Prevent default action to stop any side effects (optional)
        event.preventDefault();
      }
    };
  }

  const choiceTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      // let choices = `
      //         <div style='text-align: center;'>
      //             <span style='color: red; margin-right: 5px;'  >(1) <b>Red</b><br></span>
      //             <span style='color: green; margin-left: 15px;'>(2) <b>Green</b><br></span>
      //             <span style='color: blue;'                    >(3) <b>Blue</b><br></span>
      //         </div>`;
      return "<div>" + question + "</div>";
    },
    trial_duration: taskSettings.choiceTrial.trial_duration,
    choices: ["Red", "Green", "Blue"],
    button_html:
      '<button class="jspsych-btn" style="color: %choice%; margin: 0 5px;">%choice%</button>',
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = data.response
        ? jsPsych.pluginAPI.compareKeys(data.response.toString(), data.correct_response.toString())
        : false;
      console.log(data.correct);
      var proportion_complete = jsPsych.getProgressBarCompleted();
      console.log(proportion_complete);
      jsPsych.setProgressBar(proportion_complete + 1 / 275);
    },
  };

  var sliderTrial = {
    type: jsPsychHtmlSliderResponse,
    stimulus: function () {
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);

      let question = `<p>You chose <span style='color: ${user_color}'><b>${user_color}</b></span> 
      how confident are you in your response?</p>`;
      return "<div>" + question + "</div>";
    },
    trial_duration: taskSettings.sliderTrial.trial_duration,
    slider_start: function () {
      return Math.random() * 100; // Re-randomize for each trial
    },
    button_label: "Next",
    labels: ["0%", "100%"],
    step: 0.001,
    on_load: function () {
      console.log("sliderTrial");
    },
  };

  // Conditional wrapper to determine if sliderTrial should be shown
  var conditionalSliderTrial = {
    timeline: [sliderTrial],
    conditional_function: function () {
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);

      console.log("user_color", user_color);
      // Return true if user_color is defined, false to skip this trial
      return typeof user_color !== "undefined";
    },
  };

  var waitTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      var choiceData = jsPsych.data
        .get()
        .filter({ trial_type: "html-button-response" })
        .last(1)
        .values()[0];
      var isChoiceUndefined = choiceData.response === undefined || choiceData.response === null;
      let reason;
      if (isChoiceUndefined) {
        reason = honeycombLanguage.wait.color;
      } else {
        reason = honeycombLanguage.wait.confidence;
      }
      return "<div>" + reason + honeycombLanguage.wait.wait + "</div>";
    },
    trial_duration: taskSettings.waitTrial.trial_duration,
    response_ends_trial: false,
  };

  // Conditional wrapper to show a waiting screen if user_color is undefined
  var conditionalWaitTrial = {
    timeline: [waitTrial],
    conditional_function: function () {
      var choiceData = jsPsych.data
        .get()
        .filter({ trial_type: "html-button-response" })
        .last(1)
        .values()[0];
      var isChoiceUndefined = choiceData.response === undefined || choiceData.response === null;
      if (isChoiceUndefined) {
        return true;
      }
      // Get the data from the slider trial
      var sliderData = jsPsych.data
        .get()
        .filter({ trial_type: "html-slider-response" })
        .last(1)
        .values()[0];
      var isSliderUndefined = sliderData.response === undefined || sliderData.response === null;

      // Return true to show the wait trial if either is undefined, otherwise false to skip it
      return isSliderUndefined;
    },
  };

  const videoBlocks = await generateTrialMetadata();
  console.log(videoBlocks, "videoBlocks");
  let blockTimeline = [];

  for (const [index, videoBlock] of videoBlocks.entries()) {
    // Add the debrief trial for all blocks after the first one
    if (index !== 0) {
      blockTimeline.push(debriefTrial(jsPsych));
    }

    // Add a preload trial before beginning each block
    var preloadTrial = {
      type: jsPsychPreload,
      video: videoBlock,
      show_progress_bar: true,
      message: "Loading videos, please wait...",
      error_message: "Failed to load videos. Please check your connection and try again.",
    };
    blockTimeline.push(preloadTrial);

    // Add the main block of trials
    const videoProcedure = {
      timeline: [
        fixation,
        videoTrial,
        fixation,
        choiceTrial,
        conditionalSliderTrial,
        conditionalWaitTrial,
      ],
      timeline_variables: videoBlock,
      randomize_order: true, //shuffle videos within blocks
      on_timeline_start: async () => {
        // Load csv timestamps before each block
        const csvPromises = videoBlock.map((video) => readAndFilterCsv(video.csv));
        const filteredTimestampsArray = await Promise.all(csvPromises);
        for (let i = 0; i < videoBlock.length; i++) {
          videoBlock[i].color_change_timestamps = filteredTimestampsArray[i];
        }
      },
    };
    blockTimeline.push(videoProcedure);
  }

  const honeycombBlock = {
    timeline: blockTimeline,
  };

  return honeycombBlock;
}

async function createStartInstructionsTrial() {
  const honeycombLanguage = language.trials.honeycomb;

  // Fetch the content for each instruction page
  const readContent = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.read);
  const detailsContent = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.details);

  let pages = [readContent, detailsContent];

  if (process.env.REACT_APP_MODE === "tutorial") {
    const nextContent = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.nextTutorial);
    pages.push(nextContent);
  }
  // Create the instructions trial with the fetched content
  const startInstructionsTrial = {
    type: instructionsResponse,
    pages: pages,
    show_clickable_nav: true,
    post_trial_gap: 500,
  };

  return startInstructionsTrial;
}

async function createEndInstructionsTrial() {
  let pages = [];

  if (process.env.REACT_APP_MODE === "tutorial") {
    const endPractice = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.endPractice);
    pages.push(endPractice);
  }

  // Fetch the content for each instruction page
  const blocks = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.blocks);
  pages.push(blocks);
  const prolific = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.prolific);
  pages.push(prolific);
  const start = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.start);
  pages.push(start);

  // Create the instructions trial with the fetched content
  const endInstructionsTrial = {
    type: instructionsResponse,
    pages: pages,
    show_clickable_nav: true,
    post_trial_gap: 500,
  };

  return endInstructionsTrial;
}

//**************************************************************************//
async function createWalkthroughTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: " ",
    choices: "NO_KEYS",
    trial_duration: 250,
    data: {
      task: "fixation",
    },
  };
  const videoTrial = {
    type: jsPsychVideoButtonResponse,
    // Display a stimulus passed as a timeline variable
    stimulus: jsPsych.timelineVariable("stimulus"),
    choices: ["Next"],
    trial_ends_after_video: false,
    response_ends_trial: true,
    response_allowed_while_playing: false,
    prompt: jsPsych.timelineVariable("text"),
    // controls: true,
  };

  const choiceTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      // let choices = `
      //         <div style='text-align: center;'>
      //             <span style='color: red; margin-right: 5px;'  ><b>Red</b><br></span>
      //             <span style='color: green; margin-left: 15px;'><b>Green</b><br></span>
      //             <span style='color: blue;'                    ><b>Blue</b><br></span>
      //         </div>`;
      return "<div>" + question + "</div>";
    },
    // trial_duration: 10000,
    choices: ["Red", "Green", "Blue"],
    button_html:
      '<button class="jspsych-btn" style="color: %choice%; margin: 0 5px;">%choice%</button>',
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = data.response
        ? jsPsych.pluginAPI.compareKeys(data.response.toString(), data.correct_response.toString())
        : false;
    },
  };

  var sliderTrial = {
    type: jsPsychHtmlSliderResponse,
    stimulus: function () {
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);

      let question = `<p>You chose <span style='color: ${user_color}'><b>${user_color}</b></span> 
      how confident are you in your response?</p>`;
      return "<div>" + question + "</div>";
    },
    slider_start: function () {
      return Math.random() * 100; // Re-randomize for each trial
    },
    button_label: "Next",
    labels: ["0%", "100%"],
    step: 0.001,
  };

  async function initializeTrialVideos() {
    const trial_videos = [
      {
        stimulus: ["assets/videos/walkthrough/1_demonstrate_task_physics_and_color_green.mp4"],
        correct_response: 1,
        text: await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.video_1),
      },
      {
        stimulus: ["assets/videos/walkthrough/2_lower_number_of_changes_red.mp4"],
        correct_response: 0,
        text: await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.video_2),
      },
      {
        stimulus: ["assets/videos/walkthrough/3_higher_number_of_changes_blue.mp4"],
        correct_response: 2,
        text: await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.video_3),
      },
      {
        stimulus: ["assets/videos/walkthrough/4_introduce_the_grayzone_red.mp4"],
        correct_response: 0,
        text: await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.video_4),
      },
      {
        stimulus: ["assets/videos/walkthrough/5_videos_end_in_the_grayzone_green.mp4"],
        correct_response: 1,
        text: await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.video_5),
      },
    ];
    return trial_videos;
  }

  const trial_videos = await initializeTrialVideos();

  const timeline = {
    timeline: [fixation, videoTrial, fixation, choiceTrial, sliderTrial],
    timeline_variables: trial_videos,
    randomize_order: false, // Do not shuffle these videos
  };

  return timeline;
}

//**************************************************************************//
async function createEndWalkthroughTrial() {
  const endWalkthrough = await fetchHtmlContentIfNeeded(
    honeycombLanguage.walkthrough.endWalkthrough
  );
  const endWalkthroughTrial = {
    type: instructionsResponse,
    pages: [endWalkthrough],
    show_clickable_nav: true,
    post_trial_gap: 500,
  };
  return endWalkthroughTrial;
}

//**************************************************************************//
function createPracticeTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: " ",
    // stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 250,
    data: {
      task: "fixation",
    },
  };
  const videoTrial = {
    type: jsPsychVideoKeyboardResponse,
    // Display a stimulus passed as a timeline variable
    stimulus: jsPsych.timelineVariable("stimulus"),
    choices: [" ", "Enter"],
    trial_ends_after_video: true,
    response_ends_trial: false,
  };

  const choiceTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      // let choices = `
      //         <div style='text-align: center;'>
      //             <span style='color: red; margin-right: 5px;'  ><b>Red</b><br></span>
      //             <span style='color: green; margin-left: 15px;'><b>Green</b><br></span>
      //             <span style='color: blue;'                    ><b>Blue</b><br></span>
      //         </div>`;
      return "<div>" + question + "</div>";
    },
    trial_duration: taskSettings.choiceTrial.trial_duration,
    choices: ["Red", "Green", "Blue"],
    button_html:
      '<button class="jspsych-btn" style="color: %choice%; margin: 0 5px;">%choice%</button>',
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = data.response
        ? jsPsych.pluginAPI.compareKeys(data.response.toString(), data.correct_response.toString())
        : false;

      // data.correct = data.response ? jsPsych.pluginAPI.compareKeys(
      // 	data.response,
      // 	data.correct_response
      // ) : false;
      console.log(data.correct);
    },
  };

  var sliderTrial = {
    type: jsPsychHtmlSliderResponse,
    stimulus: function () {
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);

      let question = `<p>You chose <span style='color: ${user_color}'><b>${user_color}</b></span> 
      how confident are you in your response?</p>`;
      return "<div>" + question + "</div>";
    },
    trial_duration: taskSettings.sliderTrial.trial_duration,
    slider_start: function () {
      return Math.random() * 100; // Re-randomize for each trial
    },
    button_label: "Next",
    labels: ["0%", "100%"],
    step: 0.001,
  };

  // Conditional wrapper to determine if sliderTrial should be shown
  var conditionalSliderTrial = {
    timeline: [sliderTrial],
    conditional_function: function () {
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);

      console.log("user_color", user_color);
      // Return true if user_color is defined, false to skip this trial
      return typeof user_color !== "undefined";
    },
  };

  var waitTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      var choiceData = jsPsych.data
        .get()
        .filter({ trial_type: "html-button-response" })
        .last(1)
        .values()[0];
      var isChoiceUndefined = choiceData.response === undefined || choiceData.response === null;
      let reason;
      if (isChoiceUndefined) {
        reason = honeycombLanguage.wait.color;
      } else {
        reason = honeycombLanguage.wait.confidence;
      }
      return "<div>" + reason + honeycombLanguage.wait.wait + "</div>";
    },
    trial_duration: taskSettings.waitTrial.trial_duration,
    response_ends_trial: false,
  };

  // Conditional wrapper to show a waiting screen if user_color is undefined
  var conditionalWaitTrial = {
    timeline: [waitTrial],
    conditional_function: function () {
      var choiceData = jsPsych.data
        .get()
        .filter({ trial_type: "html-button-response" })
        .last(1)
        .values()[0];
      var isChoiceUndefined = choiceData.response === undefined || choiceData.response === null;
      if (isChoiceUndefined) {
        return true;
      }
      // Get the data from the slider trial
      var sliderData = jsPsych.data
        .get()
        .filter({ trial_type: "html-slider-response" })
        .last(1)
        .values()[0];
      var isSliderUndefined = sliderData.response === undefined || sliderData.response === null;

      // Return true to show the wait trial if either is undefined, otherwise false to skip it
      return isSliderUndefined;
    },
  };

  const answerTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      const correct_color = getColor(jsPsych.timelineVariable("correct_response"));
      const user_color = getColor(
        jsPsych.data.get().filter({ trial_type: "html-button-response" }).last(1).values()[0]
          .response
      );
      // const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].user_color);
      console.log(jsPsych.data.getLastTrialData(), "answerTrial");

      let user_answer;
      if (user_color === undefined || user_color === null) {
        user_answer = "<p>You did not choose a color in time.</p>";
      } else {
        user_answer = `<p>You chose <span style='color: ${user_color}'> <b>${user_color}</b>.<span>`;
      }
      let correct_answer = `<p>The correct answer was <span style='color: ${correct_color}'> <b>${correct_color}</b>.<span>`;

      return "<div>" + user_answer + correct_answer + "</div>";
    },
    choices: ["Continue"],
  };

  const trial_videos = [
    { stimulus: ["assets/videos/examples/ex_1_red.mp4"], correct_response: 0 },
    { stimulus: ["assets/videos/examples/ex_5_green.mp4"], correct_response: 1 },
    { stimulus: ["assets/videos/examples/ex_7_blue.mp4"], correct_response: 2 },
    { stimulus: ["assets/videos/examples/ex_10_green.mp4"], correct_response: 1 },
    { stimulus: ["assets/videos/examples/ex_2_red.mp4"], correct_response: 0 },
  ];

  const timeline = {
    timeline: [
      fixation,
      videoTrial,
      fixation,
      choiceTrial,
      conditionalSliderTrial,
      conditionalWaitTrial,
      answerTrial,
    ],
    timeline_variables: trial_videos,
    randomize_order: true, //shuffle videos within blocks
  };

  return timeline;
}

const createDebriefTrial = (jsPsych) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    // Note that we need the jsPsych instance to aggregate the data
    const responseTrials = jsPsych.data.get().filter({ task: "response" });
    const correct_trials = responseTrials.filter({ correct: true });
    let accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
    // const reactionTime = Math.round(correct_trials.select("rt").mean());
    const debriefLanguage = honeycombLanguage.debrief;

    if (isNaN(accuracy)) {
      accuracy = 0;
    }

    let accuracyColor;
    if (accuracy < 33) {
      accuracyColor = "red";
    } else if (accuracy >= 33 && accuracy <= 50) {
      accuracyColor = "yellow";
    } else {
      accuracyColor = "green";
    }

    const header = debriefLanguage.header;
    const accuracyMarkup = p(
      debriefLanguage.accuracy.experiment.start +
        `<span style="color: ${accuracyColor};">` +
        b(accuracy) +
        `</span>` +
        debriefLanguage.accuracy.experiment.end
    );
    const completeMarkup = p(debriefLanguage.complete);

    // Display the accuracy, reaction time, and complete message as 3 paragraphs in a row
    return header + body(div(accuracyMarkup + completeMarkup, { class: "container" }));
  },
  choices: ["Continue"],

  on_load: async () => {
    // Prepare data to save
    if (process.env.REACT_APP_DEV === "true") {
      jsPsych.data.get().localSave("csv", "tutorial_experiment.csv");
    }
  },

  data: {
    task: "Final Debrief",
  },
});

export {
  createDebriefTrial,
  createHoneycombBlock,
  createWalkthroughTrial,
  createPracticeTrial,
  createStartInstructionsTrial,
  createEndInstructionsTrial,
  createEndWalkthroughTrial,
};
