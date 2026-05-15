import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const API_URL =
  "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

const APP_SECRET = "keplabor2026supersecret";

const firebaseConfig = {
  apiKey: "AIzaSyCmJTZJXdOUbQ6bf87IGsoDL46HDLZMQEU",
  authDomain: "keplabor-bf855.firebaseapp.com",
  projectId: "keplabor-bf855",
  storageBucket: "keplabor-bf855.firebasestorage.app",
  messagingSenderId: "802892388765",
  appId: "1:802892388765:web:81238171a28ff17a63f774",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [category, setCategory] = useState("luxury");
  const [template, setTemplate] = useState("auto");
  const [mood, setMood] = useState("premium");
  const [videoMode, setVideoMode] = useState("clip_6s");

  const [videoUrl, setVideoUrl] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStep, setRenderStep] = useState(0);

  const renderSteps = [
    "Feltöltött kép vizuális elemzése...",
    "Cinematic jelenet felépítése...",
    "Kamera és mozgás megtervezése...",
    "Fények, hangulat és atmoszféra finomítása...",
    "Veo 3.1 Lite renderelés fut...",
    "Videó mentése és előkészítése...",
    "Utolsó simítások...",
  ];

  const experiences = [
    {
      id: "luxury",
      icon: "💎",
      title: "Luxury",
      subtitle: "Prémium reklámfilm hangulat",
      mood: "premium",
      template: "luxury",
      prompt:
        "Luxus cinematic jelenet, elegáns mozgással, prémium fényekkel, finom széllel és high-end reklámfilm hangulattal.",
      gradient: "from-violet-500/25 via-cyan-400/10 to-fuchsia-500/20",
      tag: "Legjobb első tesztre",
    },
    {
      id: "love",
      icon: "❤️",
      title: "Love",
      subtitle: "Páros, romantikus, érzelmes",
      mood: "romantic",
      template: "dreamy",
      prompt:
        "Romantikus cinematic jelenet, lágy fényekkel, természetes mosollyal, finom mozgással és meghitt szerelmes hangulattal.",
      gradient: "from-rose-500/25 via-pink-500/10 to-orange-400/10",
      tag: "Páros képekhez",
    },
    {
      id: "memory",
      icon: "🕯️",
      title: "Memory",
      subtitle: "Régi fotóból mozgó emlék",
      mood: "emotional",
      template: "minimal",
      prompt:
        "Megható, finom mozgású emlékvideó, lágy természetes fényekkel, tiszteletteljes és nosztalgikus hangulattal.",
      gradient: "from-amber-400/25 via-orange-500/10 to-yellow-300/10",
      tag: "Családi fotókhoz",
    },
    {
      id: "fantasy",
      icon: "🌌",
      title: "Fantasy",
      subtitle: "Varázslatos, álomszerű világ",
      mood: "dreamy",
      template: "dreamy",
      prompt:
        "Varázslatos fantasy cinematic jelenet, ragyogó fényekkel, lebegő részecskékkel, álomszerű háttérrel és elegáns mozgással.",
      gradient: "from-fuchsia-500/25 via-violet-600/10 to-cyan-400/10",
      tag: "Wow effekt",
    },
    {
      id: "celebrity",
      icon: "📸",
      title: "Celebrity",
      subtitle: "Glamour, paparazzi, vörös szőnyeg",
      mood: "premium",
      template: "luxury",
      prompt:
        "Glamour celebrity cinematic jelenet, prémium fényekkel, kameravillanásokkal, elegáns pózzal és vörös szőnyeg hangulattal.",
      gradient: "from-yellow-300/20 via-violet-500/15 to-cyan-400/10",
      tag: "Social tartalomhoz",
    },
    {
      id: "cinematic",
      icon: "🎬",
      title: "Cinematic",
      subtitle: "Filmszerű, univerzális mozi hatás",
      mood: "dramatic",
      template: "dark-cinematic",
      prompt:
        "Prémium cinematic jelenet, lassú kameramozgással, drámai de ízléses fényekkel és filmes hangulattal.",
      gradient: "from-cyan-400/20 via-blue-600/10 to-violet-500/15",
      tag: "Általános választás",
    },
  ];

  const moods = [
    {
      id: "premium",
      icon: "💼",
      title: "Premium",
      desc: "drága, elegáns, reklámfilm",
    },
    {
      id: "romantic",
      icon: "🌹",
      title: "Romantic",
      desc: "meleg, szerelmes, meghitt",
    },
    {
      id: "emotional",
      icon: "🕯️",
      title: "Emotional",
      desc: "emberi, nosztalgikus, mély",
    },
    {
      id: "dreamy",
      icon: "✨",
      title: "Dreamy",
      desc: "puha, varázslatos, lebegő",
    },
    {
      id: "dramatic",
      icon: "🌑",
      title: "Dramatic",
      desc: "filmes, erős, kontrasztos",
    },
    {
      id: "viral",
      icon: "⚡",
      title: "Viral",
      desc: "gyorsabb, social, figyelemfogó",
    },
  ];

  const templates = [
    {
      id: "auto",
      title: "Auto AI",
      desc: "A rendszer választja ki a legjobb kezelést",
    },
    {
      id: "luxury",
      title: "Luxury Glow",
      desc: "Prémium fények, csillogás, reklámfilm",
    },
    {
      id: "dark-cinematic",
      title: "Dark Cinematic",
      desc: "Sötétebb, drámai, filmes tónus",
    },
    {
      id: "dreamy",
      title: "Dreamy Soft",
      desc: "Lágy, bokeh, álomszerű hangulat",
    },
    {
      id: "tiktok-fast",
      title: "Viral Motion",
      desc: "Erősebb első másodperc, social vibe",
    },
    {
      id: "minimal",
      title: "Soft Minimal",
      desc: "Letisztult, finom, érzelmes mozgás",
    },
  ];

  const videoModes = [
    {
      id: "clip_6s",
      title: "6 mp cinematic klip",
      desc: "Gyors, látványos első jelenet",
      credits: 1,
      label: "1 kredit",
    },
    {
      id: "clip_8s",
      title: "8 mp prémium jelenet",
      desc: "Hosszabb, erősebb atmoszféra",
      credits: 2,
      label: "2 kredit",
    },
  ];

  const pricingPackages = [
    {
      id: "starter",
      badge: "Kezdéshez",
      title: "Starter",
      price: "1 990 Ft",
      credits: 5,
      desc: "5 kredit gyors tesztekhez és első cinematic videókhoz.",
      highlight: false,
      cta: "Starter csomag",
    },
    {
      id: "creator",
      badge: "Legjobb választás",
      title: "Creator",
      price: "4 990 Ft",
      credits: 15,
      desc: "15 kredit rendszeres tartalomkészítéshez és több próbához.",
      highlight: true,
      cta: "Creator csomag",
    },
    {
      id: "pro",
      badge: "Tartalomgyártóknak",
      title: "Pro",
      price: "9 990 Ft",
      credits: 35,
      desc: "35 kredit vállalkozóknak, social videókhoz és ügyfélmunkákhoz.",
      highlight: false,
      cta: "Pro csomag",
    },
  ];

  const currentExperience = useMemo(
    () => experiences.find((item) => item.id === category) || experiences[0],
    [category]
  );

  const currentVideoMode = useMemo(
    () => videoModes.find((item) => item.id === videoMode) || videoModes[0],
    [videoMode]
  );

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser?.email) {
        checkCredits(firebaseUser.email, false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!loading) {
      setRenderProgress(0);
      setRenderStep(0);
      return;
    }

    const timer = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 94) return prev;
        const next = prev + Math.floor(Math.random() * 5) + 2;
        return Math.min(next, 94);
      });

      setRenderStep((prev) => (prev + 1) % renderSteps.length);
    }, 2500);

    return () => clearInterval(timer);
  }, [loading]);

  async function handleLogin() {
    try {
      setMessage("Google belépés indítása...");
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user?.email) {
        setUser(result.user);
        await checkCredits(result.user.email, false);
        setMessage("Sikeres belépés. Most már tudsz videót generálni.");
      }
    } catch (error) {
      console.log(error);
      setMessage("Google belépési hiba: " + error.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    setCreditsLeft(null);
    setMessage("Kiléptél a fiókból.");
  }

  async function checkCredits(targetEmail = user?.email, showMsg = true) {
    if (!targetEmail) {
      if (showMsg) setMessage("Nincs bejelentkezett email.");
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
      console.log(err);
      if (showMsg) setMessage("Szerver hiba kredit ellenőrzésnél.");
    }
  }

  async function buyCredits(packageId = "starter") {
    if (!user?.email) {
      setMessage("Először jelentkezz be Google fiókkal.");
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
          email: user.email,
          package_id: packageId,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Stripe hiba. Ellenőrizd a backend csomagbeállításait.");
      }
    } catch (err) {
      console.log(err);
      setMessage("Stripe szerver hiba.");
    }

    setBuying(false);
  }

  async function generateVideo() {
    if (!user?.email) {
      setMessage("Először jelentkezz be Google fiókkal.");
      scrollToGenerator();
      return;
    }

    if (!image) {
      setMessage("Először tölts fel egy képet.");
      return;
    }

    if (creditsLeft !== null && creditsLeft < currentVideoMode.credits) {
      setMessage("Nincs elég kredited ehhez a videóhoz.");
      scrollToPricing();
      return;
    }

    setLoading(true);
    setRenderProgress(8);
    setRenderStep(0);
    setMessage("A Képlabor elindította a cinematic AI renderelést...");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("email", user.email);
      formData.append("text", text || currentExperience?.prompt || "");
      formData.append("category", category);
      formData.append("template", template);
      formData.append("mood", mood);
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
        } else if (data.error === "generation_failed") {
          setMessage(
            "A Veo most nem tudta elkészíteni a videót. Próbáld újra egyszerűbb képpel vagy másik hangulattal."
          );
        } else {
          setMessage("Hiba: " + data.error);
        }

        setLoading(false);
        return;
      }

      setRenderProgress(100);
      setVideoUrl(data.download);
      setCreditsLeft(data.credits_left);
      setMessage("Elkészült a cinematic AI videód.");
    } catch (err) {
      console.log(err);
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
    setMood(item.mood || "auto");
    setTemplate(item.template || "auto");
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setVideoUrl("");
      setMessage("Kép kiválasztva. Most válassz élményt és indítsd a generálást.");
    }
  }

  const BeforeAfterBlock = ({ compact = false }) => (
    <div className="relative mx-auto w-full max-w-[700px]">
      <div className="absolute -inset-5 rounded-[42px] bg-gradient-to-r from-violet-600/25 via-cyan-500/10 to-fuchsia-500/20 blur-3xl" />

      <div className="relative rounded-[32px] border border-white/10 bg-black/35 p-3 shadow-2xl backdrop-blur-xl md:p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">
              Valódi Képlabor demo
            </div>
            <div className="text-xs text-zinc-400">
              Egy fotóból mozgó cinematic élmény
            </div>
          </div>

          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
            before → after
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 md:text-xs">
                Fotó
              </p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
                before
              </span>
            </div>

            <img
              src="/oldal.png"
              className={`w-full rounded-3xl border border-white/10 object-cover shadow-2xl ${
                compact ? "h-[190px]" : "h-[260px] md:h-[330px]"
              }`}
              alt="Képlabor before példa"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 md:text-xs">
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
                compact ? "h-[190px]" : "h-[260px] md:h-[330px]"
              }`}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            ["1 kép", "feltöltés"],
            ["AI", "prompt engine"],
            ["6–8 mp", "videó"],
          ].map(([top, bottom]) => (
            <div
              key={top}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center md:p-4"
            >
              <div className="text-base font-black md:text-2xl">{top}</div>
              <div className="text-[10px] text-zinc-400 md:text-xs">
                {bottom}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const StepBadge = ({ number, title, active }) => (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        active
          ? "border-cyan-300/40 bg-cyan-300/10 text-white"
          : "border-white/10 bg-white/[0.025] text-zinc-400"
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
          active ? "bg-cyan-300 text-black" : "bg-white/10 text-zinc-300"
        }`}
      >
        {number}
      </div>
      <div className="text-sm font-bold">{title}</div>
    </div>
  );

  const RenderLoadingCard = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-700/20 via-black to-cyan-500/20" />
      <div className="absolute h-52 w-52 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute h-72 w-72 rounded-full border border-cyan-300/10" />
      <div className="absolute h-44 w-44 rounded-full border border-violet-300/10" />

      <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-300/30 bg-white/10 text-4xl shadow-2xl shadow-cyan-950/40 backdrop-blur">
        🎬
      </div>

      <div className="relative z-10 mb-3 text-2xl font-black">
        AI cinematic render fut
      </div>

      <div className="relative z-10 mb-6 max-w-sm text-sm leading-relaxed text-zinc-300">
        {renderSteps[renderStep]}
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-full border border-white/10 bg-black/50 p-1">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300 transition-all duration-700"
          style={{ width: `${renderProgress}%` }}
        />
      </div>

      <div className="relative z-10 mt-3 text-xs font-bold text-cyan-300">
        {renderProgress}% · Ne zárd be ezt az ablakot
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-violet-700/25 blur-[130px]" />
        <div className="absolute right-[-160px] top-[240px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[150px]" />
        <div className="absolute bottom-[-180px] left-[20%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <nav className="mb-6 flex items-center justify-between gap-3 md:mb-10">
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
                magyar AI cinematic élménylabor
              </p>
            </div>
          </button>

          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <button onClick={scrollToGenerator} className="hover:text-white">
              Generátor
            </button>
            <button onClick={scrollToPricing} className="hover:text-white">
              Árak
            </button>
            <button onClick={scrollToGenerator} className="hover:text-white">
              Élmények
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-2 backdrop-blur md:px-3">
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
              onClick={handleLogin}
              className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-black shadow-lg shadow-violet-900/30 transition hover:scale-105 md:px-5 md:text-sm"
            >
              Google belépés
            </button>
          )}
        </nav>

        <section className="relative mb-10 overflow-hidden rounded-[34px] border border-white/10 bg-black/30 px-5 py-7 shadow-2xl backdrop-blur md:rounded-[46px] md:px-10 md:py-12 lg:grid lg:min-h-[720px] lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-14">
          <video
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-75 md:opacity-85"
          />
          <div className="absolute inset-0 bg-[#050816]/45 md:bg-gradient-to-r md:from-[#050816]/92 md:via-[#050816]/72 md:to-[#050816]/68" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,0.20),transparent_38%),radial-gradient(circle_at_85%_70%,rgba(34,211,238,0.18),transparent_36%)]" />

          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-zinc-200 backdrop-blur">
              <span>🇭🇺</span>
              Magyar fejlesztésű AI videólabor
            </div>

            <h2 className="mb-5 text-5xl font-black leading-[0.92] md:text-6xl xl:text-7xl">
              Egy fotóból
              <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent">
                filmjelenet.
              </span>
            </h2>

            <p className="mb-5 max-w-2xl text-lg leading-relaxed text-zinc-200 md:text-xl">
              Nem kell promptot írnod. Feltöltöd a képet, kiválasztod az
              élményt, és a Képlabor filmes AI prompt engine-je elkészíti a
              Veo 3.1 Lite jelenetet.
            </p>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "Kép feltöltés"],
                ["2", "Élmény választás"],
                ["3", "AI videó"],
              ].map(([num, title]) => (
                <div
                  key={num}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur"
                >
                  <div className="text-sm font-black text-cyan-300">
                    {num}. lépés
                  </div>
                  <div className="font-bold">{title}</div>
                </div>
              ))}
            </div>

            <div className="mb-7 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100 backdrop-blur">
              🚧 Korai béta: a generálás még tesztüzemben működik.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={scrollToGenerator}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-7 py-4 text-lg font-black shadow-lg shadow-violet-900/40 transition hover:scale-[1.03]"
              >
                Saját jelenetet kérek →
              </button>

              <button
                onClick={scrollToPricing}
                className="rounded-2xl border border-white/10 bg-white/8 px-7 py-4 font-bold backdrop-blur transition hover:border-white/30"
              >
                Kreditcsomagok
              </button>
            </div>

            <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3">
              {["Nincs promptolás", "Páros képekhez is", "6–8 mp videó"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-xs font-bold text-zinc-200 backdrop-blur md:text-sm"
                  >
                    ✅ {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="relative z-10 mt-8 lg:mt-0">
            <BeforeAfterBlock compact={false} />
          </div>
        </section>

        <section className="mb-14 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["10 mp alatt", "érthető flow"],
            ["Veo 3.1 Lite", "valódi AI videó"],
            ["Preset engine", "nem user prompt"],
            ["Magyar UX", "egyszerű használat"],
          ].map(([top, bottom]) => (
            <div
              key={top}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur"
            >
              <div className="text-xl font-black">{top}</div>
              <div className="mt-1 text-sm text-zinc-400">{bottom}</div>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                válassz élményt
              </p>
              <h3 className="text-4xl font-black md:text-5xl">
                Nem prompt. Hangulat.
              </h3>
            </div>

            <p className="max-w-xl text-zinc-400">
              A presetek mögött backend oldali cinematic prompt engine dolgozik:
              kamera, fény, mozgás, hangulat és identitásmegőrzés.
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
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                />
                <div className="absolute right-[-30px] top-[-30px] text-8xl opacity-10 transition group-hover:scale-110">
                  {item.icon}
                </div>

                <div className="relative">
                  <div className="mb-4 inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-zinc-300">
                    {item.tag}
                  </div>
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
          className="mb-20 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[38px] border border-white/10 bg-zinc-950/75 p-5 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-7">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
                generátor
              </p>
              <h3 className="mb-3 text-4xl font-black md:text-5xl">
                Tölts fel egy képet.
              </h3>
              <p className="text-zinc-400">
                A rendszer nem rád bízza a promptírást. Te élményt választasz,
                a Képlabor megírja a filmes Veo utasítást.
              </p>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3">
              <StepBadge number="1" title="Kép" active={!!imagePreview} />
              <StepBadge number="2" title="Élmény" active={!!category} />
              <StepBadge number="3" title="Generálás" active={!!videoUrl} />
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur md:p-6">
                {user ? (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm text-cyan-300">
                        Bejelentkezve
                      </div>
                      <div className="max-w-[260px] truncate font-black">
                        {user.email}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Kreditek:{" "}
                        <span className="font-black text-cyan-300">
                          {creditsLeft ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => checkCredits()}
                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-bold"
                      >
                        Frissítés
                      </button>

                      <button
                        onClick={handleLogout}
                        className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 font-bold text-red-200"
                      >
                        Kilépés
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="mb-2 text-2xl font-black">
                      Jelentkezz be a generáláshoz
                    </h4>
                    <p className="mb-4 text-zinc-400">
                      Google belépés után tudsz kreditet használni és videót
                      készíteni.
                    </p>

                    <button
                      onClick={handleLogin}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-lg font-black text-black shadow-lg shadow-violet-900/20 transition hover:scale-[1.01]"
                    >
                      <span className="text-2xl">G</span>
                      Folytatás Google fiókkal
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-4 block text-sm font-bold text-zinc-300">
                  1. Kép feltöltése
                </label>

                <label className="group flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed border-cyan-400/30 bg-black/30 p-5 text-center transition hover:border-cyan-300 hover:bg-cyan-400/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="w-full">
                      <img
                        src={imagePreview}
                        className="mx-auto max-h-[310px] w-full rounded-3xl object-cover"
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
                        Portré, páros kép, családi fotó, termék, autó, ékszer
                        vagy bármilyen jelenet.
                      </div>
                    </>
                  )}
                </label>
              </div>

              <div>
                <label className="mb-4 block text-sm font-bold text-zinc-300">
                  2. Élmény kiválasztása
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
                <label className="mb-4 block text-sm font-bold text-zinc-300">
                  3. Hangulat
                </label>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {moods.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMood(item.id)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        mood === item.id
                          ? "border-fuchsia-300 bg-fuchsia-400/10"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="mb-1 font-black">
                        {item.icon} {item.title}
                      </div>
                      <div className="text-xs text-zinc-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-4 block text-sm font-bold text-zinc-300">
                  Filmes stílus
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
                <label className="mb-4 block text-sm font-bold text-zinc-300">
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

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Extra kérés — opcionális
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="4"
                  placeholder="Példa: legyen lassú kameramozgás, szél fújja a hajat, prémium reklámfilm hangulat..."
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none transition focus:border-cyan-400"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Nem kötelező. Az alap cinematic promptot a kiválasztott élmény
                  adja.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 text-sm leading-relaxed text-yellow-100">
                A Képlabor jelenleg korai béta. A videó minősége függ a képtől,
                a szereplők számától és a választott jelenettől.
              </div>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 py-5 text-xl font-black shadow-lg shadow-violet-900/40 transition hover:scale-[1.015] disabled:opacity-60"
              >
                {loading
                  ? "🎬 AI jelenet készül..."
                  : `✨ Jelenet készítése — ${currentVideoMode?.label}`}
              </button>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-zinc-300">
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                előnézet
              </p>
              <h3 className="text-4xl font-black">A jeleneted</h3>
            </div>

            <div className="space-y-6">
              <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-black/40">
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

              <div className="flex h-[360px] items-center justify-center overflow-hidden rounded-[32px] border border-cyan-400/20 bg-black/40">
                {loading ? (
                  <RenderLoadingCard />
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
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
                  mi történik a háttérben?
                </div>
                <p className="leading-relaxed text-zinc-300">
                  A backend a kiválasztott élményből, hangulatból és stílusból
                  Veo 3.1 Lite kompatibilis cinematic rendezői promptot épít.
                  A usernek nem kell AI promptoláshoz értenie.
                </p>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6">
                <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-violet-300">
                  kredit logika
                </div>

                <div className="space-y-3 text-sm text-zinc-300">
                  <div className="flex justify-between gap-3">
                    <span>6 mp cinematic klip</span>
                    <strong className="text-cyan-300">1 kredit</strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>8 mp prémium jelenet</span>
                    <strong className="text-cyan-300">2 kredit</strong>
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

        <section className="mb-20 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: "🧠",
              title: "Nem kell promptot írni",
              text: "A Képlabor backend oldali prompt engine-je rakja össze a filmes utasításokat.",
            },
            {
              icon: "👥",
              title: "Páros képekhez is jó",
              text: "A prompt réteg külön figyel az arcok, ruhák és kapcsolatpozíció megtartására.",
            },
            {
              icon: "💎",
              title: "Social-ready látvány",
              text: "Luxury, Love, Memory, Fantasy és Celebrity élmények gyors tartalomkészítéshez.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur"
            >
              <div className="mb-4 text-4xl">{item.icon}</div>
              <h4 className="mb-2 text-2xl font-black">{item.title}</h4>
              <p className="leading-relaxed text-zinc-400">{item.text}</p>
            </div>
          ))}
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

                <div className="mb-2 text-4xl font-black">{pkg.price}</div>

                <div className="mb-5 text-cyan-300">{pkg.credits} kredit</div>

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
            <strong className="text-white">Kredit használat:</strong> 6 mp
            videó = 1 kredit, 8 mp videó = 2 kredit. Ez most a backend
            beállításaihoz igazodik.
          </div>
        </section>

        <section className="mb-20 rounded-[42px] border border-white/10 bg-white/[0.035] p-8 shadow-2xl backdrop-blur md:p-12">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
              gyakori kérdések
            </p>
            <h3 className="text-4xl font-black md:text-5xl">
              Amit érdemes tudni.
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                "Kell promptot írnom?",
                "Nem. A szövegmező opcionális. A lényeg az élmény, hangulat és kép kiválasztása.",
              ],
              [
                "Páros fotóval működik?",
                "Igen. Love, Memory és Luxury módban különösen jó irány, de a kép minősége számít.",
              ],
              [
                "Mikor von le kreditet?",
                "A backend sikeres generálás után von le kreditet. Hibánál nem kellene levonnia.",
              ],
              [
                "Miért béta?",
                "Mert a Veo generálás minősége képenként eltérhet, ezért még tesztelni és finomítani kell.",
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                className="rounded-3xl border border-white/10 bg-black/25 p-6"
              >
                <div className="mb-2 text-xl font-black">{q}</div>
                <div className="leading-relaxed text-zinc-400">{a}</div>
              </div>
            ))}
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
              Emlékekhez, szerelmes képekhez, fantasy jelenetekhez, luxury
              social tartalmakhoz és cinematic AI videókhoz.
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