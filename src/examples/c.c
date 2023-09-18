OpenJtalkRc *open_jtalk;
if (voicevox_open_jtalk_rc_new("./open_jtalk_dic_utf_8-1.11", &open_jtalk) != VOICEVOX_RESULT_OK) {
  return 1;
}
VoicevoxSynthesizer *synthesizer;
VoicevoxInitializeOptions synthesizer_options = voicevox_make_default_initialize_options();
if (voicevox_synthesizer_new_with_initialize(open_jtalk, synthesizer_options, &synthesizer) != VOICEVOX_RESULT_OK) {
  return 1;
}

VoiceModel *voice_model;
if (voicevox_voice_model_new_from_path("./model/0.vvm", &voice_model) != VOICEVOX_RESULT_OK) {
  return 1;
}

if (voicevox_synthesizer_load_voice_model(synthesizer, voice_model) != VOICEVOX_RESULT_OK) {
  return 1;
}

VoicevoxTtsOptions tts_options = voicevox_make_default_tts_options();

uint8_t *wav;
uintptr_t *wav_length;
if (voicevox_synthesizer_tts(synthesizer, "こんにちは、音声合成の世界へようこそ", tts_options, &wav_length, &wav) != VOICEVOX_RESULT_OK) {
  return 1;
}

int fd = open("audio.wav", O_CREAT | O_WRONLY, 0644);
write(fd, wav, *wav_length);
