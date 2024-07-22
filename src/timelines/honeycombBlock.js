import jsPsychVideoKeyboardResponse from "@jspsych/plugin-video-keyboard-response";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import jsPsychPreload from '@jspsych/plugin-preload';
import Papa from 'papaparse';

// import { fixation } from "@brown-ccv/behavioral-task-trials";

// import { config, taskSettings } from "../config/main";
import { language, taskSettings } from "../config/main";
import { p, b } from "../lib/markup/tags";
import videoPaths from '../videoPaths.json';

// import { taskSettings } from "../config/main";

async function createHoneycombBlock(jsPsych) {
  // const { fixation: fixationSettings } = taskSettings;
  const honeycombLanguage = language.trials.honeycomb;

  const readAndFilterCsv = (csvFilePath) => {
    return new Promise((resolve, reject) => {
      fetch(csvFilePath)
	.then(response => response.text())
	.then(csvText => {
	  Papa.parse(csvText, {
	    header: true,
	    complete: (results) => {
	      const colorChangeTimestamps = results.data;
	      // Filter out empty rows
	      const nonEmptyTimestamps = colorChangeTimestamps.filter(
		(timeStamp) => Object.keys(timeStamp).some(key => timeStamp[key].trim() !== "")
	      );
	      // Apply the desired filter
	      const filteredTimestamps = nonEmptyTimestamps.filter(
		(timeStamp) => timeStamp["Color Changed"] !== "False"
	      );
	      resolve(filteredTimestamps);
	    },
	    error: (error) => {
	      reject(error);
	    }
	  });
	})
	.catch(error => reject(error));
    });
  };
  
  const generateTrialMetadata = async () => {
    let block_videos = [];

    for (let filePath of videoPaths) {
      filePath = filePath.split("public/")[1];
      const pathParts = filePath.split('/');
      const block = parseInt(pathParts[pathParts.length - 3].replace('block_', ''), 10);
      const fileName = pathParts[pathParts.length - 1];

      // Check if the current length of block_videos is less than the current block number
      while (block_videos.length < block) {
	  block_videos.push([]);
      }

      // Determine the correct response based on the file name
      let correct_resp = "";
        switch (fileName.charAt(fileName.length - 5)) {
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
 
      const csvFilePath = filePath.replace(/_(red|green|blue)\.mp4$/, "_color_change.csv");

      const videoObject = {
	stimulus: [filePath],
	correct_response: correct_resp,
        csv: csvFilePath,
	
      };

	block_videos[block - 1].push(videoObject);
    };

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

  
  /**
   * Displays a fixation dot at the center of the screen.
   *
   * The settings for this trial are loaded from taskSettings.fixation:
   *    If randomize_duration is true the dot is shown for default_duration
   *    Otherwise, a random value is selected from durations
   */
  // TODO #280: Pull fixation trial into Honeycomb directly
  // const fixationTrial = fixation(config, {
  //   duration: fixationSettings.trial_duration
  //     ? jsPsych.randomization.sampleWithoutReplacement(fixationSettings.durations, 1)[0]
  //     : fixationSettings.default_duration,
  // });

  const debriefTrial = (jsPsych) => ({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      //add language "if you need to take a break..., the next one will run for ~8min"
      const responseTrials = jsPsych.data.get().filter({ task: "response" });
      const correct_trials = responseTrials.filter({ correct: true });
      const accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
      const reactionTime = Math.round(correct_trials.select("rt").mean());

      const debriefLanguage = honeycombLanguage.debrief;

      const accuracyMarkup = p(
        debriefLanguage.accuracy.start + b(accuracy) + debriefLanguage.accuracy.end
      );
      const reactionTimeMarkup = p(
        debriefLanguage.reactionTime.start + b(reactionTime) + debriefLanguage.reactionTime.end
      );
      const completeMarkup = p(debriefLanguage.completeBlock);
      return accuracyMarkup + reactionTimeMarkup + completeMarkup;
    },
    choices: ["Enter"],
    data: {
      task: "Block Debrief",
    },
  });

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 1000,
    data: {
      task: "fixation",
    },
  };

  /**
   * Displays a colored circle and waits for participant to response with a keyboard press
   *
   * The settings for this trial are passed as timeline variables
   *
   * Note that the correct_response is saved as a data point
   * Note that the trial calculates and saves if the user responded correctly on trial_finish
   */
  // TODO #332: Add photodiode and event marker code here
  let videoTrial = {
    type: jsPsychVideoKeyboardResponse,
    stimulus: jsPsych.timelineVariable("stimulus"),
    choices: [" "], // Allow space just to keep structure; adjust as needed
    trial_ends_after_video: true,
    response_ends_trial: false,
    on_start: function () {
      console.log(jsPsych.timelineVariable("color_change_timestamps"));
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
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      let choices = `
              <div style='text-align: center;'>
                  <span style='color: red; margin-right: 15px;'  >(1) <b>Red</b>  <br></span>
                  <span style='color: green; margin-right: 15px;'>(2) <b>Green</b><br></span>
                  <span style='color: blue;'                     >(3) <b>Blue</b> <br></span>
              </div>`;
      return "<div>" + question + choices + "</div>";
    },
    trial_duration: taskSettings.choiceTrial.trial_duration,
    choices: ["1", "2", "3"],
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
      console.log(data.correct);
      var proportion_complete = jsPsych.getProgressBarCompleted();
      console.log(proportion_complete);
      jsPsych.setProgressBar(proportion_complete + 1 / 275);

      // jsPsych.data.get().localSave("csv", "tutorial_experiment.csv");
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
	message: 'Loading videos, please wait...',
	error_message: 'Failed to load videos. Please check your connection and try again.'
    };
    blockTimeline.push(preloadTrial);

    // Add the main block of trials
    const videoProcedure = {
      timeline: [fixation, videoTrial, fixation, choiceTrial],
      timeline_variables: videoBlock,
      randomize_order: true, //shuffle videos within blocks
      on_timeline_start: async () => { // Load csv timestamps before each block
        const csvPromises = videoBlock.map(video => readAndFilterCsv(video.csv));
        const filteredTimestampsArray = await Promise.all(csvPromises);
        for (let i = 0; i < videoBlock.length; i++) {
          videoBlock[i].color_change_timestamps = filteredTimestampsArray[i];
        }
      }
    };
    blockTimeline.push(videoProcedure);
  }

  const honeycombBlock = {
    timeline: blockTimeline,
  };

  return honeycombBlock;
}

