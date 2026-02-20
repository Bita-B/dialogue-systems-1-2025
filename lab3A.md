# Lab 3A — Hard Cases for Automatic Speech Recognition

## Overview

This report documents my experience testing Automatic Speech Recognition (ASR) with words that are difficult for standard speech recognition systems. The tests were conducted using the Azure Cognitive Services ASR engine integrated via SpeechState in a TypeScript/XState dialogue system. Confidence scores were logged in the browser console for each utterance.

---

## Test Cases and Confidence Scores

| Category | Word / Phrase | Attempt 1 | Attempt 2 | Transcribed As |
|---|---|---|---|---|
| Fictional (GoT) | *Westeros* | 0.56 | 0.77 | "westeros" ✅ |
| Persian name | *Fereshteh* | 0.33 | 0.36 | "finish the" ❌ |
| Persian name | *Parvaneh* | 0.41 | 0.55 | "par vana" ❌ |
| Composer | *Rachmaninoff* | 0.29 | 0.44 | "rock man enough" ❌ |
| Composer | *Shostakovich* | 0.38 | 0.51 | "shosta kovich" ⚠️ |
| Fictional (Dune) | *Arrakis* | 0.48 | 0.62 | "a rock is" ❌ |
| Real location | *Reykjavik* | 0.52 | 0.71 | "reykjavik" ✅ |

Confidence scores were captured using a structured logging wrapper around `dmActor.send`, which prints the transcript, confidence value, and a HIGH/MEDIUM/LOW rating to the browser console.

---

## Analysis

**Why does ASR struggle with these words?**

1. **Out-of-vocabulary (OOV) words**: ASR language models are trained on large corpora of everyday speech. Fictional names (*Westeros*, *Arrakis*), Persian names (*Fereshteh*), and rare composers (*Mussorgsky*) are statistically rare or absent, so the model maps them to phonetically similar common words instead.

2. **Accent variation**: As a non-native English speaker with a Persian accent, certain phonemes (e.g., the rolled *r*, front vowels) differ from the American English baseline the model was trained on. This consistently lowered confidence scores for Persian names.

3. **Phoneme ambiguity**: Names like *Rachmaninoff* contain phoneme sequences that don't appear in English, causing the decoder to split them into multiple common words ("rock man enough").

4. **Confidence threshold**: Scores below ~0.5 almost always corresponded to incorrect transcriptions. Scores above 0.7 were generally reliable. This suggests a threshold-based fallback (e.g., re-asking when confidence < 0.6) could improve robustness.

**Possible solutions**: Domain-specific language model adaptation, custom pronunciation lexicons, or phonetic fuzzy matching in the grammar lookup could help handle OOV words and accent variation.

---

*Tested February 2026 — Azure Cognitive Services ASR, en-US locale*
