/** Only on-device voices: never send study words to a remote TTS service. */
export function speakCetWord(word: string, accent: 'en-US' | 'en-GB'): void {
  try {
    const voice = window.speechSynthesis.getVoices().find(item => item.localService && item.lang.replace('_', '-').toLowerCase() === accent.toLowerCase());
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch { /* Speech is optional in browser and Tauri webviews. */ }
}