//**************************************************************************//
function createWalkthroughTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 1000,
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
    prompt: function () {
      return `<div style="position: fixed; top: 50%; left: 25%; transform: translate(-50%, -50%); color: black; font-size: 24px; z-index: 100;">
                  ${jsPsych.timelineVariable("text")}
              </div>`;
    },
  };

  const choiceTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      let choices = `
              <div style='text-align: center;'>
                  <span style='color: red; margin-right: 15px;'  >(1) Red  <br></span>
                  <span style='color: green; margin-right: 15px;'>(2) Green<br></span>
                  <span style='color: blue;'                     >(3) Blue <br></span>
              </div>`;
      return "<div>" + question + choices + "</div>";
    },
    trial_duration: 10000,
    choices: ["1", "2", "3"],
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
      console.log(data.correct);
    },
  };

  const trial_videos = [
    {
      stimulus: ["assets/videos/walkthrough/1_no_gray_base_transitions_green.mp4"],
      correct_response: "2",
      text: "Ball transitions red -> green -> blue",
    },
    {
      stimulus: ["assets/videos/walkthrough/2_no_gray_low_change_red.mp4"],
      correct_response: "2",
      text: "Sometimes it doesn't change often",
    },
    {
      stimulus: ["assets/videos/walkthrough/3_no_gray_high_change_green.mp4"],
      correct_response: "3",
      text: "Sometimes it changes a lot",
    },
    {
      stimulus: ["assets/videos/walkthrough/4_gray_outside_end_red.mp4"],
      correct_response: "2",
      text: "Grayzone is present in the main task but ball can end outside of it",
    },
    {
      stimulus: ["assets/videos/walkthrough/5_gray_introduction_blue.mp4"],
      correct_response: "1",
      text: "However, most trials will have the ball end inside it",
    },
  ];

  const timeline = {
    timeline: [fixation, videoTrial, fixation, choiceTrial],
    timeline_variables: trial_videos,
    randomize_order: false,
  };

  return timeline;
}

//**************************************************************************//
function createTutorialTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 1000,
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
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      let choices = `
              <div style='text-align: center;'>
                  <span style='color: red; margin-right: 15px;'  >(1) Red  <br></span>
                  <span style='color: green; margin-right: 15px;'>(2) Green<br></span>
                  <span style='color: blue;'                     >(3) Blue <br></span>
              </div>`;
      return "<div>" + question + choices + "</div>";
    },
    trial_duration: 10000,
    choices: ["1", "2", "3"],
    response_ends_trial: true,
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
      console.log(data.correct);
    },
  };

  const getColor = (string) => {
    let color;
    switch (string) {
      case "1":
        color = "red";
        break;
      case "2":
        color = "green";
        break;
      case "3":
        color = "blue";
        break;
    }
    return color;
  };

  const answerTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      const correct_color = getColor(jsPsych.timelineVariable("correct_response"));
      const user_color = getColor(jsPsych.data.getLastTrialData().trials[0].response);
      console.log(toString(jsPsych.data.getLastTrialData().trials[0].response, "hi"));
      console.log(jsPsych.data.getLastTrialData());
      let correct_answer = `<p>The correct answer was <span style='color: ${correct_color}'> ${correct_color}<span>`;
      let user_answer = `<p>You chose <span style='color: ${user_color}'> ${user_color}<span>`;
      let spacebar = "<p>Press the spacebar to continue";
      return "<div>" + correct_answer + user_answer + spacebar + "</div>";
    },
    choices: [" "],
  };

  const trial_videos = [
    { stimulus: ["assets/videos/examples/ex_1_red.mp4"], correct_response: "1" },
    { stimulus: ["assets/videos/examples/ex_5_green.mp4"], correct_response: "2" },
    { stimulus: ["assets/videos/examples/ex_7_blue.mp4"], correct_response: "3" },
    { stimulus: ["assets/videos/examples/ex_10_green.mp4"], correct_response: "2" },
    { stimulus: ["assets/videos/examples/ex_2_red.mp4"], correct_response: "1" },
  ];

  const timeline = {
    timeline: [fixation, videoTrial, fixation, choiceTrial, answerTrial],
    timeline_variables: trial_videos,
    randomize_order: true, //shuffle videos within blocks
  };

  return timeline;
}

export { createHoneycombBlock, createWalkthroughTrial, createTutorialTrial };
