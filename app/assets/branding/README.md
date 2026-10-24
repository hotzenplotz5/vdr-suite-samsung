# VDR-Suite Samsung – Branding aus VIDAA

Dieser Ordner ist ausschließlich für **Original-Branding-Assets** aus dem Schwesterprojekt `hotzenplotz5/vdr-suite-vidaa` vorgesehen.

## Manuell zu kopierende Dateien

| Quelle im VIDAA-Repository | Ziel in diesem Ordner | Verwendung |
| --- | --- | --- |
| `app/vdr-suite-icon-v4.png` | `vdr-suite-icon-v4.png` | VDR-Suite Logo / TV-Launcher nach Prüfung |
| `app/startvideo.mp4` | `startvideo.mp4` | VDR-Suite Startanimation |

Zielpfade:

- `app/assets/branding/vdr-suite-icon-v4.png`
- `app/assets/branding/startvideo.mp4`

**Originaldateien unverändert kopieren** (Dateinamen beibehalten); keine neu generierten Ersatzlogos. Samsung bekommt eine eigene UI, deren visuelle Zielvorlage das vom Nutzer freigegebene dunkle Media-Home-Design mit oberer Navigation, großem Hero-Bereich und horizontalen Kachelreihen ist.

Bis zur lokalen Übernahme sind Logo und Video **nicht** Teil des Samsung-Builds. `app/assets/icon.png` bleibt zunächst das bestehende Test-Icon. Erst nach Sichtprüfung, Tizen-5.5-Kompatibilität und einem lokalen Build sollen Startvideo und Logo in `app/index.html`, `app/config.xml` und die UI eingebunden werden.

- Niemals Benutzer-Zertifikate oder Schlüssel in diesen Ordner kopieren.
- Bei der Startanimation fehlendes Video/Playback-Fehler ohne blockierenden schwarzen Bildschirm abfangen.
- Die VIDAA-Quelle nur lesen, nicht verändern.
