import { enterFullscreen, exitFullscreen } from "../trials/fullscreen";
import {
  createDebriefTrial,
  finishTrial,
  preloadTrial,
  welcomeTrial,
  consentTrial,
  createEndWalkthroughTrial,
  prolificTrial
} from "../trials/honeycombTrials";
import {
  createHoneycombBlock,
  createWalkthroughTrial,
  createPracticeTrial,
  createStartInstructionsTrial,
  createEndInstructionsTrial,
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
  const startInstructionsTrial = await createStartInstructionsTrial(jsPsych);  
  const endInstructionsTrial = await createEndInstructionsTrial(jsPsych);  
  const debriefTrial = await createDebriefTrial(jsPsych);
  
  const timeline = [];
  
  // Always include these trials
  timeline.push(
    welcomeTrial,
    consentTrial,
    enterFullscreen,
    preloadTrial,
    startInstructionsTrial
  );
  
  // Add tutorial-specific trials if in tutorial mode
  if (process.env.REACT_APP_MODE === "tutorial") {
    const walkthroughTrial = createWalkthroughTrial(jsPsych);
    const endWalkthroughTrial = await createEndWalkthroughTrial(jsPsych);
    const practiceTrial = createPracticeTrial(jsPsych);
    
    timeline.push(
      walkthroughTrial,
      endWalkthroughTrial,
      practiceTrial
    );
  }
  
  // Always include these trials
  timeline.push(
    endInstructionsTrial,
    honeycombTrials,
    debriefTrial,
    prolificTrial,
    finishTrial,
    exitFullscreen
  );
  
  return timeline;
}

export { createHoneycombTimeline };
