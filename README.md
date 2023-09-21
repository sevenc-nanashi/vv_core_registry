# vv_core_registery

[Voicevox Core](https://github.com/voicevox/voicevox_core) の Python/Java バインディングのためのレジストリ。
[PEP 503](https://peps.python.org/pep-0503/)、[Maven2 Repository Layout](https://maven.apache.org/repository/layout.html)に準拠しています。

## 使い方

```bash
pip install --extra-index-url https://sevenc7c.com/vv_core_registry voicevox_core

# ハードウェアアクセラレーション適用版
pip install --extra-index-url https://sevenc7c.com/vv_core_registry/cpu voicevox_core
pip install --extra-index-url https://sevenc7c.com/vv_core_registry/cuda voicevox_core
pip install --extra-index-url https://sevenc7c.com/vv_core_registry/directml voicevox_core
```

## ライセンス

MIT License で公開しています。
