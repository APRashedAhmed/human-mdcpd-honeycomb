import { config } from "../config/main";
import { cameraEnd, cameraStart } from "../trials/camera";
import { deviceExitTrial } from "../trials/honeycombTrials";
import { createHoneycombTimeline } from "./honeycombTimeline";

/**
 * Experiment-wide settings for jsPsych: https://www.jspsych.org/7.3/overview/experiment-options/
 * Note that Honeycomb combines these with other options required for Honeycomb to operate correctly
 */
const jsPsychOptions = {
  on_trial_finish: (data) => console.log(`Trial ${data.internal_node_id} just finished:`, data),
};

/**
 * Builds the experiment's timeline that jsPsych will run
 * The instance of jsPsych passed in will include jsPsychOptions from above
 * @param {Object} jsPsych The jsPsych instance that is running the experiment
 * @param {string} studyID The ID of the study that was just logged into
 * @param {string} participantID The ID of the participant that was just logged in
 * @returns The timeline for JsPsych to run
 */
async function buildTimeline(jsPsych, studyID, participantID) {
  console.log(`Building timeline for participant ${participantID} on study ${studyID}`);
  if (navigator.platform == "iPhone") {
    console.log("Mobile device detected, exiting program.");
    return [deviceExitTrial];
  }
  const timeline = await createHoneycombTimeline(jsPsych);
  // Dynamically adds the camera trials to the experiment if config.USE_CAMERA
  if (config.USE_CAMERA) {
    timeline.unshift(cameraStart(jsPsych)); // Add cameraStart as the first trial
    timeline.push(cameraEnd(5000)); // Add cameraEnd as the last trial
  }

  return timeline;
}

export { buildTimeline, jsPsychOptions };
