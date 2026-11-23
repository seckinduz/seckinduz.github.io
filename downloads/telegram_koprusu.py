# -*- coding: utf-8 -*-
"""Bulut <-> Telegram köprüsü (Kaggle / Colab notebook içinde çalışır). Yalnızca standart kütüphane.
Güvenlik: yalnızca OWNER_CHAT_ID'den gelen komutlar işlenir; serbest kabuk komutu YOK, sadece aşağıdaki JOBS listesi.
Gerçekçi sınırlar: ücretsiz oturum süresi ve haftalık GPU kotası sınırlıdır; oturum kapanınca köprü de durur."""
import json, os, subprocess, sys, time, urllib.parse, urllib.request

TOKEN = os.environ["BOT_TOKEN"]            # Kaggle/Colab Secrets'a koy, koda yazma
OWNER = int(os.environ["OWNER_CHAT_ID"])   # kendi Telegram sayısal kimliğin
API = f"https://api.telegram.org/bot{TOKEN}/"

# Çalıştırılabilecek işler: ad -> komut listesi. Kendi işlerini buraya ekle.
JOBS = {
    "gpu_test": ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
    "video_render": [sys.executable, "video_render.py"],
    "egitim": [sys.executable, "egitim.py"],
}


def call(method, **params):
    data = urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(urllib.request.Request(API + method, data), timeout=70) as r:
        return json.load(r)


def say(text):
    call("sendMessage", chat_id=OWNER, text=text[:4000])


def run_job(name):
    say(f"⏳ Kuyruğa alındı: {name}")
    t0 = time.time()
    try:
        p = subprocess.run(JOBS[name], capture_output=True, text=True, timeout=6 * 3600)
        sure = int(time.time() - t0)
        if p.returncode == 0:
            say(f"✅ İş tamamlandı: {name} ({sure // 60} dk {sure % 60} sn)\n{(p.stdout or '')[-600:]}")
        else:
            say(f"❌ İş hata verdi: {name} (kod {p.returncode})\n{(p.stderr or '')[-600:]}")
    except FileNotFoundError as e:
        say(f"❌ Dosya bulunamadı: {e.filename}")
    except subprocess.TimeoutExpired:
        say(f"⌛ Zaman aşımı: {name}")


def main():
    say("🟢 Bulut köprüsü açık. Komut: /calistir <iş>  |  /isler  |  /durum")
    offset = 0
    while True:
        try:
            for u in call("getUpdates", offset=offset, timeout=50).get("result", []):
                offset = u["update_id"] + 1
                m = u.get("message") or {}
                if m.get("chat", {}).get("id") != OWNER:      # yabancıları sessizce yoksay
                    continue
                parts = (m.get("text") or "").split()
                if not parts: continue
                if parts[0] == "/isler": say("İşler: " + ", ".join(JOBS))
                elif parts[0] == "/durum": say("🟢 Köprü çalışıyor")
                elif parts[0] == "/calistir" and len(parts) > 1 and parts[1] in JOBS: run_job(parts[1])
                elif parts[0] == "/calistir": say("Bilinmeyen iş. /isler yaz.")
        except Exception as e:
            print("poll hatası:", e); time.sleep(5)


if __name__ == "__main__":
    main()
