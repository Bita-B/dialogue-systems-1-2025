import { assign, createActor, setup, spawnChild, ActorRefFrom } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY, NLU_KEY } from "./azure";
import { DMContext, DMEvents } from "./types";
import { List } from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common/List";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const azureLanguageCredentials = {
  endpoint: "https://dialogues-systems-languages-resources-labs.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2024-11-15-preview",
  key: NLU_KEY,
  deploymentName: "appointment",
  projectName: "appointment",
};

const SPEAK_TIMEOUT = 5000;

const settings: Settings & { azureLanguageCredentials?: any } = {
  azureLanguageCredentials: azureLanguageCredentials,
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
  donald: { person: "Donald Trump" },
  steve: { person: "Steve Jobs" },
  // Days
  monday: { day: "Monday" },
  // Times
  "9": { time: "9:00" },
  "10": { time: "10:00" },
  "9 am": { time: "9:00" },
  "10 am": { time: "10:00" },
  "nine": { time: "9:00" },
  "ten": { time: "10:00" },
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

function getCelebrityInfo(name: string) {
  const database: { [key: string]: string } = {
    "Emma Watson": "Emma Watson is a British actress famous for playing in Harry Potter.",
    "John Doe": "John Doe is a neighbor of mine.",
    "Vlad Maraev": "Vlad Maraev is a teacher assistant for this course.",
    "Steve Jobs": "Steve Jobs was a co-founder of Apple.",
    "Donald Trump": "Donald Trump is the 45th President of the United States.",
    "Reza Pahlavi": "Reza Pahlavi is the last crown prince of the former Imperial State of Iran.",
  };
  
  const key = Object.keys(database).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? database[key] : `Oh, sorry, I have no idea about ${name}.`;
}


const dmMachine: any = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    "spst.speak": ({ context }: { context: DMContext }, params: { utterance: string }) => {
      console.log("Action spst.speak:", params.utterance);
      return context.spstRef.send({
        type: "SPEAK",
        value: { utterance: params.utterance },
      });
    },
    "spst.listen": ({ context }: { context: DMContext }) =>
      context.spstRef.send({
        type: "LISTEN",
        value: { nlu: true },
      }),
    "reask": assign({ lastResult: null }),
  },
  guards: {
    isIntentCreateMeeting: ({ event }) => {
      const intent = (event as any).nluValue?.topIntent;
      console.log("CreateMeeting guard: Intent =", intent);
      return intent === "CreateMeeting";
    },
    isIntentWhoIs: ({ event }) => {
      const intent = (event as any).nluValue?.topIntent;
      console.log("WhoIs guard: Intent =", intent);
      return intent === "WhoIs";
    },
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null,
    meetingPerson: "",
    meetingDate: "",
    meetingTime: "",
    fullDay: false,
    whoIsPerson: "",
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }: { context: DMContext }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: { on: { CLICK: "HandleIntent" } },
    HandleIntent: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: "isIntentCreateMeeting",
            actions: assign(({ event }: any) => {
              console.log("Full NLU Value:", JSON.stringify(event.nluValue, null, 2));
              let person = event.nluValue?.entities?.person?.[0]?.text ||
                event.nluValue?.entities?.meetingPerson?.[0]?.text;
              let date = event.nluValue?.entities?.date?.[0]?.text ||
                event.nluValue?.entities?.meetingDate?.[0]?.text;
              let time = event.nluValue?.entities?.time?.[0]?.text ||
                event.nluValue?.entities?.meetingTime?.[0]?.text;

              
              if (!person || !date || !time) {
                const utterance = event.value?.[0]?.utterance || "";
                
                const meetingMatch = utterance.match(/with\s+([A-Za-z\s]+?)\s+on\s+([A-Za-z\s]+?)\s+at\s+([0-9\s:amp]+)/i);
                if (meetingMatch) {
                  if (!person) person = meetingMatch[1].trim();
                  if (!date) date = meetingMatch[2].trim();
                  if (!time) time = meetingMatch[3].trim();
                  console.log("Regex Fallback (Full):", person, date, time);
                }
              }

              return {
                meetingPerson: person || "",
                meetingDate: date || "",
                meetingTime: time || "",
                lastResult: event.value
              };
            }),
            target: "CreateMeetingFlow"
          },
          {
            guard: "isIntentWhoIs",
            actions: assign(({ event }: any) => {
              console.log("Full NLU Value:", JSON.stringify(event.nluValue, null, 2));
              let person = event.nluValue?.entities?.person?.[0]?.text;

              if (!person) {
                
                const utterance = event.value?.[0]?.utterance || "";
                const match = utterance.match(/who(?: is|'s)\s+(.+)/i);
                if (match) {
                  person = match[1].replace(/[?]/g, "").trim(); 
                  console.log("Regex Fallback Extracted:", person);
                }
              }

              console.log("WhoIs action: person =", person);
              return { whoIsPerson: person || "", lastResult: event.value };
            }),
            target: "WhoIsFlow"
          },
          {
            actions: ({ event }) => console.log("HandleIntent: Unmatched intent or no NLU value.", (event as any).nluValue),
            target: "HandleIntent"
          },
        ],
        ASR_NOINPUT: { target: "HandleIntent" },
        LISTEN_TIMEOUT: { target: "HandleIntent" },
      },
    },

    CreateMeetingFlow: {
      initial: "Greeting",
      states: {
        Greeting: {
          entry: { type: "spst.speak", params: { utterance: "Hi, let's create an appointment." } },
          on: {
            SPEAK_COMPLETE: "AskPerson",
          },
          after: {
            5000: "AskPerson",
          },
        },
        AskPerson: {
          initial: "CheckPerson",
          states: {
            CheckPerson: {
              always: [
                { target: "#DM.CreateMeetingFlow.AskDate", guard: ({ context }) => !!context.meetingPerson },
                { target: "Prompt" },
              ],
            },
            Prompt: {
              entry: { type: "spst.speak", params: { utterance: "Who do you want to meet with?" } },
              on: {
                SPEAK_COMPLETE: "Ask",
              },
              after: {
                5000: "Ask",
              },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: ({ event }: any) => {
                      const person = event.nluValue?.entities?.person?.[0]?.text ||
                        event.nluValue?.entities?.meetingPerson?.[0]?.text;
                      const utterance = event.value?.[0]?.utterance || "";
                      console.log("AskPerson NLU:", JSON.stringify(event.nluValue?.entities));
                      console.log("AskPerson utterance:", utterance);
                      
                      return !!person || !!utterance.trim();
                    },
                    actions: assign(({ event }: any) => {
                      const person = event.nluValue?.entities?.person?.[0]?.text ||
                        event.nluValue?.entities?.meetingPerson?.[0]?.text ||
                        event.value?.[0]?.utterance || "";
                      console.log("AskPerson extracted:", person);
                      return { meetingPerson: person, lastResult: event.value };
                    }),
                    target: "#DM.CreateMeetingFlow.WaitBeforeAskDate",
                  },
                  { target: "Prompt" },
                ]
              },
            },
          },
        },
        WaitBeforeAskDate: {
          after: {
            500: "AskDate",
          },
        },
        AskDate: {
          initial: "CheckDate",
          states: {
            CheckDate: {
              always: [
                { target: "#DM.CreateMeetingFlow.WaitBeforeAskTime", guard: ({ context }) => !!context.meetingDate },
                { target: "Prompt" },
              ],
            },
            Prompt: {
              entry: { type: "spst.speak", params: { utterance: "On which day is your meeting?" } },
              on: { SPEAK_COMPLETE: "Ask" },
              after: { 5000: "Ask" },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: ({ event }: any) => {
                      const nluDate = event.nluValue?.entities?.date?.[0]?.text ||
                        event.nluValue?.entities?.meetingDate?.[0]?.text;
                      const utterance = event.value?.[0]?.utterance || "";
                      
                      const validDay = nluDate && getDay(nluDate.toLowerCase()) ? nluDate : getDay(utterance.toLowerCase());
                      console.log("AskDate NLU:", JSON.stringify(event.nluValue?.entities));
                      console.log("AskDate utterance:", utterance);
                      console.log("AskDate validDay:", validDay);
                      return !!validDay;
                    },
                    actions: assign(({ event }: any) => {
                      const nluDate = event.nluValue?.entities?.date?.[0]?.text ||
                        event.nluValue?.entities?.meetingDate?.[0]?.text;
                      const utterance = event.value?.[0]?.utterance || "";
                      const date = nluDate && getDay(nluDate.toLowerCase()) ? getDay(nluDate.toLowerCase()) : getDay(utterance.toLowerCase()) || "";
                      console.log("AskDate extracted:", date);
                      return { meetingDate: date, lastResult: event.value };
                    }),
                    target: "#DM.CreateMeetingFlow.WaitBeforeAskTime",
                  },
                  {
                    
                    target: "RejectDate"
                  },
                ]
              },
            },
            RejectDate: {
              entry: [
                () => console.log("RejectDate: Invalid day provided"),
                { type: "spst.speak", params: { utterance: "Sorry, that day is not available." } }
              ],
              on: { SPEAK_COMPLETE: "WaitAfterRejectDate" },
            },
            WaitAfterRejectDate: {
              after: { 2000: "Prompt" },
            },
          },
        },
        WaitBeforeAskTime: {
          after: {
            500: "AskTime",
          },
        },
        AskTime: {
          initial: "CheckTime",
          states: {
            CheckTime: {
              always: [
                { target: "#DM.CreateMeetingFlow.WaitBeforeConfirm", guard: ({ context }) => !!context.meetingTime },
                { target: "Prompt" },
              ],
            },
            Prompt: {
              entry: { type: "spst.speak", params: { utterance: "What time is your meeting?" } },
              on: { SPEAK_COMPLETE: "Ask" },
              after: { 5000: "Ask" },
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: [
                  {
                    guard: ({ event }: any) => {
                      const nluTime = event.nluValue?.entities?.time?.[0]?.text ||
                        event.nluValue?.entities?.meetingTime?.[0]?.text;
                      const utterance = event.value?.[0]?.utterance || "";
                      
                      const validTime = nluTime && getTime(nluTime.toLowerCase()) ? nluTime : getTime(utterance.toLowerCase());
                      console.log("AskTime NLU:", JSON.stringify(event.nluValue?.entities));
                      console.log("AskTime utterance:", utterance);
                      console.log("AskTime validTime:", validTime);
                      return !!validTime;
                    },
                    actions: assign(({ event }: any) => {
                      const nluTime = event.nluValue?.entities?.time?.[0]?.text ||
                        event.nluValue?.entities?.meetingTime?.[0]?.text;
                      const utterance = event.value?.[0]?.utterance || "";
                      const time = nluTime && getTime(nluTime.toLowerCase()) ? getTime(nluTime.toLowerCase()) : getTime(utterance.toLowerCase()) || "";
                      console.log("AskTime extracted:", time);
                      return { meetingTime: time, lastResult: event.value };
                    }),
                    target: "#DM.CreateMeetingFlow.WaitBeforeConfirm",
                  },
                  {
                    
                    target: "RejectTime"
                  },
                ],
              },
            },
            RejectTime: {
              entry: [
                () => console.log("RejectTime: Invalid time provided"),
                { type: "spst.speak", params: { utterance: "Sorry, that time is not available." } }
              ],
              on: { SPEAK_COMPLETE: "WaitAfterRejectTime" },
            },
            WaitAfterRejectTime: {
              after: { 2000: "Prompt" },
            },
          },
        },
        WaitBeforeConfirm: {
          after: {
            500: "ConfirmAppointment",
          },
        },
        ConfirmAppointment: {
          entry: ({ context }) => {
            const msg = `Your meeting with ${context.meetingPerson} is scheduled on ${context.meetingDate} at ${context.meetingTime}.`;
            console.log("ConfirmAppointment Speaking:", msg);
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: msg }
            });
          },
          on: { SPEAK_COMPLETE: "Done" },
          after: { 5000: "Done" },
        },
        Done: { on: { CLICK: "#DM.HandleIntent" } },
      },
    },
    WhoIsFlow: {
      initial: "CheckPerson",
      states: {
        CheckPerson: {
          entry: () => console.log("State: WhoIsFlow.CheckPerson"),
          always: [
            { target: "WaitBeforeRespond", guard: ({ context }) => !!context.whoIsPerson },
            { target: "AskPerson" },
          ],
        },
        WaitBeforeRespond: {
          after: {
            500: "RespondPerson",
          },
        },
        AskPerson: {
          entry: [
            () => console.log("State: WhoIsFlow.AskPerson"),
            { type: "spst.speak", params: { utterance: "Who do you want to know about?" } }
          ],
          on: { SPEAK_COMPLETE: "ListenPerson" },
          after: { SPEAK_TIMEOUT: "ListenPerson" },
        },
        ListenPerson: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }: any) => {
                const person = event.nluValue?.entities?.person?.[0]?.text ||
                  event.nluValue?.text ||
                  "";
                return { whoIsPerson: person };
              }),
              target: "RespondPerson",
            },
            ASR_NOINPUT: { target: "AskPerson" },
            LISTEN_TIMEOUT: { target: "AskPerson" },
          },
        },
        RespondPerson: {
          entry: [
            () => console.log("State: WhoIsFlow.RespondPerson"),
            ({ context }: { context: DMContext }) => {
              console.log("Entering RespondPerson Action. whoIsPerson:", context.whoIsPerson);
              const info = getCelebrityInfo(context.whoIsPerson);
              console.log("Celebrity Info:", info);
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: info },
              });
              console.log("Sent SPEAK event to SpeechState");
            },
          ],
          on: { SPEAK_COMPLETE: "Done" },
          after: { 5000: "Done" },
        },
        Done: { on: { CLICK: "#DM.HandleIntent" } },
      },
    },
  },
});
const dmActor: ActorRefFrom<typeof dmMachine> = createActor(dmMachine, { inspect: inspector.inspect }).start();

dmActor.subscribe((state: any) => {
  console.log("DM State Change:", JSON.stringify(state.value));
});

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });

  dmActor.subscribe((snapshot: any) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });

  dmActor.subscribe((snapshot: any) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
}

