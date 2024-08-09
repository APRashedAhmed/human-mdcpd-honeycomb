import { enterFullscreen, exitFullscreen } from "../trials/fullscreen";
import {
  createDebriefTrial,
  finishTrial,
  preloadTrial,
  welcomeTrial,
  consentTrial,
  prolificTrial
} from "../trials/honeycombTrials";
import {
  createHoneycombBlock,
  createWalkthroughTrial,
  createPracticeTrial,
  createStartInstructionsTrial,
  createEndInstructionsTrial,
  createEndWalkthroughTrial
} from "./honeycombBlock";

async function createHoneycombTimeline(jsPsych) {
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
    const walkthroughTrial = await createWalkthroughTrial(jsPsych);
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
    exitFullscreen,
    prolificTrial,
    finishTrial
  );
  
  return timeline;
}

export { createHoneycombTimeline };
