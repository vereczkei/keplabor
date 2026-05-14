import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const API_URL =
  "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

const APP_SECRET = "keplabor_titkos_2026_vedelem";

export default function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [category, setCategory] = useState("cinematic");
  const [template, setTemplate] = useState("auto");
  const [videoMode, setVideoMode] = useState("clip_6s");

  const [videoUrl, setVideoUrl] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

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
      desc: "A rendszer választja ki a legjobb filmes hangulatot",
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
      id: "clip_6s",
      title: "6 mp cinematic klip",
      desc: "Gyors, filmszerű AI jelenet képből",
      credits: 3,
      label: "3 kredit",
    },
    {
      id: "clip_8s",
      title: "8 mp cinematic+",
      desc: "Hosszabb, prémiumabb cinematic élmény",
      credits: 4,
      label: "4 kredit",
    },
  ];

  const pricingPackages = [
    {
      id: "starter",
      badge: "Kezdéshez",
      title: "Starter",
      price: "2490 Ft",
      credits: 12,
      desc: "4 db cinematic videó vagy 3 db 8 mp-es cinematic+ jelenet",
      highlight: false,
      cta: "Starter csomag",
    },
    {
      id: "creator",
      badge: "Legjobb választás",
      title: "Creator",
      price: "4 990 Ft",
      credits: 32,
      desc: "10+ cinematic AI videó Legjobb választás",
      highlight: true,
      cta: "Creator csomag",
    },
    {
      id: "pro",
      badge: "Tartalomgyártóknak",
      title: "Pro",
      price: "8 990 Ft",
      credits: 70,
      desc: "Akár 20+ cinematic videó Future premium render",
      highlight: false,
      cta: "Pro csomag",
    },
  ];

  const currentExperience = experiences.find((item) => item.id === category);
  const currentVideoMode = videoModes.find((item) => item.id === videoMode);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);

      if (data.user?.email) {
        setEmail(data.user.email);
        checkCredits(data.user.email, false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        setEmail(session.user.email);
        checkCredits(session.user.email, false);
        setMessage("Sikeres belépés. Most már tudsz kreditet vásárolni vagy videót generálni.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    if (!email) {
      setMessage("Adj meg email címet a belépéshez.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
  console.log(error);
  setMessage("Belépési hiba: " + error.message);
  return;
}

    setMessage("Elküldtük a biztonságos belépési linket emailben.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setEmail("");
    setCreditsLeft(null);
    setMessage("Kiléptél a fiókból.");
  }

  async function checkCredits(targetEmail = email, showMsg = true) {
    if (!targetEmail) {
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
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();

      if (data.error) {
        if (showMsg) setMessage("Kredit ellenőrzési hiba.");
        return;
      }

      setCreditsLeft(data.credits);

      if (showMsg) {
        setMessage(`Aktuális kredited: ${data.credits}`);
      }
    } catch (err) {
      if (showMsg) setMessage("Szerver hiba kredit ellenőrzésnél.");
    }
  }

  async function buyCredits(packageId = "starter") {
    if (!user?.email && !email) {
      setMessage("Először jelentkezz be vagy add meg az emailed.");
      scrollToGenerator();
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
        body: JSON.stringify({
          email: user?.email || email,
          package_id: packageId,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Stripe hiba. Az app.py backendben is engedélyezni kell a csomagválasztást.");
      }
    } catch (err) {
      setMessage("Stripe szerver hiba.");
    }

    setBuying(false);
  }

  async function generateVideo() {
    if (!user?.email) {
      setMessage("Először jelentkezz be. Emaillel kapsz egy biztonságos belépési linket.");
      scrollToGenerator();
      return;
    }

    if (!image) {
      setMessage("Először tölts fel egy képet. Erre készül majd a cinematic AI videó.");
      return;
    }

    if (creditsLeft !== null && creditsLeft < currentVideoMode.credits) {
      setMessage("Nincs elég kredited ehhez a videóhoz. Válassz kreditcsomagot az áraknál.");
      scrollToPricing();
      return;
    }

    setLoading(true);
    setMessage("A Képlabor most filmes jelenetté alakítja a képed...");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("email", user.email);
      formData.append("text", text || currentExperience?.prompt || "");
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
          setMessage("Nincs elég kredited a generáláshoz.");
          scrollToPricing();
        } else {
          setMessage("Hiba: " + data.error);
        }

        setLoading(false);
        return;
      }

      setVideoUrl(data.download);
      setCreditsLeft(data.credits_left);
      setMessage("Elkészült a cinematic AI videód.");
    } catch (err) {
      setMessage("Szerver hiba generálás közben.");
    }

    setLoading(false);
  }

  function scrollToGenerator() {
    document.getElementById("generator")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function selectExperience(item) {
    setCategory(item.id);
    setText(item.prompt);
  }

  const BeforeAfterBlock = ({ mobile = false }) => (
    <div className="relative mx-auto max-w-[640px] lg:max-w-none lg:translate-x-[-10px] lg:scale-[0.96]">
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
                mobile ? "h-[220px]" : "h-[320px]"
              }`}
              alt="Képlabor before példa"
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
              preload="metadata"
              className={`w-full rounded-3xl border border-cyan-400/25 object-cover shadow-2xl ${
                mobile ? "h-[220px]" : "h-[320px]"
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ["1 kép", "feltöltés"],
            ["AI", "filmes mozgás"],
            ["6–8 mp", "videó"],
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

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-violet-700/25 blur-[130px]" />
        <div className="absolute right-[-160px] top-[240px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[150px]" />
        <div className="absolute bottom-[-180px] left-[20%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-8">
        <nav className="mb-8 flex items-center justify-between gap-3 md:mb-14">
          <button
            onClick={scrollToGenerator}
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl shadow-lg shadow-violet-900/40">
              ✦
            </div>
            <div className="min-w-0">
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
            <button onClick={scrollToPricing} className="hover:text-white">
              Árak
            </button>
            <button className="hover:text-white">Béta</button>
          </div>

          {user ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
              <div className="hidden md:block">
                <div className="max-w-[170px] truncate text-xs text-zinc-300">
                  {user.email}
                </div>
                <div className="text-[11px] text-cyan-300">
                  {creditsLeft ?? "—"} kredit
                </div>
              </div>

              <button
                onClick={scrollToPricing}
                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black transition hover:scale-105 md:text-sm"
              >
                Kredit
              </button>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white md:text-sm"
              >
                Kilépés
              </button>
            </div>
          ) : (
            <button
              onClick={scrollToGenerator}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 text-xs font-black text-white shadow-lg shadow-violet-900/30 transition hover:scale-105 md:px-5 md:text-sm"
            >
              Belépés / Regisztráció
            </button>
          )}
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
              🇭🇺 Magyar AI cinematic élmény
            </div>

            <h2 className="mb-5 text-5xl font-black leading-[0.95]">
              Egy fotóból
              <span className="block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                filmjelenet.
              </span>
            </h2>

            <p className="mb-5 text-lg leading-relaxed text-zinc-300">
              Nem kell promptot írnod. Feltöltöd a képet, kiválasztod a
              hangulatot, és a Képlabor filmes AI videót készít belőle.
            </p>

            <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
              🚧 Korai béta: a generálás még tesztüzemben van.
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3">
              <button
                onClick={scrollToGenerator}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-4 font-black shadow-lg shadow-violet-900/40"
              >
                Képet töltök fel →
              </button>

              <button
                onClick={scrollToPricing}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-bold backdrop-blur"
              >
                Árak
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
              Kép feltöltés, hangulatválasztás, generálás. A filmes promptokat
              a Képlabor rakja össze helyetted.
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

              <button
                onClick={scrollToPricing}
                className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold backdrop-blur transition hover:border-white/30"
              >
                Árak megtekintése
              </button>
            </div>

            <div className="grid max-w-2xl grid-cols-3 gap-3">
              {["Nincs prompt hiba", "Preset alapú flow", "6–8 mp cinematic"].map(
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
              Előre felépített cinematic élményekkel dolgozik, hogy ne kelljen
              technikai promptokkal bajlódni.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {experiences.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  selectExperience(item);
                  scrollToGenerator();
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
                Jelentkezz be, tölts fel egy képet, válassz hangulatot, és indulhat a cinematic AI generálás.
              </p>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur md:p-6">
  <div className="mb-3">
    <h3 className="text-2xl font-black">
      {user ? "Fiók" : "Belépés vagy ingyenes fiók"}
    </h3>

    <p className="mt-2 text-zinc-400">
      {user
        ? "Be vagy jelentkezve a Képlaborba."
        : "Add meg az emailed, küldünk egy biztonságos belépési linket. Nincs jelszó, nincs bonyolult regisztráció."}
    </p>
  </div>

  {user ? (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
        <div className="mb-1 text-sm text-cyan-200">
          Bejelentkezve
        </div>

        <div className="truncate font-bold text-white">
          {user.email}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={checkCredits}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 font-bold transition hover:border-white/30"
        >
          Kreditek
        </button>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 font-bold text-red-200 transition hover:bg-red-400/20"
        >
          Kilépés
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <input
        type="email"
        placeholder="Email címed"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className="w-full rounded-2xl border border-cyan-400/60 bg-black/40 px-5 py-4 text-lg text-white outline-none transition focus:border-cyan-300"
      />

      <button
        onClick={handleLogin}
        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-4 text-lg font-black shadow-lg shadow-violet-900/40 transition hover:scale-[1.01]"
      >
        Link küldése
      </button>

      <div className="text-center text-sm text-zinc-500">
        🔒 Biztonságos és jelszómentes belépés
      </div>
    </div>
  )}
</div>

              <div>
                <label className="mb-4 block text-sm text-zinc-400">
                  Kép feltöltése
                </label>

                <label className="group flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed border-cyan-400/30 bg-black/30 p-6 text-center transition hover:border-cyan-300 hover:bg-cyan-400/5">
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
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="w-full">
                      <img
                        src={imagePreview}
                        className="mx-auto max-h-[260px] w-full rounded-3xl object-cover"
                        alt="Feltöltött kép előnézet"
                      />
                      <div className="mt-4 text-sm font-bold text-cyan-300">
                        Kép kiválasztva — kattints ide a cseréhez
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 text-3xl shadow-lg shadow-violet-900/40 transition group-hover:scale-105">
                        📸
                      </div>
                      <div className="mb-2 text-xl font-black">
                        Kattints ide a kép feltöltéséhez
                      </div>
                      <div className="max-w-sm text-sm leading-relaxed text-zinc-400">
                        Portré, családi fotó, termékkép, autó, ékszer vagy bármilyen jelenet, amit mozgó cinematic videóvá alakítanál.
                      </div>
                    </>
                  )}
                </label>
              </div>

              <div>
                <label className="mb-4 block text-sm text-zinc-400">
                  Válassz élményt
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {experiences.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectExperience(item)}
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
                  Extra kérés — opcionális
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="4"
                  placeholder="Példa: legyen lassú kameramozgás, szél fújja a haját, prémium reklámfilm hangulat..."
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none transition focus:border-cyan-400"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Nem kötelező. A filmes alap promptot a kiválasztott preset adja.
                </p>
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
                  Videó hossz
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
                          {item.label}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 text-sm leading-relaxed text-yellow-100">
                A Képlabor jelenleg korai béta. A generált videók minősége képtől és jelenettől függhet.
              </div>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 py-5 text-xl font-black shadow-lg shadow-violet-900/40 transition hover:scale-[1.015] disabled:opacity-60"
              >
                {loading
                  ? "🎬 Jelenet készítése..."
                  : `✨ Jelenet készítése — ${currentVideoMode?.label}`}
              </button>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-zinc-300">
                  {message}
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
                    alt="Feltöltött kép"
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
                    {currentVideoMode?.title}
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-r from-violet-600/10 to-cyan-500/10 p-6">
                <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-cyan-300">
                  termékirány
                </div>
                <p className="leading-relaxed text-zinc-300">
                  A cél az, hogy egy képből cinematic, érzelmes vagy fantasy élményt kapjon pár kattintással — technikai AI dashboard nélkül.
                </p>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6">
                <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-violet-300">
                  Gyors árlogika
                </div>
                <div className="space-y-3 text-sm text-zinc-300">
                  <div className="flex justify-between gap-3">
                    <span>6 mp cinematic klip</span>
                    <strong className="text-cyan-300">3 kredit</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>8 mp prémium jelenet</span>
                    <strong className="text-cyan-300">4 kredit</strong>
                  </div>
                  <button
                    onClick={scrollToPricing}
                    className="mt-3 w-full rounded-2xl bg-white px-4 py-3 font-black text-black transition hover:scale-[1.02]"
                  >
                    Kreditcsomagok megnyitása
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mb-20">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                árak és kreditek
              </p>
              <h3 className="text-4xl font-black md:text-5xl">
                Egyszerű kreditrendszer.
              </h3>
            </div>

            <p className="max-w-xl text-zinc-400">
              Csak akkor fizetsz, amikor tényleg videót szeretnél készíteni.
              Nincs havi előfizetés az induló MVP-ben.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {pricingPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative overflow-hidden rounded-[34px] border p-6 shadow-2xl backdrop-blur ${
                  pkg.highlight
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-black">
                    ajánlott
                  </div>
                )}

                <div className="mb-5 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-zinc-300">
                  {pkg.badge}
                </div>

                <h4 className="mb-2 text-3xl font-black">{pkg.title}</h4>

                <div className="mb-2 text-4xl font-black">
                  {pkg.price}
                </div>

                <div className="mb-5 text-cyan-300">
                  {pkg.credits} kredit
                </div>

                <p className="mb-6 min-h-[72px] leading-relaxed text-zinc-300">
                  {pkg.desc}
                </p>

                <button
                  onClick={() => buyCredits(pkg.id)}
                  disabled={buying}
                  className={`w-full rounded-2xl px-5 py-4 font-black transition hover:scale-[1.02] disabled:opacity-60 ${
                    pkg.highlight
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-cyan-950/40"
                      : "bg-white text-black"
                  }`}
                >
                  {buying ? "Fizetés indítása..." : pkg.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[30px] border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-zinc-400">
            <strong className="text-white">Kredit használat:</strong> 6 mp videó = 3 kredit, 8 mp videó = 4 kredit. A 30 mp-es mód egyelőre nincs bekapcsolva, hogy az MVP gyorsabb és kiszámíthatóbb legyen.
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
              Emlékekhez, szerelmes képekhez, fantasy jelenetekhez, cinematic önarcképekhez és kreatív social videókhoz. Egyszerűen, túlgondolás nélkül.
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