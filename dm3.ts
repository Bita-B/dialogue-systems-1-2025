const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const recognition = new SpeechRecognition ();

recognition.lang = "en-US";

// VG Part 
const settings = {
    speechRecognitionEndpointId: "endpoint id"
};

recognition.onresult = (event: any) => {
    const result = event.results[0][0];
    console.log("Transcript:", result.transcript);
    console.log("Confidence:", result.confidence);
}; 

recognition.onerror = (event: any) => {
    console.error("ASR error:", event.error);
};

recognition.start();


