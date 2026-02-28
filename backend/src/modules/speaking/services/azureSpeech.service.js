import sdk from 'microsoft-cognitiveservices-speech-sdk';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('wav')
            .audioChannels(1) // Mono
            .audioFrequency(16000) // 16 kHz
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};

class AzureSpeechService {
    constructor() {
        this.speechConfig = null;
        this.initialized = false;
    }

    init() {
        const key = process.env.AZURE_SPEECH_KEY;
        const region = process.env.AZURE_SPEECH_REGION;

        if (!key || !region) {
            console.warn('Azure Speech API keys not found in .env');
            return;
        }

        this.speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
        // V3 configuration might be needed implicitly, depending on SDK version
        this.initialized = true;
    }

    async evaluatePronunciation(audioFilePath, referenceText) {
        if (!this.initialized) {
            this.init();
            if (!this.initialized) {
                throw new Error("Azure Speech SDK content not initialized. Please ensure AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are set in .env");
            }
        }

        const tempWavPath = `${audioFilePath}_azure.wav`;

        try {
            // 1. Convert Webm (or uploaded format) to 16kHz mono WAV for Azure
            await convertToWav(audioFilePath, tempWavPath);

            // 2. Setup Audio config
            const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(tempWavPath));

            // 3. Setup Assessment config
            const pronAssessmentConfig = new sdk.PronunciationAssessmentConfig(
                referenceText,
                sdk.PronunciationAssessmentGradingSystem.HundredMark,
                sdk.PronunciationAssessmentGranularity.Phoneme,
                true // enableMiscue
            );

            // We want to receive phonetic symbols back (IPA format) if supported.
            // pronAssessmentConfig.phonemeAlphabet = "IPA"; // Available in newer SDKs but we'll stick to default for safety

            const speechRecognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
            pronAssessmentConfig.applyTo(speechRecognizer);

            // 4. Run assessment
            const result = await new Promise((resolve, reject) => {
                speechRecognizer.recognizeOnceAsync(
                    function (result) {
                        speechRecognizer.close();
                        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                            const pronResult = sdk.PronunciationAssessmentResult.fromResult(result);
                            resolve({
                                accuracyScore: pronResult.accuracyScore,
                                fluencyScore: pronResult.fluencyScore,
                                completenessScore: pronResult.completenessScore,
                                pronunciationScore: pronResult.pronunciationScore,
                                detailResult: pronResult.detailResult, // Contains words and phoneme details
                                recognizedText: result.text
                            });
                        } else if (result.reason === sdk.ResultReason.NoMatch) {
                            reject(new Error("No speech could be recognized."));
                        } else if (result.reason === sdk.ResultReason.Canceled) {
                            const cancellation = sdk.CancellationDetails.fromResult(result);
                            reject(new Error(`Canceled: ${cancellation.reason}. Error details: ${cancellation.errorDetails}`));
                        }
                    },
                    function (err) {
                        speechRecognizer.close();
                        reject(err);
                    }
                );
            });

            // 5. Transform detailed results into easier format for our app (matching previous logic)
            return this._formatResult(result, referenceText);

        } finally {
            // 6. Cleanup temp file
            if (fs.existsSync(tempWavPath)) {
                fs.unlinkSync(tempWavPath);
            }
        }
    }

    _formatResult(azureResult, referenceText) {
        const { accuracyScore, fluencyScore, completenessScore, pronunciationScore, detailResult, recognizedText } = azureResult;

        const words = detailResult?.Words || [];
        const pronunciationItems = [];
        const newWords = []; // Dummy

        // We map the Azure words into our standard feedback component
        const transcriptErrors = [];

        words.forEach(word => {
            // Identify mismatches (words with low accuracy)
            if (word.AccuracyScore < 80) {
                // Find the worst phoneme to report
                let worstPhoneme = null;
                if (word.Phonemes && word.Phonemes.length > 0) {
                    // Sort by accuracy ascending
                    const sortedPhonemes = [...word.Phonemes].sort((a, b) => a.AccuracyScore - b.AccuracyScore);
                    worstPhoneme = sortedPhonemes[0];
                }

                pronunciationItems.push({
                    expected: word.Word,
                    heard: worstPhoneme ? worstPhoneme.Phoneme : word.Word,
                    score: word.AccuracyScore,
                    errorType: word.ErrorType // "Omission", "Insertion", "None", "Mispronunciation"
                });

                transcriptErrors.push({
                    mistake: word.Word,
                    correction: word.Word,
                    explanation: `Phát âm chưa chuẩn (${word.AccuracyScore}/100).${worstPhoneme ? ` Có lẽ bạn đã đọc sai âm /${worstPhoneme.Phoneme}/` : ''}`
                });
            }
        });

        return {
            score: pronunciationScore,
            scores_detail: {
                accuracy: accuracyScore,
                fluency: fluencyScore,
                completeness: completenessScore,
                pronunciation: pronunciationScore
            },
            transcript: recognizedText,
            mistakes: pronunciationItems, // to log to analytics
            errors: transcriptErrors,     // to display on UI feedback
            advanced_vocabulary: newWords,
            raw_words_detail: words // Detailed coloring data for FE
        };
    }
}

export default new AzureSpeechService();
