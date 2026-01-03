import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
  answer?: boolean;
}

const grammar: { [index: string]: GrammarEntry } = {
  // Names
  vlad: { person: "Vladislav Maraev" },
  emma: { person: "Emma Watson" },
  john: { person: "John Doe" },
  david: { person: "David Brown" },
  michael: { person: "Michael Davis" },
  jennifer: { person: "Jennifer Martinez" },
  // Days
  monday: { day: "Monday" },
  friday: { day: "Friday" },
  tuesday: { day: "Tuesday" },
  // Times
  "9": { time: "9:00" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
  "12": { time: "12:00" },
  "9 am": { time: "9:00" },
  "10 am": { time: "10:00" },
  "11 am": { time: "11:00" },
  "12 pm": { time: "12:00" },
  "nine": { time: "9:00" },
  "ten": { time: "10:00" },
  "eleven": { time: "11:00" },
  "twelve": { time: "12:00" },
  // Yes/No 
  yes: { answer: true },
  no: { answer: false },
  "of course": { answer: true },
  sure: { answer: true },
  right: { answer: true },
  "no way": { answer: false },
  wrong: { answer: false },
};

function getPerson(utterance: string) {
  const normalized = utterance.toLowerCase().trim();
  // matching
  if (grammar[normalized]?.person) {
    return grammar[normalized].person;
  }
  // matching
  for (const [key, value] of Object.entries(grammar)) {
    if (value.person) {
      const keyLower = key.toLowerCase();
      if (normalized.includes(keyLower) || keyLower.includes(normalized)) {
        return value.person;
      }
    }
  }
  return undefined;
}

function getDay(utterance: string) {
  const normalized = utterance.toLowerCase().trim();
  // match
  if (grammar[normalized]?.day) {
    return grammar[normalized].day;
  }
  // matching
  for (const [key, value] of Object.entries(grammar)) {
    if (value.day) {
      const keyLower = key.toLowerCase();
      if (normalized.includes(keyLower) || keyLower.includes(normalized)) {
        return value.day;
      }
    }
  }
  return undefined;
}

function getTime(utterance: string) {
  const normalized = utterance.toLowerCase().trim().replace(/\s+/g, " ");
  // matching
  if (grammar[normalized]?.time) {
    return grammar[normalized].time;
  }
  // 
  const noSpaces = normalized.replace(/\s/g, "");
  if (grammar[noSpaces]?.time) {
    return grammar[noSpaces].time;
  }
  // matching
  for (const [key, value] of Object.entries(grammar)) {
    if (value.time) {
      const keyLower = key.toLowerCase();
      // checking
      if (normalized.includes(keyLower) || keyLower.includes(normalized)) {
        return value.time;
      }
      // 
      if (noSpaces.includes(keyLower) || keyLower.includes(noSpaces)) {
        return value.time;
      }
    }
  }
  return undefined;
}

function getAnswer(utterance: string) {
  const normalized = utterance.toLowerCase().trim().replace(/\s+/g, " ");
  // matching
  if (grammar[normalized]?.answer !== undefined) {
    return grammar[normalized].answer;
  }
  // matching
  for (const [key, value] of Object.entries(grammar)) {
    if (value.answer !== undefined) {
      const keyLower = key.toLowerCase();
      // checking
      if (normalized.includes(keyLower) || keyLower.includes(normalized)) {
        return value.answer;
      }
    }
  }
  return undefined;
}

const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: {utterance: params.utterance}, 
      }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({ type: "LISTEN" }),
    "reask": assign({ lastResult: null }),
  },
  guards: {
    isFullDay: ({ context }) => context.fullDay === true,
    isPersonRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) {
        console.log(" isPersonRecognized: Invalid event structure");
        return false;
      }
      const utterance = event.value[0].utterance;
      const person = getPerson(utterance);
      const recognized = !!person;
      console.log(" isPersonRecognized:", utterance, "→", person, "→", recognized);
      return recognized;
    },
    isPersonNotRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) {
        console.log(" isPersonNotRecognized: Invalid event structure, returning true");
        return true;
      }
      const utterance = event.value[0].utterance;
      const person = getPerson(utterance);
      const notRecognized = !person;
      console.log(" isPersonNotRecognized:", utterance, "→", person, "→", notRecognized);
      if (notRecognized) console.log(" Person not recognized, will re-ask:", utterance);
      return notRecognized;
    },
    isDayRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return false;
      const utterance = event.value[0].utterance;
      const day = getDay(utterance);
      return !!day;
    },
    isDayNotRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return true;
      const utterance = event.value[0].utterance;
      const day = getDay(utterance);
      const notRecognized = !day;
      if (notRecognized) console.log(" Guard: isDayNotRecognized - TRUE, will re-ask:", utterance);
      return notRecognized;
    },
    isTimeRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return false;
      const utterance = event.value[0].utterance;
      const time = getTime(utterance);
      return !!time;
    },
    isTimeNotRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return true;
      const utterance = event.value[0].utterance;
      const time = getTime(utterance);
      const notRecognized = !time;
      if (notRecognized) console.log(" Guard: isTimeNotRecognized - TRUE, will re-ask:", utterance);
      return notRecognized;
    },
    isAnswerRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return false;
      const utterance = event.value[0].utterance;
      const answer = getAnswer(utterance);
      return answer !== undefined;
    },
    isAnswerNotRecognized: ({ event }) => {
      if (event.type !== "RECOGNISED" || !("value" in event) || !event.value || !event.value[0]?.utterance) return true;
      const utterance = event.value[0].utterance;
      const answer = getAnswer(utterance);
      const notRecognized = answer === undefined;
      if (notRecognized) console.log(" Guard: isAnswerNotRecognized - TRUE, will re-ask:", utterance);
      return notRecognized;
    },
  },
  delays: {
    SPEAK_TIMEOUT: 5000,
    TTS_DELAY: 500,
    LISTEN_TIMEOUT: 6000,
    LISTEN_START_DELAY: 1000,
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null,
    meetingPerson: "",
    meetingDate: "",
    meetingTime: "",
    fullDay: false, 
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: { CLICK: "Greeting" },
    },
    Greeting: {
      initial: "Start",
      states: {
        Start: {
          entry: { type: "spst.speak", params: { utterance: "Hi Let's create an appointment." } },
          on: { SPEAK_COMPLETE: "AskPerson" },
          after: { SPEAK_TIMEOUT: "AskPerson" },
        },

        AskPerson: {
          initial: "Prompt",
          states: {
            Prompt: {
              entry: [
                () => {
                  console.log(" Speaking: Who are you meeting with?");
                  console.log("   (This is a re-ask because entity was not recognized)");
                },
                { type: "spst.speak", params: { utterance: `Who are you meeting with?` } },
              ],
              on: { SPEAK_COMPLETE: "WaitBeforeListen" },
              after: { SPEAK_TIMEOUT: "WaitBeforeListen" },
            },
            WaitBeforeListen: {
              after: {
                LISTEN_START_DELAY: "Ask",
              },
            },
            Ask: {
              entry: [
                () => console.log(" Ask state entered - starting to listen..."),
                { type: "spst.listen" },
              ],
              on: {
                RECOGNISED: [
                  {
                    guard: "isPersonRecognized",
                    actions: assign(({ event }) => {
                      const person = getPerson(event.value[0].utterance);
                      console.log(" Person recognized:", person);
                      return { lastResult: event.value, meetingPerson: person || "" };
                    }),
                    target: "#DM.Greeting.WaitBeforeAskDate",
                  },
                  {
                    guard: "isPersonNotRecognized",
                    actions: [
                      "reask",
                      ({ event }) => {
                        const utterance = event.value?.[0]?.utterance || "unknown";
                        const person = getPerson(utterance);
                        console.log(" Person not in grammar, re-asking:", utterance);
                        console.log("   getPerson returned:", person);
                        console.log("   Transitioning to AskPerson.Prompt...");
                      },
                    ],
                    target: "#DM.Greeting.AskPerson.Prompt",
                  },
                ],
                ASR_NOINPUT: {
                  actions: [
                    "reask",
                    () => console.log(" ASR_NOINPUT - no input detected, re-asking..."),
                  ],
                  target: "#DM.Greeting.AskPerson.Prompt",
                },
              },
              after: {
                LISTEN_TIMEOUT: {
                  actions: [
                    "reask",
                    () => console.log(" LISTEN_TIMEOUT - timeout, re-asking..."),
                  ],
                  target: "#DM.Greeting.AskPerson.Prompt" ,
                },
              },
            },
          },
        },

        WaitBeforeAskDate: {
          after: {
            TTS_DELAY: "#DM.Greeting.AskDate",
          },
        },

        AskDate: {
          initial: "Prompt",
          states: {
            Prompt: {
              entry: [
                () => console.log(" Re-asking: On which day is your meeting?"),
                { type: "spst.speak", params: { utterance: `On which day is your meeting?` } },
              ],
              on: { SPEAK_COMPLETE: "WaitBeforeListen" },
              after: { SPEAK_TIMEOUT: "WaitBeforeListen" },
            },
            WaitBeforeListen: {
              after: {
                LISTEN_START_DELAY: "Ask",
              },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: "isDayRecognized",
                    actions: assign(({ event }) => {
                      const day = getDay(event.value[0].utterance);
                      return { lastResult: event.value, meetingDate: day || "" };
                    }),
                    target: "#DM.Greeting.WaitBeforeAskFullDay",
                  },
                  {
                    guard: "isDayNotRecognized",
                    actions: [
                      "reask",
                      ({ event }) => {
                        const utterance = event.value?.[0]?.utterance || "unknown";
                        console.log(" Day not in grammar, re-asking:", utterance);
                      },
                    ],
                    target: "#DM.Greeting.AskDate.Prompt",
                  },
                ],
                ASR_NOINPUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskDate.Prompt",
                },
              },
              after: {
                LISTEN_TIMEOUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskDate.Prompt",
                },
              },
            },
          },
        },

        WaitBeforeAskFullDay: {
          after: {
            TTS_DELAY: "#DM.Greeting.AskFullDay",
          },
        },

        AskFullDay: {
          initial: "Prompt",
          states: {
            Prompt: {
              entry: [
                () => console.log(" Re-asking: Will it take the whole day?"),
                { type: "spst.speak", params: { utterance: `Will it take the whole day?` } },
              ],
              on: { SPEAK_COMPLETE: "WaitBeforeListen" },
              after: { SPEAK_TIMEOUT: "WaitBeforeListen" },
            },
            WaitBeforeListen: {
              after: {
                LISTEN_START_DELAY: "Ask",
              },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: "isAnswerRecognized",
                    actions: assign(({ event }) => {
                      const answer = getAnswer(event.value[0].utterance);
                      return answer !== undefined 
                        ? { lastResult: event.value, fullDay: !!answer }
                        : { lastResult: null };
                    }),
                    target: "#DM.Greeting.ConditionalTime",
                  },
                  {
                    guard: "isAnswerNotRecognized",
                    actions: [
                      "reask",
                      ({ event }) => {
                        const utterance = event.value?.[0]?.utterance || "unknown";
                        console.log(" Answer not in grammar, re-asking:", utterance);
                      },
                    ],
                    target: "#DM.Greeting.AskFullDay.Prompt",
                  },
                ],
                ASR_NOINPUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskFullDay.Prompt",
                },
              },
              after: {
                LISTEN_TIMEOUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskFullDay.Prompt",
                },
              },
            },
          },
        },

        ConditionalTime: {
          always: [
            { target: "#DM.Greeting.ConfirmFullDay", guard: "isFullDay" },
            { target: "#DM.Greeting.WaitBeforeAskTime" },
          ],
        },

        WaitBeforeAskTime: {
          after: {
            TTS_DELAY: "#DM.Greeting.AskTime",
          },
        },

        AskTime: {
          initial: "Prompt",
          states: {
            Prompt: {
              entry: [
                () => console.log(" Re-asking: What time is your meeting?"),
                { type: "spst.speak", params: { utterance: `What time is your meeting?` } },
              ],
              on: { SPEAK_COMPLETE: "WaitBeforeListen" },
              after: { SPEAK_TIMEOUT: "WaitBeforeListen" },
            },
            WaitBeforeListen: {
              after: {
                LISTEN_START_DELAY: "Ask",
              },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: "isTimeRecognized",
                    actions: assign(({ event }) => {
                      const time = getTime(event.value[0].utterance);
                      return { lastResult: event.value, meetingTime: time || "" };
                    }),
                    target: "#DM.Greeting.WaitBeforeConfirmAppointment",
                  },
                  {
                    guard: "isTimeNotRecognized",
                    actions: [
                      "reask",
                      ({ event }) => {
                        const utterance = event.value?.[0]?.utterance || "unknown";
                        console.log(" Time not in grammar, re-asking:", utterance);
                        console.log(" Transitioning to AskTime.Prompt...");
                      },
                    ],
                    target: "#DM.Greeting.AskTime.Prompt",
                  },
                ],
                ASR_NOINPUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskTime.Prompt",
                },
              },
              after: {
                LISTEN_TIMEOUT: {
                  actions: "reask",
                  target: "#DM.Greeting.AskTime.Prompt",
                },
              },
            },
          },
        },

        WaitBeforeConfirmAppointment: {
          after: {
            TTS_DELAY: "#DM.Greeting.ConfirmAppointment",
          },
        },

        ConfirmFullDay: {
          entry: {
            type: "spst.speak",
            params: ({ context }) => ({
              utterance: `Do you want me to create an appointment with ${context.meetingPerson} on ${context.meetingDate} for the whole day?`,
            }),
          },
          on: { SPEAK_COMPLETE: "ConfirmationListen" },
          after: {
            SPEAK_TIMEOUT: "ConfirmationListen",
          },
        },

        ConfirmAppointment: {
          entry: [
            ({ context }) => console.log(" Confirming appointment:", context.meetingPerson, context.meetingDate, context.meetingTime),
            {
              type: "spst.speak",
              params: ({ context }) => ({
                utterance: `Do you want me to create an appointment with ${context.meetingPerson} on ${context.meetingDate} at ${context.meetingTime}?`,
              }),
            },
          ],
          on: { SPEAK_COMPLETE: "ConfirmationListen" },
          after: { SPEAK_TIMEOUT: "ConfirmationListen" },
        },

        ConfirmationListen: {
          initial: "WaitBeforeListen",
          entry: () => console.log(" Entering ConfirmationListen"),
          states: {
            WaitBeforeListen: {
              after: {
                TTS_DELAY: "Ask",
              },
            },
            Ask: {
              entry: [
                () => console.log(" Starting to listen for confirmation..."),
                { type: "spst.listen" },
              ],
              on: {
                RECOGNISED: [
                  {
                    guard: "isAnswerRecognized",
                    actions: assign(({ event }) => {
                      const utterance = event.value?.[0]?.utterance || "";
                      const answer = getAnswer(utterance);
                      console.log(" Received:", utterance, "Answer:", answer);
                      return answer !== undefined ? { lastResult: event.value } : { lastResult: null };
                    }),
                    target: "#DM.Greeting.WaitBeforeFinalConfirmation",
                  },
                  {
                    guard: "isAnswerNotRecognized",
                    actions: [
                      "reask",
                      ({ event }) => {
                        const utterance = event.value?.[0]?.utterance || "unknown";
                        console.log(" Answer not recognized, re-asking:", utterance);
                      },
                    ],
                    target: "#DM.Greeting.ConfirmationListen.Ask",
                  },
                ],
                ASR_NOINPUT: {
                  actions: ["reask", () => console.log(" No input in confirmation, re-asking...")],
                  target: "#DM.Greeting.ConfirmationListen.Ask",
                },
              },
              after: {
                LISTEN_TIMEOUT: {
                  actions: ["reask", () => console.log(" Confirmation timeout, re-asking...")],
                  target: "#DM.Greeting.ConfirmationListen.Ask",
                },
              },
            },
          },
        },

        WaitBeforeFinalConfirmation: {
          after: {
            TTS_DELAY: "#DM.Greeting.FinalConfirmation",
          },
        },

        FinalConfirmation: {
          entry: [
            () => console.log(" Speaking final confirmation..."),
            {
              type: "spst.speak",
              params: { utterance: "Your appointment has been created." },
            },
          ],
          on: { SPEAK_COMPLETE: "Done" },
          after: { SPEAK_TIMEOUT: "Done" },
        },

        Done: {
          on: { CLICK: "#DM.Greeting.AskPerson" },
        },
      },
    },
  },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

