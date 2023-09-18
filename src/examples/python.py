open_jtalk = voicevox_core.OpenJtalk("./open_jtalk_dic_utf_8-1.11")
synthesizer = await voicevox_core.Synthesizer.new_with_initialize(open_jtalk)

model = await voicevox_core.VoiceModel.from_path("./model/0.vvm")

await synthesizer.load_voice_model(model)

wav = await synthesizer.tts("こんにちは、音声合成の世界へようこそ", style_id=model.metas[0].styles[0].id)

with open("audio.wav", "wb") as f:
    f.write(wav)
