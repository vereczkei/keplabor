import { useState } from "react";

const API_URL =
  "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

const APP_SECRET = "keplabor_titkos_2026_vedelem";

export default function App() {
  const [email, setEmail] = useState("teszt@test.com");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [template, setTemplate] = useState("auto");
  const [videoUrl, setVideoUrl] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  async function checkCredits() {
    if (!email) {
      setMessage("Adj meg email címet.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/check-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": APP_SECRET,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage("Kredit ellenőrzési hiba.");
        return;
      }

      setCreditsLeft(data.credits);
      setMessage(`Aktuális kredited: ${data.credits}`);
    } catch (err) {
      setMessage("Szerver hiba kredit ellenőrzésnél.");
    }
  }

  async function buyCredits() {
    if (!email) {
      setMessage("Először add meg az email címed.");
      return;
    }

    setBuying(true);
    setMessage("Stripe fizetés indítása...");

    try {
      const res = await fetch(`${API_URL}/buy-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": APP_SECRET,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Stripe hiba: " + (data.error || "ismeretlen hiba"));
      }
    } catch (err) {
      setMessage("Stripe szerver hiba.");
    }

    setBuying(false);
  }

  async function generateVideo() {
    if (!email) {
      setMessage("Adj meg email címet.");
      return;
    }

    if (!text) {
      setMessage("Írj be reklámszöveget vagy leírást.");
      return;
    }

    setLoading(true);
    setMessage("");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("email", email);
      formData.append("text", text);
      formData.append("template", template);

      if (image) {
        formData.append("image_file", image);
      }

      const res = await fetch(`${API_URL}/generate-from-image`, {
        method: "POST",
        headers: {
          "x-app-secret": APP_SECRET,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        if (data.error === "no_credits") {
          setMessage("Nincs elég kredited. Vásárolj kreditet a generáláshoz.");
        } else {
          setMessage("Hiba: " + data.error);
        }

        setLoading(false);
        return;
      }

      setVideoUrl(data.download);
      setCreditsLeft(data.credits_left);
      setMessage(`Videó elkészült. Template: ${data.template}`);
    } catch (err) {
      setMessage("Szerver hiba.");
    }

    setLoading(false);
  }

  const templates = [
    {
      id: "auto",
      title: "✨ Auto AI",
      desc: "A rendszer választja ki a legjobb stílust",
    },
    {
      id: "luxury",
      title: "💎 Luxury",
      desc: "Prémium, elegáns reklámhatás",
    },
    {
      id: "tiktok-fast",
      title: "⚡ TikTok Fast",
      desc: "Gyors, figyelemfelkeltő social videó",
    },
    {
      id: "dark-cinematic",
      title: "🎬 Cinematic",
      desc: "Sötét, filmszerű hangulat",
    },
    {
      id: "minimal",
      title: "⚪ Minimal",
      desc: "Letisztult, modern termékbemutató",
    },
  ];

  const BeforeAfterBlock = ({ mobile = false }) => (
    <div>
      <div className={`grid grid-cols-2 gap-3 ${mobile ? "mb-4" : "mb-6"}`}>
        <div>
          <p className="text-xs md:text-sm text-zinc-400 mb-2">ELŐTTE</p>

          <img
            src="/oldal.png"
            className={`rounded-3xl w-full object-cover border border-zinc-800 ${
              mobile ? "h-[230px]" : "h-[320px]"
            }`}
          />
        </div>

        <div>
          <p className="text-xs md:text-sm text-zinc-400 mb-2">UTÁNA</p>

          <video
            src="/oldal.mp4"
            autoPlay
            muted
            loop
            playsInline
            className={`rounded-3xl w-full object-cover border border-violet-500/30 ${
              mobile ? "h-[230px]" : "h-[320px]"
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="text-xl md:text-3xl font-black">1 perc</div>
          <div className="text-zinc-400 text-xs md:text-sm">generálás</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="text-xl md:text-3xl font-black">HD</div>
          <div className="text-zinc-400 text-xs md:text-sm">export</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="text-xl md:text-3xl font-black">5+</div>
          <div className="text-zinc-400 text-xs md:text-sm">stílus</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-6 md:py-8">
        <nav className="flex justify-between items-center mb-10 md:mb-20">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Képlabor
          </h1>

          <div className="hidden md:flex gap-8 text-zinc-400 text-sm">
            <button>Főoldal</button>
            <button>Példák</button>
            <button>Árak</button>
            <button>GYIK</button>
          </div>

          <button
            onClick={buyCredits}
            disabled={buying}
            className="bg-violet-600 hover:bg-violet-500 transition px-4 md:px-5 py-3 rounded-2xl font-semibold disabled:opacity-60 text-sm md:text-base"
          >
            {buying ? "Indítás..." : "Kredit"}
          </button>
        </nav>

        <section className="block lg:hidden mb-20">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-300 mb-6">
              🇭🇺 Magyar AI reklámvideó generátor
            </div>

            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
              Reklámvideó
              <br />
              egy képből,
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                1 perc alatt.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed mb-4">
              Tölts fel egy képet, írd le mit szeretnél, és az AI látványos
              social videót készít.
            </p>

            <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-2 rounded-2xl text-sm mb-6">
              🚀 A platform jelenleg fejlesztés alatt áll
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  document
                    .getElementById("generator")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-4 rounded-2xl font-bold text-base"
              >
                Kipróbálom →
              </button>

              <button className="flex-1 border border-zinc-700 px-5 py-4 rounded-2xl font-semibold text-base">
                Példák ▶
              </button>
            </div>
          </div>

          <BeforeAfterBlock mobile />
        </section>

        <section className="hidden lg:grid lg:grid-cols-2 gap-20 items-center mb-32">
          <div>
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-300 mb-8">
              🇭🇺 Magyar fejlesztésű AI reklámvideó generátor
            </div>

            <h1 className="text-6xl font-black leading-tight mb-6">
              Reklámvideó
              <br />
              egy képből,
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                1 perc alatt.
              </span>
            </h1>

            <p className="text-zinc-400 text-xl leading-relaxed mb-6">
              Tölts fel egy termékképet, írd le mit szeretnél,
              és az AI látványos videót készít TikTokra,
              Reelsre vagy webshophoz.
            </p>

            <div className="mt-6 mb-10 inline-block bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-2 rounded-2xl text-sm">
              🚀 A platform jelenleg fejlesztés alatt áll
            </div>

            <div className="flex gap-4 mb-10">
              <button
                onClick={() =>
                  document
                    .getElementById("generator")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition"
              >
                Próbálja ki most →
              </button>

              <button className="border border-zinc-700 hover:border-zinc-500 px-8 py-4 rounded-2xl font-semibold">
                Nézzen példákat ▶
              </button>
            </div>

            <div className="space-y-4 text-zinc-400">
              <div>✅ Nincs szükség szerkesztési tudásra</div>
              <div>✅ Gyors social-ready videók</div>
              <div>✅ Több reklámstílus egy kattintással</div>
            </div>
          </div>

          <BeforeAfterBlock />
        </section>

        <section id="generator" className="grid lg:grid-cols-2 gap-12">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-[32px] p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl font-black mb-2">
              Készítse el az első videóját
            </h2>

            <p className="text-zinc-400 mb-8 md:mb-10">
              Kép + reklámszöveg + stílus = AI videó.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Email
                </label>

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={checkCredits}
                  className="border border-zinc-700 hover:border-zinc-500 px-5 py-4 rounded-2xl font-semibold"
                >
                  Kredit ellenőrzés
                </button>

                <button
                  onClick={buyCredits}
                  disabled={buying}
                  className="bg-violet-600 hover:bg-violet-500 px-5 py-4 rounded-2xl font-semibold disabled:opacity-60"
                >
                  Kredit vásárlás
                </button>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Szöveg / reklám leírás
                </label>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="5"
                  placeholder="Írd le mit szeretnél..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Kép feltöltése
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];

                    if (file) {
                      setImage(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-4">
                  Videó stílus
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTemplate(item.id)}
                      className={`text-left rounded-3xl p-5 border transition ${
                        template === item.id
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <div className="font-bold text-lg mb-2">{item.title}</div>
                      <div className="text-zinc-400 text-sm">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition py-5 rounded-2xl text-xl font-black disabled:opacity-60"
              >
                {loading ? "Videó generálása..." : "🚀 Videó generálása"}
              </button>

              {message && <div className="text-zinc-300">{message}</div>}

              {creditsLeft !== null && (
                <div className="text-zinc-400">
                  Maradék kredit: {creditsLeft}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl font-black mb-8">Előnézet</h2>

            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl h-[300px] flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-zinc-500">
                    A feltöltött kép itt jelenik meg
                  </p>
                )}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl h-[300px] flex items-center justify-center overflow-hidden">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-zinc-500">
                    A generált videó itt fog megjelenni.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}