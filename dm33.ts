
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

if (!SpeechRecognition) {
  console.error("SpeechRecognition API not supported in this browser.");
}

const recognition = new SpeechRecognition();

// setting 
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// Azure VG
const settings = {
  speechRecognitionEndpointId: "https://dialogues-systems-languages-resources-labs.cognitiveservices.azure.com/"
};

// log results
recognition.onresult = (event: any) => {
  const result = event.results[0][0];
  console.log("Transcript:", result.transcript);
  console.log("Confidence:", result.confidence);
};

recognition.onerror = (event: any) => {
  console.error("ASR error:", event.error);
};

// starting recog
document.getElementById("startBtn")?.addEventListener("click", () => {
  console.log("Listening...");
  recognition.start();
});

