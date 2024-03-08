import jsPsychVideoKeyboardResponse from "@jspsych/plugin-video-keyboard-response";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";

// import { fixation } from "@brown-ccv/behavioral-task-trials";

// import { config, taskSettings } from "../config/main";
// import { taskSettings } from "../config/main";

async function createHoneycombBlock(jsPsych) {
  // const { fixation: fixationSettings } = taskSettings;

  const fetchVideoData = async () => {
    try {
      // Update the server URL to the one you're using (e.g., http://localhost:3000 if that's where your server is running)
      const response = await fetch("http://localhost:3001/api/videos");
      console.log(response, "response");
      const data = await response.json();
      // Use the data.videos array as needed in your application
      return data.videos;
    } catch (error) {
      console.error("Error fetching video data:", error);
    }
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

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 1000,
    data: {
      task: "fixation",
    },
  };

  const blockFixationTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">block fixation</div>',
    choices: "NO_KEYS",
    trial_duration: 2000,
    data: {
      task: "block fixation",
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
    duration: 2000,
    choices: ["1", "2", "3"],
    data: {
      task: "response",
      correct_response: jsPsych.timelineVariable("correct_response"),
    },
    on_finish: function (data) {
      data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
      console.log(data.correct);
    },
  };

  const videoBlocks = await fetchVideoData(); //blocks already return shuffled
  console.log(videoBlocks, "videoBlocks");
  let blockTimeline = [];
  for (const [index, videoBlock] of videoBlocks.entries()) {
    var trial_videos = videoBlock;
    console.log(trial_videos, "trial_videos");
    const videoProcedure = {
      timeline: [fixation, videoTrial, fixation, choiceTrial],
      timeline_variables: trial_videos,
      randomize_order: true, //shuffle videos within blocks
    };
    if (index !== 0) {
      blockTimeline.push(blockFixationTrial);
    }
    blockTimeline.push(videoProcedure);
  }
  // blockTimeline = [blockTimeline[2]];
  const honeycombBlock = {
    timeline: blockTimeline, //should be set of 5 fixations+videoProcedures
  };

  return honeycombBlock;
}

export { createHoneycombBlock };
