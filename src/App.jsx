import { useState } from "react";

const API_URL =
  "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

const APP_SECRET = "keplabor_titkos_2026_vedelem";

export default function App() {
  const [email, setEmail] = useState("teszt@test.com");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [category, setCategory] = useState("cinematic");
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
    setMessage("Stripe tesztfizetés indítása...");

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
      setMessage("Írd le röviden, milyen jelenetet szeretnél.");
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
          setMessage("A generálás jelenleg nem elérhető vagy nincs elég kredit.");
        } else {
          setMessage("Hiba: " + data.error);
        }

        setLoading(false);
        return;
      }

      setVideoUrl(data.download);
      setCreditsLeft(data.credits_left);
      setMessage("Elkészült az előnézeti videó.");
    } catch (err) {
      setMessage("Szerver hiba.");
    }

    setLoading(false);
  }

  const experiences = [
    {
      id: "memory",
      icon: "🕯️",
      title: "Emlék",
      subtitle: "Régi képből megható mozgó pillanat",
      prompt:
        "Megható, finom mozgású emlékvideó egy fontos családi fotóból, lágy fényekkel, tiszteletteljes hangulattal",
      gradient: "from-amber-400/20 to-orange-500/10",
    },
    {
      id: "fantasy",
      icon: "🌌",
      title: "Fantasy",
      subtitle: "Varázslatos világ, álomszerű jelenet",
      prompt:
        "Varázslatos fantasy jelenet, ragyogó fényekkel, részletgazdag természeti háttérrel, filmes mozgással",
      gradient: "from-fuchsia-500/20 to-violet-600/10",
    },
    {
      id: "cinematic",
      icon: "🎬",
      title: "Cinematic",
      subtitle: "Filmszerű, prémium mozi hangulat",
      prompt:
        "Prémium cinematic jelenet, lassú kameramozgással, drámai fényekkel, elegáns filmes hangulattal",
      gradient: "from-cyan-400/20 to-blue-600/10",
    },
    {
      id: "love",
      icon: "❤️",
      title: "Love",
      subtitle: "Romantikus, esküvői, érzelmes videó",
      prompt:
        "Romantikus szerelmes jelenet, kézen fogva séta, lágy naplemente, cinematic wedding film hangulat",
      gradient: "from-rose-500/20 to-pink-600/10",
    },
    {
      id: "luxury",
      icon: "💎",
      title: "Luxury",
      subtitle: "Elegáns, luxus életérzés, prémium vibe",
      prompt:
        "Luxus cinematic jelenet, prémium fényekkel, elegáns mozgással, high-end reklámfilm hangulattal",
      gradient: "from-violet-400/20 to-cyan-400/10",
    },
    {
      id: "funny",
      icon: "😂",
      title: "Funny",
      subtitle: "Vicces, virális, TikTok-kompatibilis",
      prompt:
        "Vicces, látványos, virális hangulatú videó, játékos mozgással, filmszerű komikus energiával",
      gradient: "from-lime-400/20 to-yellow-500/10",
    },
  ];

  const templates = [
    {
      id: "auto",
      title: "Auto AI",
      desc: "A rendszer választja ki a legjobb hangulatot",
    },
    {
      id: "dark-cinematic",
      title: "Dark Cinematic",
      desc: "Sötét, drámai, filmes fények",
    },
    {
      id: "luxury",
      title: "Luxury Glow",
      desc: "Elegáns, prémium, csillogó hatás",
    },
    {
      id: "tiktok-fast",
      title: "Viral Motion",
      desc: "Gyorsabb, figyelemfelkeltő social vibe",
    },
    {
      id: "minimal",
      title: "Soft Memory",
      desc: "Letisztult, finom, érzelmes mozgás",
    },
  ];

  const videoModes = [
    {
      id: "simple_clip",
      title: "Rövid élmény",
      desc: "Gyors 5 mp-es cinematic preview",
      credits: "1 kredit",
    },
    {
      id: "short_ad",
      title: "Social videó",
      desc: "15 mp-es Reels / TikTok hangulat",
      credits: "3 kredit",
    },
    {
      id: "narrated_ad",
      title: "Prémium jelenet",
      desc: "30 mp-es hosszabb cinematic élmény",
      credits: "10 kredit",
    },
  ];

  const currentExperience = experiences.find((item) => item.id === category);

  const BeforeAfterBlock = ({ mobile = false }) => (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[42px] bg-gradient-to-r from-violet-600/25 via-cyan-500/10 to-fuchsia-500/20 blur-3xl" />

      <div className="relative rounded-[32px] border border-white/10 bg-black/30 p-3 md:p-4 backdrop-blur-xl shadow-2xl">
        <div className={`grid grid-cols-2 gap-3 ${mobile ? "mb-3" : "mb-4"}`}>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] md:text-xs uppercase tracking-[0.25em] text-zinc-400">
                Fotó
              </p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
                before
              </span>
            </div>

            <img
              src="/oldal.png"
              className={`w-full rounded-3xl border border-white/10 object-cover shadow-2xl ${
                mobile ? "h-[230px]" : "h-[340px]"
              }`}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] md:text-xs uppercase tracking-[0.25em] text-cyan-300">
                Videó
              </p>
              <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-300">
                after
              </span>
            </div>

            <video
              src="/oldal.mp4"
              autoPlay
              muted
              loop
              playsInline
              className={`w-full rounded-3xl border border-cyan-400/25 object-cover shadow-2xl ${
                mobile ? "h-[230px]" : "h-[340px]"
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ["1 kép", "feltöltés"],
            ["AI", "mozgás"],
            ["HD", "export"],
          ].map(([top, bottom]) => (
            <div
              key={top}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <div className="text-lg md:text-2xl font-black">{top}</div>
              <div className="text-[11px] md:text-xs text-zinc-400">
                {bottom}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const scrollToGenerator = () => {
    document.getElementById("generator")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-violet-700/25 blur-[130px]" />
        <div className="absolute right-[-160px] top-[240px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[150px]" />
        <div className="absolute bottom-[-180px] left-[20%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-8">
        <nav className="mb-8 flex items-center justify-between md:mb-14">
          <button
            onClick={scrollToGenerator}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl shadow-lg shadow-violet-900/40">
              ✦
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-left text-2xl font-black tracking-tight text-transparent md:text-3xl">
                Képlabor
              </h1>
              <p className="hidden text-left text-xs text-zinc-500 md:block">
                képből cinematic élmény
              </p>
            </div>
          </button>

          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <button onClick={scrollToGenerator} className="hover:text-white">
              Élmények
            </button>
            <button onClick={scrollToGenerator} className="hover:text-white">
              Generátor
            </button>
            <button className="hover:text-white">Árak</button>
            <button className="hover:text-white">Béta</button>
          </div>

          <button
            onClick={buyCredits}
            disabled={buying}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black shadow-lg transition hover:scale-105 disabled:opacity-60 md:px-5"
          >
            {buying ? "Indítás..." : "Kreditek"}
          </button>
        </nav>

        <section className="relative mb-16 overflow-hidden rounded-[36px] border border-white/10 bg-black/30 px-5 py-7 shadow-2xl backdrop-blur lg:hidden">
          <video
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-[#050816]/10" />

          <div className="relative z-10">
            <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 backdrop-blur">
              🇭🇺 Magyar AI élményvideó
            </div>

            <h2 className="mb-5 text-5xl font-black leading-[0.95]">
              Egy fotóból
              <span className="block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                filmjelenet.
              </span>
            </h2>

            <p className="mb-5 text-lg leading-relaxed text-zinc-300">
              Emlék, fantasy, szerelem vagy cinematic vibe — feltöltöd a képet,
              kiválasztod az élményt, és készül a mozgó jelenet.
            </p>

            <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
              🚧 Korai béta: a generálás még tesztüzemben van.
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3">
              <button
                onClick={scrollToGenerator}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-4 font-black shadow-lg shadow-violet-900/40"
              >
                Jelenetet készítek →
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-bold backdrop-blur">
                Példák ▶
              </button>
            </div>

            <BeforeAfterBlock mobile />
          </div>
        </section>

        <section className="relative mb-16 hidden min-h-[760px] grid-cols-2 items-center gap-16 overflow-hidden rounded-[46px] border border-white/10 bg-black/30 px-10 py-12 shadow-2xl backdrop-blur lg:grid">
          <video
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050816]/90 via-[#050816]/72 to-[#050816]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.18),transparent_38%),radial-gradient(circle_at_85%_65%,rgba(34,211,238,0.14),transparent_36%)]" />

          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 backdrop-blur">
              <span>✦</span>
              Magyar fejlesztésű cinematic AI élménylabor
            </div>

            <h2 className="mb-7 text-6xl font-black leading-[0.92] xl:text-7xl">
              Változtasd
              <br />
              a fotódat
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
                filmjelenetté.
              </span>
            </h2>

            <p className="mb-6 max-w-2xl text-xl leading-relaxed text-zinc-300">
              Csak feltöltöd a képet, kiválasztod az
              élményt, és a Képlabor filmes, érzelmes vagy fantasy hangulatú
              videót készít belőle.
            </p>

            <div className="mb-9 inline-block rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200 backdrop-blur">
              🚧 Korai béta — a videógenerálás még tesztüzemben működik.
            </div>

            <div className="mb-10 flex gap-4">
              <button
                onClick={scrollToGenerator}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 text-lg font-black shadow-lg shadow-violet-900/40 transition hover:scale-105"
              >
                Saját jelenetet kérek →
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold backdrop-blur transition hover:border-white/30">
                Videó példák ▶
              </button>
            </div>

            <div className="grid max-w-2xl grid-cols-3 gap-3">
              {["Nincs prompt hiba", "Preset alapú flow", "Cinematic output"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-zinc-300 backdrop-blur"
                  >
                    ✅ {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="relative z-10">
            <BeforeAfterBlock />
          </div>
        </section>

        <section className="mb-16 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Emlék", "megható mozgó pillanat"],
            ["Fantasy", "varázslatos világ"],
            ["Cinematic", "mozis látvány"],
            ["Love", "romantikus jelenet"],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="text-xl font-black">{title}</div>
              <div className="mt-1 text-sm text-zinc-400">{desc}</div>
            </div>
          ))}
        </section>

        <section className="mb-20">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                élmény presetek
              </p>
              <h3 className="text-4xl font-black md:text-5xl">
                Nem beállítások. Hangulatok.
              </h3>
            </div>

            <p className="max-w-xl text-zinc-400">
              A Képlabor előre felépített cinematic
              élményekkel dolgozik, hogy ne tudja elrontani.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {experiences.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCategory(item.id);
                  setText(item.prompt);
                  document
                    .getElementById("generator")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group relative min-h-[220px] overflow-hidden rounded-[32px] border p-6 text-left transition hover:-translate-y-1 ${
                  category === item.id
                    ? "border-cyan-400/60 bg-cyan-400/10 shadow-lg shadow-cyan-950/40"
                    : "border-white/10 bg-white/[0.035] hover:border-white/25"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-100`}
                />
                <div className="absolute right-[-30px] top-[-30px] text-8xl opacity-10 transition group-hover:scale-110">
                  {item.icon}
                </div>

                <div className="relative">
                  <div className="mb-5 text-4xl">{item.icon}</div>
                  <div className="mb-2 text-2xl font-black">{item.title}</div>
                  <div className="leading-relaxed text-zinc-300">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          id="generator"
          className="mb-20 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[38px] border border-white/10 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
                készíts jelenetet
              </p>
              <h3 className="mb-3 text-4xl font-black md:text-5xl">
                Fotóból mozgó élmény.
              </h3>
              <p className="text-zinc-400">
                A cél: minél kevesebb döntés, minél erősebb végeredmény.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={checkCredits}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 font-bold transition hover:border-white/25"
                >
                  Kredit ellenőrzés
                </button>

                <button
                  onClick={buyCredits}
                  disabled={buying}
                  className="rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  Kredit vásárlás
                </button>
              </div>

              <div>
                <label className="mb-4 block text-sm text-zinc-400">
                  Válassz élményt
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {experiences.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCategory(item.id);
                        setText(item.prompt);
                      }}
                      className={`rounded-3xl border p-5 text-left transition ${
                        category === item.id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="mb-2 text-xl font-black">
                        {item.icon} {item.title}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {item.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Rövid kívánság
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="5"
                  placeholder="Példa: sétáljanak kézen fogva egy varázslatos erdőben..."
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
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
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-zinc-300"
                />
              </div>

              <div>
                <label className="mb-4 block text-sm text-zinc-400">
                  Hangulat finomhangolás
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTemplate(item.id)}
                      className={`rounded-3xl border p-5 text-left transition ${
                        template === item.id
                          ? "border-violet-400 bg-violet-400/10"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="mb-1 font-black">{item.title}</div>
                      <div className="text-sm text-zinc-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-4 block text-sm text-zinc-400">
                  Videó hossz / mód
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {videoModes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVideoMode(item.id)}
                      className={`rounded-3xl border p-5 text-left transition ${
                        videoMode === item.id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <div className="mb-1 font-black">{item.title}</div>
                          <div className="text-sm text-zinc-400">
                            {item.desc}
                          </div>
                        </div>

                        <div className="whitespace-nowrap font-black text-cyan-300">
                          {item.credits}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 text-sm leading-relaxed text-yellow-100">
                A Képlabor jelenleg korai béta. A nyilvános generálás még nem
                végleges szolgáltatás, a funkciók tesztüzemben működnek.
              </div>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 py-5 text-xl font-black shadow-lg shadow-violet-900/40 transition hover:scale-[1.015] disabled:opacity-60"
              >
                {loading ? "Jelenet készítése..." : "✨ Jelenet készítése"}
              </button>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-zinc-300">
                  {message}
                </div>
              )}

              {creditsLeft !== null && (
                <div className="text-sm text-zinc-400">
                  Maradék kredit: {creditsLeft}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                előnézet
              </p>
              <h3 className="text-4xl font-black">A jeleneted</h3>
            </div>

            <div className="space-y-6">
              <div className="flex h-[330px] items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-black/40">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="px-8 text-center text-zinc-500">
                    A feltöltött kép itt jelenik meg
                  </div>
                )}
              </div>

              <div className="flex h-[330px] items-center justify-center overflow-hidden rounded-[32px] border border-cyan-400/20 bg-black/40">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="px-8 text-center text-zinc-500">
                    A generált videó itt fog megjelenni
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                  <div className="mb-1 text-sm text-zinc-500">Élmény</div>
                  <div className="text-lg font-black">
                    {currentExperience?.icon} {currentExperience?.title}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                  <div className="mb-1 text-sm text-zinc-500">Mód</div>
                  <div className="text-lg font-black">
                    {videoModes.find((m) => m.id === videoMode)?.title}
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-r from-violet-600/10 to-cyan-500/10 p-6">
                <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-cyan-300">
                  termékirány
                </div>
                <p className="leading-relaxed text-zinc-300">
                  A cél az, hogy egy
                  képből cinematic, érzelmes vagy fantasy élményt kapjon pár
                  kattintással.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="rounded-[42px] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl backdrop-blur md:p-14">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
              Képlabor
            </p>

            <h3 className="mb-5 text-4xl font-black md:text-6xl">
              Egy kép. Egy érzés.
              <br />
              Egy mozgó pillanat.
            </h3>

            <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-zinc-400">
              Emlékekhez, szerelmes képekhez, fantasy jelenetekhez, cinematic
              önarcképekhez és kreatív social videókhoz. Egyszerűen,
              túlgondolás nélkül.
            </p>

            <button
              onClick={scrollToGenerator}
              className="rounded-2xl bg-white px-8 py-4 text-lg font-black text-black transition hover:scale-105"
            >
              Feltöltök egy képet →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}