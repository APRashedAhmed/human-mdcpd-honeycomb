import { enterFullscreen, exitFullscreen } from "../trials/fullscreen";
import {
  createDebriefTrial,
  endWalkthroughTrial,
  finishTrial,
  instructionsTrial,
  preloadTrial,
  welcomeTrial,
  consentTrial,
  endPracticeTrial,  
} from "../trials/honeycombTrials";
import { createHoneycombBlock, createWalkthroughTrial, createPracticeTrial } from "./honeycombBlock";

/**
 * This timeline builds the example reaction time task from the jsPsych tutorial.
 * Take a look at how the code here compares to the jsPsych documentation!
 *
 * See the jsPsych documentation for more: https://www.jspsych.org/7.3/tutorials/rt-task/
 */
async function createHoneycombTimeline(jsPsych) {
  // jsPsych.setProgressBar(0);
  const honeycombTrials = await createHoneycombBlock(jsPsych);
  const walkthroughTrial = createWalkthroughTrial(jsPsych);
  const practiceTrial = createPracticeTrial(jsPsych)
  const debriefTrial = createDebriefTrial(jsPsych);
  const timeline =
	process.env.REACT_APP_MODE === "tutorial"
	? [
          welcomeTrial,
	  consentTrial,
          enterFullscreen,
          preloadTrial,
          instructionsTrial,
          walkthroughTrial,
          endWalkthroughTrial,
          practiceTrial,
	  endPracticeTrial,	  
          honeycombTrials,
          debriefTrial,
          finishTrial,
          exitFullscreen,
        ]
	: [
          welcomeTrial,
	  consentTrial,
          enterFullscreen,
          preloadTrial,
          instructionsTrial,
          honeycombTrials,
          debriefTrial,
          finishTrial,
          exitFullscreen,
	];
  
  return timeline;
}

export { createHoneycombTimeline };