// ---
dmActor.subscribe((state) => {
  const stateStr = JSON.stringify(state.value);
  if (stateStr.includes("ConfirmationListen") || stateStr.includes("FinalConfirmation") || 
      stateStr.includes("Prompt") || stateStr.includes("AskTime") || stateStr.includes("AskDate") || 
      stateStr.includes("AskPerson") || stateStr.includes("AskFullDay")) {
    console.log(" State:", stateStr);
  }
});

// ----
const originalSend = dmActor.send.bind(dmActor);
dmActor.send = function(event: any) {
  if (event.type === "RECOGNISED" || event.type === "ASR_NOINPUT" || event.type === "LISTEN_TIMEOUT") {
    console.log(" Event received:", event.type, event.value ? `utterance: "${event.value[0]?.utterance || 'N/A'}"` : "");
  }
  return originalSend(event);
};


export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
  
  dmActor.subscribe((snapshot) => {
    const spstSnapshot = snapshot.context.spstRef.getSnapshot();
    spstSnapshot.subscribe((spstState: any) => {
      
      if (spstState.event && (spstState.event.type === "RECOGNISED" || spstState.event.type === "ASR_NOINPUT")) {
        console.log(" Speechstate event:", spstState.event.type, spstState.event.value?.[0]?.utterance || "");
      }
    });
  });
}

