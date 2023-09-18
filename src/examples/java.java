OpenJtalk openJtalk = new OpenJtalk("./open_jtalk_dic_utf_8-1.11");
Synthesizer synthesizer = Synthesizer.builder(openJtalk).build();

VoiceModel voiceModel = new VoiceModel("./model/0.vvm");

synthesizer.loadVoiceModel(voiceModel);

byte[] wav = synthesizer.tts("こんにちは、音声合成の世界へようこそ", voiceModel.metas[0].styles[0].id).execute();

try (FileOutputStream fos = new FileOutputStream("./audio.wav")) {
    fos.write(wav);
}
