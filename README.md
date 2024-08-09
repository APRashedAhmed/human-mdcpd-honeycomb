# Human Multidimensional Changepoint Detection Task

See the [Honeycomb Documentation](https://brown-ccv.github.io/honeycomb-docs/) page 
for details on how to use the honeycomb ecosystem.

## Getting Started

### Running Locally

The task is setup to run on Firebase but can be run locally for development purposes.
To do this you will need two terminals, one to run the task and the other to run 
the firebase emulator.

In one terminal, run the following:
```bash
npm run dev:firebase
```

If your code has no issues, it should say that webpack compiled successfully. In 
another terminal:
```bash
npm run firebase:emulators:start
```

Due to the firestore rules (as of v1.0.0 of the task), you will need to modify
the database for the task to run properly. The emulator should havs started a UI
in http://127.0.0.1:4000/firestore, so navigate to this page. Click on `registered_studies`
on the left, then click on `Add document`, and then fill it out as shown below:

![Add document](assets/images/add_document.png)

Under `Document ID` enter "all_studies", for `Field`, enter "registered_studies", 
set `Type` to be `array`, then click on the `+` symbol and add a `string` with 
`Value` set to "s1". Finally, click on `Save`. The resulting page should look
like this:

![firestore](assets/images/firestore.png)

<!-- ###  -->

<!-- ## Starting a development server -->

<!-- To get started running a local development server, you'll need to run these few commands (**note that you'll need two separate terminal windows open**): -->

<!-- `cd src` + `node server.js` _(assuming you're in the root directory)_ -->

<!-- `npm run dev` _(assuming you're in root directory)_ -->

<!-- This should start a live development server where you can freely make updates/changes which are reflected immediately -->

<!-- To run an alternative version of the experiment that requires you to click the spacebar on color changes, use the following commands: -->

<!-- `cd src` + `node server.js` _(assuming you're in the root directory)_ -->

<!-- `npm run dev:spacebar` _(assuming you're in root directory)_ -->

<!-- To run an alternative version of the experiment with a short **tutorial** at the beginning consisting of 5 videos, use the following commands: -->

<!-- `cd src` + `node server.js` _(assuming you're in the root directory)_ -->

<!-- `npm run dev:tutorial` _(assuming you're in root directory)_ -->

