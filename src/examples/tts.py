import voicevox_core

core = voicevox_core.VoicevoxCore(open_jtalk_dict_dir="./open_jtalk_dic_utf_8-1.11")

speaker_id = 0

core.load_model(speaker_id)

audio_query = core.audio_query("こんにちは、音声合成の世界へようこそ", speaker_id)

with open("example.wav", "wb") as f:
    f.write(core.synthesis(audio_query, speaker_id))
