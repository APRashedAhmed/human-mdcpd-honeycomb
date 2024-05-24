import jsPsychVideoKeyboardResponse from "@jspsych/plugin-video-keyboard-response";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";

// import { fixation } from "@brown-ccv/behavioral-task-trials";

// import { config, taskSettings } from "../config/main";
import { language } from "../config/main";
import { p, b } from "../lib/markup/tags";

// import { taskSettings } from "../config/main";

async function createHoneycombBlock(jsPsych) {
  // const { fixation: fixationSettings } = taskSettings;
  const honeycombLanguage = language.trials.honeycomb;

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
      var proportion_complete = jsPsych.getProgressBarCompleted();
      console.log(proportion_complete);
      jsPsych.setProgressBar(proportion_complete + 1 / 275);

      // jsPsych.data.get().localSave("csv", "tutorial_experiment.csv");
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
      blockTimeline.push(debriefTrial(jsPsych));
    }
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
    choices: ["Enter"],
    trial_ends_after_video: false,
    controls: true,
    response_ends_trial: true,
    prompt: function () {
      return `<div style="position: fixed; width: 200px; top: 50%; left: 25%; transform: translate(-50%, -50%); color: black; font-size: 24px; z-index: 100;">
                  ${jsPsych.timelineVariable("text")}
              </div>`;
    },
  };

  const trial_videos = [
    {
      stimulus: ["assets/videos/tutorial_videos/no_gray_base_transitions_green.mp4"],
      correct_response: "2",
      text: "The ball will change color when bouncing or randomly with certain \
      probabilities. Each video in the task will have different probabilities \
      and you will have to learn these to the best of your ability",
    },
    {
      stimulus: ["assets/videos/tutorial_videos/no_gray_low_change_red.mp4"],
      correct_response: "1",
      text: "Some videos like this one will have a small number of color changes",
    },
    {
      stimulus: ["assets/videos/tutorial_videos/no_gray_high_change_green.mp4"],
      correct_response: "2",
      text: "Other videos like this one will have more spontaneous color changes",
    },
    {
      stimulus: ["assets/videos/tutorial_videos/gray_introduction_blue.mp4"],
      correct_response: "3",
      text: "The actual task will have a gray zone in the middle where you won't\
      be able to see the color. Some videos like this one will have the ball\
      end within the gray zone ",
    },
    {
      stimulus: ["assets/videos/tutorial_videos/gray_outside_end_red.mp4"],
      correct_response: "1",
      text: "Other videos like this one will have the ball end outside of the\
      gray zone",
    },
  ];

  const timeline = {
    timeline: [fixation, videoTrial, fixation],
    timeline_variables: trial_videos,
    randomize_order: false, //shuffle videos within blocks
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
