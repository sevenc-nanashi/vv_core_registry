val openJtalk = OpenJtalk("./open_jtalk_dic_utf_8-1.11")
val synthesizer = Synthesizer.builder(openJtalk).build()

val voiceModel = VoiceModel("./model/0.vvm")

synthesizer.loadVoiceModel(voiceModel)

val wav = synthesizer.tts("こんにちは、音声合成の世界へようこそ", voiceModel.metas[0].styles[0].id).execute()

FileOutputStream("./audio.wav").use { fos ->
    fos.write(wav)
}
