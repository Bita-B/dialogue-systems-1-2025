# Lab 3B - Speech synthesis poetry slam 
In this assignment, I used speech synthesis markup language (SSML) in Azure Audio Creation to generate a kind of artificial performance. I chose a short poem by Rumi and decided to recreate a calm poetry slam-style delivery which is inspired by spritual and spoken-word poetry performances. 
To achieve this effect, I slowed down the speaking rate using the '<prosody>' tag and added pauses between verses using '<break>'. These pauses help create a deep-poetic rhythm and allow the listener to reflect on the meaning of each line. I also increased the pitch a little to make the synthesized voice sound more human-like. 
Additionally, I used the 'mstts:express-as' tag first with a calm speaking style to enhance emotional delivery. By experimenting with speech rate, pitch, and pause duration, the synthesized voice sounded less robotic and more similar to a human poetry telling and reading. 
Overall, this experiment shows how SSML can be used to control speech synthesis in a creative way and produce poetic speech output. 


The poem wasn't successfully synthesized in Azure Audio Content Creation, then I needed to remove all 'mstts' tags.
Some lines initially triggered synthesis errors due to long pauses or length, so I make the poem shorter (removed a line of poem) for full playback. 
This allowed evaluation of prosody, pitch, and pause timing to achieve a poetry slam style. 

# Part VG part: 

For advanced test, I worked expressive speech synthesis usingAzure Audio Content Creation. 
The poem was synthesized by using the English neural voice 'en-US-JennyNeural' with the "poetry" style. 
Prosody, pitch, and regular pauses were used to improve rhythm and convey mention in a poetry slam style. 
Key words were emphasized using '<emphasis>' tags to highlight the most meaningful parts of the poem. 

Moreover, a music file was included via the '<audio>' tag. Due to Azure's processing, the audio plays, so the music is heard first, followed by the poem. This shows the ability to integrate external audio into SSML.
Although a real background music would need editing in an audio editor or program, this experiment shows that SSML can add sounds to speech to make it more expressive. 

Overall, these parts represents advanced control over speech synthesis and some creative experimentations with style, emphasis, and merged audio. 


*** Something very important about the audio file + background audio -> The whole file is about 6:37 minutes but the poetry starts at the last 20th second of the file. 

