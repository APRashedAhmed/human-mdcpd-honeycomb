import { showMessage } from "@brown-ccv/behavioral-task-trials";
import htmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import instructionsResponse from "@jspsych/plugin-instructions";
import jsPsychPreload from '@jspsych/plugin-preload';
import jsPsychExternalHtml from '@jspsych/plugin-external-html';
import { addToFirebase } from '../App/deployments/firebase';

import { config, language } from "../config/main";
// import { config, language, taskSettings } from "../config/main";
// import { div, p, b } from "../lib/markup/tags";
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

// var check_consent = function() {
//     if (document.getElementById('consent_checkbox').checked) {
//         return true;
//     }
//     else {
//         alert("If you wish to participate, you must check the 'I agree' box.");
//         return false;
//     }
// };

var consentTrial = {
  type: jsPsychExternalHtml,
  url: "assets/consent_forms/onlineConsentAMTprolific.html",
  cont_btn: "brown-consent-button",
  // check_fn: check_consent
};

const instructionsTrial = {
  type: instructionsResponse,
  pages: [
    p(honeycombLanguage.instructions.read),
    p(honeycombLanguage.instructions.details),
    // // Add a page for very possible stimuli - displays the image and the correct response
    // ...taskSettings.honeycomb.timeline_variables.map(({ stimulus, correct_response }) => {
    //   // Pull the color out of the file name
    //   const color = stimulus;

    //   // Build the instructions and image elements
    //   const instructionsMarkup = p(
    //     honeycombLanguage.instructions.example.start +
    //       b(color, color ? { style: `color: ${color};` } : {}) +
    //       honeycombLanguage.instructions.example.middle +
    //       b(correct_response) +
    //       honeycombLanguage.instructions.example.end
    //   );

    //   return div(instructionsMarkup);
    // }),
    // // process.env.REACT_APP_MODE === "spacebar" && p(honeycombLanguage.instructions.spacebar),

    process.env.REACT_APP_MODE === "tutorial"
      ? p(honeycombLanguage.instructions.nextTutorial)
      : p(honeycombLanguage.instructions.next),
  ],
  show_clickable_nav: true,
  post_trial_gap: 500,
};

async function fetchHtmlContentIfNeeded(content) {
  // Check if the content is a path to an HTML file
  if (content.endsWith('.html')) {
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch content from ${content}`);
    }
    return await response.text();
  }
  // If not a path, return the content as is
  return p(content);
}

async function createEndWalkthroughTrial() {
  const endWalkthrough = await fetchHtmlContentIfNeeded(honeycombLanguage.walkthrough.endWalkthrough);
  const endWalkthroughTrial = {
    type: instructionsResponse,
    pages: [endWalkthrough],
    show_clickable_nav: true,
  post_trial_gap: 500,
  };
  return endWalkthroughTrial
};


// const endWalkthroughTrial = {
//   type: instructionsResponse,
//   pages: [p(honeycombLanguage.endWalkthrough.instructions)],
//   show_clickable_nav: true,
//   post_trial_gap: 500,
// };

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
  
//   type: preloadResponse,
//   message: p(language.prompts.settingUp),
//   images: taskSettings.honeycomb.timeline_variables.map(({ stimulus }) => stimulus),
// };
// TODO #281: Function for preloading all files in public/images?

const createDebriefTrial = (jsPsych) => ({
  type: htmlKeyboardResponse,
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

    const accuracyMarkup = p(
      debriefLanguage.accuracy.start + accuracy + debriefLanguage.accuracy.end
    );
    // const reactionTimeMarkup = p(
    //   debriefLanguage.reactionTime.start + reactionTime + debriefLanguage.reactionTime.end
    // );
    const completeMarkup = p(debriefLanguage.complete);

    // Display the accuracy, reaction time, and complete message as 3 paragraphs in a row
    return accuracyMarkup + completeMarkup;
  },
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
          // accuracy: data.accuracy,
          // reaction_time: data.reactionTime,
          // timestamp: new Date()
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


// /** Trial that calculates and displays some results of the session  */
// const createDebriefTrial = (jsPsych) => ({
//   type: htmlKeyboardResponse,
//   // stimulus: () => {
//   stimulus: async () => {
//     // Note that we need the jsPsych instance to aggregate the data
//     const responseTrials = jsPsych.data.get().filter({ task: "response" });
//     const correct_trials = responseTrials.filter({ correct: true });
//     const accuracy = Math.round((correct_trials.count() / responseTrials.count()) * 100);
//     const reactionTime = Math.round(correct_trials.select("rt").mean());

//     const debriefLanguage = honeycombLanguage.debrief;

//     const accuracyMarkup = p(
//       debriefLanguage.accuracy.start + accuracy + debriefLanguage.accuracy.end
//     );
//     const reactionTimeMarkup = p(
//       debriefLanguage.reactionTime.start + reactionTime + debriefLanguage.reactionTime.end
//     );
//     const completeMarkup = p(debriefLanguage.complete);


//     // Prepare data to save
//     const sessionData = jsPsych.data.get().json();
//     const parsedSessionData = JSON.parse(sessionData);
//     console.log("sessionData", sessionData)    
//     console.log("parsedSessionData", parsedSessionData)    
//     console.log("jspsych", jsPsych)

//     if (process.env.REACT_APP_MODE === "firebase") {
//       // Save data to Firestore
//       try {
//         const data = {
//           study_id: jsPsych.data.dataProperties.study_id,
//           participant_id: jsPsych.data.dataProperties.participant_id,
//           start_date: jsPsych.data.dataProperties.start_date,
//           session_data: JSON.parse(sessionData),
//           accuracy: accuracy,
//           reaction_time: reactionTime,
//           timestamp: new Date()
//         };
//         console.log("data", data);
//         await addToFirebase(data);
//         console.log("Data added to Firebase");
//       } catch (e) {
//         console.error("Error adding document to Firebase: ", e);
//       }
//     }

//     if (process.env.REACT_APP_MODE === "dev") {
//       // Save data locally
//       jsPsych.data.get().localSave("csv", "tutorial_experiment.csv");
//     }
    
//     // Display the accuracy, reaction time, and complete message as 3 paragraphs in a row
//     return accuracyMarkup + reactionTimeMarkup + completeMarkup;
//   },
//   data: {
//     task: "Final Debrief",
//   },
// });

/** Trial that displays a completion message for 5 seconds */
const finishTrial = showMessage(config, {
  duration: 5000,
  message: honeycombLanguage.finish,
});

const prolificTrial = {
  type: htmlKeyboardResponse,
  stimulus: "<p><a href=\"https://app.prolific.com/submissions/complete?cc=C11E3656\">Click here to return to Prolific and complete the study</a>.</p>",
  choices: "NO_KEYS"
};

export {
  createDebriefTrial,
  finishTrial,
  instructionsTrial,
  preloadTrial,
  welcomeTrial,
  // endWalkthroughTrial,
  endPracticeTrial,  
  consentTrial,
  createEndWalkthroughTrial,
  prolificTrial
};
