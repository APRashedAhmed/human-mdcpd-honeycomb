import { showMessage } from "@brown-ccv/behavioral-task-trials";
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response';
import instructionsResponse from "@jspsych/plugin-instructions";
import jsPsychPreload from '@jspsych/plugin-preload';
import jsPsychExternalHtml from '@jspsych/plugin-external-html';
import { addToFirebase } from '../App/deployments/firebase';

import { config, language } from "../config/main";
import { p, b, div, body } from "../lib/markup/tags";

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
  
const createDebriefTrial = (jsPsych) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    // Note that we need the jsPsych instance to aggregate the data
    const responseTrials = jsPsych.data.get().filter({ task: "response" });
    const correct_trials = responseTrials.filter({ correct: true });
    let accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
    // const reactionTime = Math.round(correct_trials.select("rt").mean());
    const debriefLanguage = honeycombLanguage.debrief;

    if (isNaN(accuracy)) {
      accuracy = 0;
    }

    const header = debriefLanguage.header;    
    const accuracyMarkup = p(
      debriefLanguage.accuracy.experiment.start + b(accuracy) + debriefLanguage.accuracy.experiment.end
    );
    const completeMarkup = p(debriefLanguage.complete);

    // Display the accuracy, reaction time, and complete message as 3 paragraphs in a row
    return header + body(div(accuracyMarkup + completeMarkup, { class: "container" }));
  },
  choices: ["Continue"],  
  on_load: async () => {
    // Prepare data to save
    const sessionData = jsPsych.data.get();
    const sessionDataValues = sessionData.values()[0];
    const study_id = sessionDataValues.study_id;
    const participant_id = sessionDataValues.participant_id;
    const start_date = sessionDataValues.start_date;
	  
    if (process.env.REACT_APP_FIREBASE === "true") {
      // Save data to Firestore
      try {
        const dataToSave = {
          study_id: study_id,
          participant_id: participant_id,
          start_date: start_date,
          session_data: JSON.parse(sessionData.json()),
        };
        await addToFirebase(dataToSave);
        console.log("Data added to Firebase");
      } catch (e) {
        console.error("Error adding document to Firebase: ", e);
      }
    }
    if (process.env.REACT_APP_DEV === "true") {
      jsPsych.data.get().localSave("csv", "tutorial_experiment.csv");
    }
  },
  data: {
    task: "Final Debrief",
  },
});


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
  createDebriefTrial,
  finishTrial,
  preloadTrial,
  welcomeTrial,
  endPracticeTrial,  
  consentTrial,
  prolificTrial,
};
