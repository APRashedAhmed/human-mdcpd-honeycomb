import { showMessage } from "@brown-ccv/behavioral-task-trials";
import instructionsResponse from "@jspsych/plugin-instructions";
import jsPsychPreload from '@jspsych/plugin-preload';
import jsPsychExternalHtml from '@jspsych/plugin-external-html';

import { config, language } from "../config/main";
import { p } from "../lib/markup/tags";

const honeycombLanguage = language.trials.honeycomb;

/**
 * Trial that displays a welcome message and waits for the participant to press a key
 */
const welcomeTrial = {
  type: instructionsResponse,
  pages: [
    p(honeycombLanguage.welcome)
  ],
  show_clickable_nav: true,
};

var consentTrial = {
  type: jsPsychExternalHtml,
  url: "onlineConsentAMTprolific.html",
  cont_btn: "brown-consent-button",
};

const endPracticeTrial = {
  type: instructionsResponse,
  pages: [p(honeycombLanguage.endPractice.instructions)],
  show_clickable_nav: true,
  post_trial_gap: 500,
};

/** Trial that loads all of the stimulus images */
var preloadTrial = {
    type: jsPsychPreload,
    show_progress_bar: true,
    auto_preload: true,    
    message: 'Loading videos, please wait...',
    error_message: 'Failed to load videos. Please check your connection and try again.'
  };

/** Trial that displays a completion message for 5 seconds */
const finishTrial = showMessage(config, {
  duration: 5000,
  message: honeycombLanguage.finish,
});

const prolificTrial = {
  type: jsPsychExternalHtml,
  url: "assets/trials/prolific/complete.html",
};

export {
  finishTrial,
  preloadTrial,
  welcomeTrial,
  endPracticeTrial,  
  consentTrial,
  prolificTrial,
};
