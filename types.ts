import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: any;
  lastResult?: any;
  meetingPerson?: string;
  meetingTime?: string;
  meetingDate?: string;
  fullDay?: boolean;
  whoIsPerson: string;
}

export type DMEvents = 
  | { type: "CLICK" }
  | { type: "SPEAK_COMPLETE" }
  | { type: "RECOGNISED"; value?: any; nluValue?: any }
  | { type: "ASR_NOINPUT" }
  | { type: "LISTEN_TIMEOUT" }
  | { type:  "ASRTTS_READY"};
