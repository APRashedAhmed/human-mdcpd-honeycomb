import jsPsychVideoKeyboardResponse from "@jspsych/plugin-video-keyboard-response";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response';
import jsPsychVideoButtonResponse from '@jspsych/plugin-video-button-response';
import jsPsychPreload from '@jspsych/plugin-preload';
import instructionsResponse from "@jspsych/plugin-instructions";
import Papa from 'papaparse';

// import { fixation } from "@brown-ccv/behavioral-task-trials";

// import { config, taskSettings } from "../config/main";
import { language, taskSettings } from "../config/main";
import { p, b, div, body } from "../lib/markup/tags";
import videoPaths from '../videoPaths.json';

// import { taskSettings } from "../config/main";
const honeycombLanguage = language.trials.honeycomb;


async function fetchHtmlContentIfNeeded(content) {
  // Check if the content is a path to an HTML file
  if (content.endsWith('.html')) {
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch content from ${content}`);
    }
    return await response.text();
  }
  // If not a path, return the content as is
  return p(content);
}

async function createHoneycombBlock(jsPsych) {
  // const { fixation: fixationSettings } = taskSettings;

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
  
  // const completeMarkup = await fetchHtmlContentIfNeeded(debriefLanguage.completeBlock);
  const debriefTrial = (jsPsych) => ({
    type: jsPsychHtmlButtonResponse,
    // type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      //add language "if you need to take a break..., the next one will run for ~8min"
      const responseTrials = jsPsych.data.get().filter({ task: "response" });
      const correct_trials = responseTrials.filter({ correct: true });
      let accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
      const debriefLanguage = honeycombLanguage.debrief;
      if (isNaN(accuracy)) {
	accuracy = 0;
      } 
      
      // const reactionTime = Math.round(correct_trials.select("rt").mean());
      const header = debriefLanguage.header;
      const accuracyMarkup = p(
        debriefLanguage.accuracy.start + b(accuracy) + debriefLanguage.accuracy.end
      );
      const breakMarkup = p(debriefLanguage.takeBreak);
      const completeBlockMarkup = p(debriefLanguage.completeBlock);
      
      return header + body(div(accuracyMarkup + breakMarkup + completeBlockMarkup, { class: "container" }));
    },
    choices: ["Continue"],
    data: {
      task: "Block Debrief",
    },
  });

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    // stimulus: '<div style="font-size:60px;">+</div>',
    stimulus: ' ',
    choices: "NO_KEYS",
    trial_duration: 250,
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
                  <span style='color: red; margin-right: 5px;'  >(1) <b>Red</b><br></span>
                  <span style='color: green; margin-left: 15px;'>(2) <b>Green</b><br></span>
                  <span style='color: blue;'                    >(3) <b>Blue</b><br></span>
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
// async function createStartInstructionsTrial() {
//   // Fetch the content for each instruction page
//   const readContent = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.read);
//   const detailsContent = await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.details);
//   const nextContent = process.env.REACT_APP_MODE === "tutorial"
//     ? await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.nextTutorial)
//     : await fetchHtmlContentIfNeeded(honeycombLanguage.instructions.next);

//   // Create the instructions trial with the fetched content
//   const instructionsTrial = {
//     type: instructionsResponse,
//     pages: [
//       readContent,
//       detailsContent,
//       nextContent,
//     ],
//     show_clickable_nav: true,
//     post_trial_gap: 500,
//   };

//   return instructionsTrial;
// }

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
function createWalkthroughTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    // stimulus: '<div style="font-size:60px;">+</div>',
    stimulus: ' ',
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
    controls: true
    // prompt: function () {
    //   return `<div style="position: fixed; top: 50%; left: 25%; transform: translate(-50%, -50%); color: black; font-size: 24px; z-index: 100;">
    //               ${jsPsych.timelineVariable("text")}
    //           </div>`;
    // },
  };

  const choiceTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      let choices = `
              <div style='text-align: center;'>
                  <span style='color: red; margin-right: 5px;'  >(1) <b>Red</b><br></span>
                  <span style='color: green; margin-left: 15px;'>(2) <b>Green</b><br></span>
                  <span style='color: blue;'                    >(3) <b>Blue</b><br></span>
              </div>`;
      return "<div>" + question + choices + "</div>";
    },
    // trial_duration: 10000,
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
      stimulus: ["assets/videos/walkthrough/1_demonstrate_task_physics_and_color_green.mp4"],
      correct_response: "2",
      text: honeycombLanguage.walkthrough.video_1,
    },
    {
      stimulus: ["assets/videos/walkthrough/2_lower_number_of_changes_red.mp4"],
      correct_response: "1",
      text: honeycombLanguage.walkthrough.video_2,
    },
    {
      stimulus: ["assets/videos/walkthrough/3_higher_number_of_changes_blue.mp4"],
      correct_response: "3",
      text: honeycombLanguage.walkthrough.video_3,
    },
    {
      stimulus: ["assets/videos/walkthrough/4_introduce_the_grayzone_red.mp4"],
      correct_response: "1",
      text: honeycombLanguage.walkthrough.video_4,
    },
    {
      stimulus: ["assets/videos/walkthrough/5_videos_end_in_the_grayzone_green.mp4"],
      correct_response: "2",
      text: honeycombLanguage.walkthrough.video_5,
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
function createPracticeTrial(jsPsych) {
  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: ' ',
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
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      let question = "<p>What color was the ball at the end of the video?<p>";
      let choices = `
              <div style='text-align: center;'>
                  <span style='color: red; margin-right: 5px;'  >(1) <b>Red</b><br></span>
                  <span style='color: green; margin-left: 15px;'>(2) <b>Green</b><br></span>
                  <span style='color: blue;'                    >(3) <b>Blue</b><br></span>
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

export {
  createHoneycombBlock,
  createWalkthroughTrial,
  createPracticeTrial,
  createStartInstructionsTrial,
  createEndInstructionsTrial
};
