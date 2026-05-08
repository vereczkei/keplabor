import { useState } from "react";

const API_URL =
  "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

const APP_SECRET = "keplabor_titkos_2026_vedelem";

export default function App() {
  const [email, setEmail] = useState("teszt@test.com");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [category, setCategory] = useState("ad");
  const [template, setTemplate] = useState("auto");
  const [videoMode, setVideoMode] = useState("simple_clip");

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
      setMessage("Írj be rövid leírást arról, milyen videót szeretnél.");
      return;
    }

    setLoading(true);
    setMessage("");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("email", email);
      formData.append("text", text);
      formData.append("category", category);
      formData.append("template", template);
      formData.append("video_mode", videoMode);

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
      setMessage(
        `Videó elkészült. Mód: ${data.video_mode || videoMode}. Kredit: ${
          data.credit_cost || "-"
        }`
      );
    } catch (err) {
      setMessage("Szerver hiba.");
    }

    setLoading(false);
  }

  const categories = [
    {
      id: "ad",
      title: "📣 Reklám",
      desc: "Termékekhez, webshophoz, szolgáltatáshoz",
      prompt: "Luxus fekete férfi karóra cinematic reklám",
    },
    {
      id: "funny",
      title: "😂 Funny",
      desc: "Poénos, TikTok-kompatibilis, mémes videók",
      prompt: "Vicces videó egy cipőről, mintha szuperhős lenne",
    },
    {
      id: "memory",
      title: "🕯️ Emlék",
      desc: "Finom, tiszteletteljes mozgó emlékvideó képből",
      prompt: "Megható, finom mozgású emlékvideó családi fotóból",
    },
    {
      id: "cinematic",
      title: "🎬 Cinematic",
      desc: "Mozis, hangulatos, látványos képből videó",
      prompt: "Sötét, filmszerű cinematic jelenet prémium fényekkel",
    },
  ];

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

  const videoModes = [
    {
      id: "simple_clip",
      title: "5 mp klip",
      desc: "Gyors látványos videó",
      credits: "1 kredit",
    },
    {
      id: "short_ad",
      title: "15 mp videó",
      desc: "Rövid social tartalom",
      credits: "3 kredit",
    },
    {
      id: "narrated_ad",
      title: "30 mp narrált videó",
      desc: "Teljes videó AI narrációval",
      credits: "10 kredit",
    },
  ];

  const BeforeAfterBlock = ({ mobile = false }) => (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 to-cyan-500/20 blur-3xl rounded-[40px]" />

      <div className="relative">
        <div className={`grid grid-cols-2 gap-3 ${mobile ? "mb-4" : "mb-6"}`}>
          <div>
            <p className="text-xs md:text-sm text-zinc-400 mb-2">ELŐTTE</p>

            <img
              src="/oldal.png"
              className={`rounded-3xl w-full object-cover border border-zinc-800 shadow-2xl ${
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
              className={`rounded-3xl w-full object-cover border border-violet-500/40 shadow-2xl ${
                mobile ? "h-[230px]" : "h-[320px]"
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-5">
            <div className="text-xl md:text-3xl font-black">AI</div>
            <div className="text-zinc-400 text-xs md:text-sm">mozgás</div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-5">
            <div className="text-xl md:text-3xl font-black">Voice</div>
            <div className="text-zinc-400 text-xs md:text-sm">narráció</div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-5">
            <div className="text-xl md:text-3xl font-black">HD</div>
            <div className="text-zinc-400 text-xs md:text-sm">export</div>
          </div>
        </div>
      </div>
    </div>
  );

  const TrustStrip = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
      {[
        "Képből videó",
        "Magyar narráció",
        "Reklám / Funny / Emlék",
        "Kredit alapú használat",
      ].map((item) => (
        <div
          key={item}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-4 text-center text-zinc-300 text-sm"
        >
          {item}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-120px] w-[360px] h-[360px] bg-violet-700/20 blur-[120px] rounded-full" />
        <div className="absolute top-[220px] right-[-140px] w-[420px] h-[420px] bg-cyan-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-160px] left-[20%] w-[420px] h-[420px] bg-fuchsia-500/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-6 md:py-8">
        <nav className="flex justify-between items-center mb-10 md:mb-20">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Képlabor
          </h1>

          <div className="hidden md:flex gap-8 text-zinc-400 text-sm">
            <button>Főoldal</button>
            <button>Kategóriák</button>
            <button>Árak</button>
            <button>GYIK</button>
          </div>

          <button
            onClick={buyCredits}
            disabled={buying}
            className="bg-violet-600 hover:bg-violet-500 transition px-4 md:px-5 py-3 rounded-2xl font-semibold disabled:opacity-60 text-sm md:text-base shadow-lg shadow-violet-900/30"
          >
            {buying ? "Indítás..." : "Kredit"}
          </button>
        </nav>

        <section className="block lg:hidden mb-20">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-300 mb-6">
              🇭🇺 Képből élményvideó AI-val
            </div>

            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
              Keltsd életre
              <br />
              a képed
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                videóként.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed mb-4">
              Reklám, vicces videó, emlék vagy cinematic jelenet — egy képből,
              narrációval.
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
                className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-4 rounded-2xl font-bold text-base shadow-lg shadow-violet-900/30"
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

        <section className="hidden lg:grid lg:grid-cols-2 gap-20 items-center mb-20">
          <div>
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-300 mb-8">
              🇭🇺 Magyar fejlesztésű AI videólabor
            </div>

            <h1 className="text-6xl font-black leading-tight mb-6">
              Egy képből
              <br />
              élményvideó,
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                narrációval.
              </span>
            </h1>

            <p className="text-zinc-400 text-xl leading-relaxed mb-6">
              Tölts fel egy képet, válassz kategóriát, és készíts reklámot,
              vicces videót, emlékvideót vagy cinematic jelenetet.
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
                className="bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition shadow-lg shadow-violet-900/30"
              >
                Próbálja ki most →
              </button>

              <button className="border border-zinc-700 hover:border-zinc-500 px-8 py-4 rounded-2xl font-semibold">
                Nézzen példákat ▶
              </button>
            </div>

            <div className="space-y-4 text-zinc-400">
              <div>✅ Nem kell videószerkesztő tudás</div>
              <div>✅ Reklám, funny, memory és cinematic mód</div>
              <div>✅ Magyar narrációs irány előkészítve</div>
            </div>
          </div>

          <BeforeAfterBlock />
        </section>

        <TrustStrip />

        <section className="mb-20">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                Nem csak reklám. Képből történet.
              </h2>
              <p className="text-zinc-400 max-w-2xl">
                Válaszd ki, milyen hangulatú videót szeretnél. A háttérben a
                rendszer ehhez igazítja a promptot, narrációt és stílust.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {categories.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCategory(item.id);
                  setText(item.prompt);
                }}
                className={`text-left rounded-3xl p-6 border transition min-h-[190px] ${
                  category === item.id
                    ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-950/40"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                }`}
              >
                <div className="text-2xl font-black mb-3">{item.title}</div>
                <div className="text-zinc-400 text-sm leading-relaxed">
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="generator" className="grid lg:grid-cols-2 gap-12">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-black mb-2">
              Készítsd el az első videódat
            </h2>

            <p className="text-zinc-400 mb-8 md:mb-10">
              Kép + kategória + stílus + hossz = kész AI videó.
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
                <label className="block text-sm text-zinc-400 mb-4">
                  Videó kategória
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCategory(item.id);
                        setText(item.prompt);
                      }}
                      className={`text-left rounded-3xl p-5 border transition ${
                        category === item.id
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <div className="font-bold text-lg mb-2">{item.title}</div>
                      <div className="text-zinc-400 text-sm">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Rövid leírás
                </label>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="5"
                  placeholder="Írd le, milyen videót szeretnél..."
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

              <div>
                <label className="block text-sm text-zinc-400 mb-4">
                  Videó hossza / típusa
                </label>

                <div className="grid grid-cols-1 gap-4">
                  {videoModes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVideoMode(item.id)}
                      className={`text-left rounded-3xl p-5 border transition ${
                        videoMode === item.id
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <div className="font-bold text-lg mb-1">
                            {item.title}
                          </div>
                          <div className="text-zinc-400 text-sm">
                            {item.desc}
                          </div>
                        </div>

                        <div className="text-cyan-300 font-bold whitespace-nowrap">
                          {item.credits}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition py-5 rounded-2xl text-xl font-black disabled:opacity-60 shadow-lg shadow-violet-900/30"
              >
                {loading ? "Videó generálása..." : "🚀 Videó generálása"}
              </button>

              {message && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-300">
                  {message}
                </div>
              )}

              {creditsLeft !== null && (
                <div className="text-zinc-400">
                  Maradék kredit: {creditsLeft}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Előnézet</h2>

            <p className="text-zinc-400 mb-8">
              Itt látod a feltöltött képet és a generált videót.
            </p>

            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl h-[300px] flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-zinc-500 px-6 text-center">
                    A feltöltött kép itt jelenik meg
                  </p>
                )}
              </div>

              <div className="bg-zinc-950 border border-violet-500/20 rounded-3xl h-[300px] flex items-center justify-center overflow-hidden">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-zinc-500 px-6 text-center">
                    A generált videó itt fog megjelenni.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-zinc-500 text-sm mb-1">Kategória</div>
                  <div className="font-bold">
                    {categories.find((c) => c.id === category)?.title}
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-zinc-500 text-sm mb-1">Mód</div>
                  <div className="font-bold">
                    {videoModes.find((m) => m.id === videoMode)?.title}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-violet-600/10 to-cyan-500/10 border border-cyan-500/20 rounded-3xl p-6">
                <div className="text-sm text-cyan-300 font-bold mb-2">
                  Következő fejlesztési irány
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Prémium AI videómodell, jobb reklámszöveg, természetesebb
                  magyar narráció, zene és több jelenetes cinematic render.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[36px] p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-5">
              Egy kép. Több történet.
            </h2>
            <p className="text-zinc-400 text-lg max-w-3xl mx-auto mb-8">
              A Képlabor célja, hogy bárki képes legyen látványos, narrált
              videókat készíteni képekből — reklámhoz, poénhoz, emlékhez vagy
              cinematic tartalomhoz.
            </p>

            <button
              onClick={() =>
                document
                  .getElementById("generator")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition"
            >
              Kezdjük el →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}