# Lab 3A- Hard cases for speech recognition: 

In this lab, as it was asked I worked on how automatic speech recognition (ASR) handles uncommon words such as foreign names, scientific terms, and fictional entities. Similar to the examples provided in the assignment, I checked that ASR normally fails on the first attempt when encountering words that are not frequent in everyday dialogues. I tested several names and terms, including Westeros and Fereshteh. These items wre often misrecognized or split into multiple common English words. Repeating the same utterance usually improved the transcription and increased the confidence score. 

Westeros: first attempt: 0.56 / second attempt: 0.77 (westeros)
Fereshteh: first attempt: 0.33 / second attempt: 0.36 (finish the)


Accent played an important role in quality. As a non-native English speaker, certain pronunciations and stress patterns gain lower confidence scores, especially for proper (Iranian) names and scientific terms.  

Confidence scores below approximately 0.6 often corresponded to incorrect transcriptions, while scores above 0.7 were more reliable. This suggests that confidence values can be used to find uncertain recognition results. 

Finally, ASR struggles with some out-of-vocabulary words, accent variation, and lack of textual information.

-------------------------- 
