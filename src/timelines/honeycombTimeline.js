import { enterFullscreen, exitFullscreen } from "../trials/fullscreen";
import {
  createDebriefTrial,
  endWalkthroughTrial,
  finishTrial,
  // instructionsTrial,
  preloadTrial,
  welcomeTrial,
  consentTrial,
  endPracticeTrial,  
} from "../trials/honeycombTrials";
import {
  createHoneycombBlock,
  createWalkthroughTrial,
  createPracticeTrial,
  createInstructionsTrial,
} from "./honeycombBlock";

/**
 * This timeline builds the example reaction time task from the jsPsych tutorial.
 * Take a look at how the code here compares to the jsPsych documentation!
 *
 * See the jsPsych documentation for more: https://www.jspsych.org/7.3/tutorials/rt-task/
 */
async function createHoneycombTimeline(jsPsych) {
  // jsPsych.setProgressBar(0);
  const honeycombTrials = await createHoneycombBlock(jsPsych);
  const instructionsTrial = await createInstructionsTrial(jsPsych);  
  const walkthroughTrial = createWalkthroughTrial(jsPsych);
  const practiceTrial = createPracticeTrial(jsPsych);
  const debriefTrial = createDebriefTrial(jsPsych);
  
  const timeline = [];
  
  // Always include these trials
  timeline.push(
    welcomeTrial,
    consentTrial,
    enterFullscreen,
    preloadTrial,
    instructionsTrial
  );
  
  // Add tutorial-specific trials if in tutorial mode
  if (process.env.REACT_APP_MODE === "tutorial") {
    timeline.push(
      walkthroughTrial,
      endWalkthroughTrial,
      practiceTrial,
      endPracticeTrial
    );
  }
  
  // Always include these trials
  timeline.push(
    honeycombTrials,
    debriefTrial,
    finishTrial,
    exitFullscreen
  );
  
  return timeline;
}

export { createHoneycombTimeline };
