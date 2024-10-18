import { enterFullscreen, exitFullscreen } from "../trials/fullscreen";
import {
  welcomeTrial,
  consentTrial,
  preloadTrial,
  prolificTrial,
  finishTrial,
} from "../trials/honeycombTrials";
import {
  createStartInstructionsTrial,
  createEndInstructionsTrial,
  createWalkthroughTrial,
  createEndWalkthroughTrial,
  createPracticeTrial,
  createHoneycombBlock,
  createDebriefTrial,
} from "./honeycombBlock";

async function createHoneycombTimeline(jsPsych) {
  const honeycombTrials = await createHoneycombBlock(jsPsych);
  const debriefTrial = await createDebriefTrial(jsPsych);

  const timeline = [welcomeTrial];

  // Add these trials for all modes that aren't the end mode
  if (process.env.REACT_APP_END !== "true") {
    const startInstructionsTrial = await createStartInstructionsTrial(jsPsych);

    timeline.push(consentTrial, enterFullscreen, preloadTrial, startInstructionsTrial);
  }

  // Add tutorial-specific trials if in tutorial mode
  if (process.env.REACT_APP_MODE === "tutorial") {
    const walkthroughTrial = await createWalkthroughTrial(jsPsych);
    const endWalkthroughTrial = await createEndWalkthroughTrial(jsPsych);
    const practiceTrial = createPracticeTrial(jsPsych);

    timeline.push(walkthroughTrial, endWalkthroughTrial, practiceTrial);
  }

  // Skip if we are only testing the ending
  if (process.env.REACT_APP_END !== "true") {
    const endInstructionsTrial = await createEndInstructionsTrial(jsPsych);

    timeline.push(endInstructionsTrial);
  }

  // Always include these trials
  timeline.push(honeycombTrials, debriefTrial, exitFullscreen, prolificTrial, finishTrial);

  return timeline;
}

export { createHoneycombTimeline };
