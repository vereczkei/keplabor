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

const API_URL = "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run";

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

async function getAuthToken() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Nincs bejelentkezett felhasználó.");
  }

  return await currentUser.getIdToken();
}

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
  const [previewError, setPreviewError] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStep, setRenderStep] = useState(0);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  const renderSteps = [
    "Kép elemzése...",
    "Cinematic prompt építése...",
    "Kamera és mozgás tervezése...",
    "Fények és hangulat finomítása...",
    "Veo 3.1 Lite renderelés...",
    "Videó mentése...",
  ];

  const experiences = [
    {
      id: "luxury",
      icon: "💎",
      title: "Luxury",
      subtitle: "Prémium reklámfilm",
      mood: "premium",
      template: "luxury",
      prompt:
        "Luxus cinematic jelenet, elegáns mozgással, prémium fényekkel, finom széllel és high-end reklámfilm hangulattal.",
    },
    {
      id: "love",
      icon: "❤️",
      title: "Love",
      subtitle: "Romantikus páros",
      mood: "romantic",
      template: "dreamy",
      prompt:
        "Romantikus cinematic jelenet, lágy fényekkel, természetes mosollyal, finom mozgással és meghitt szerelmes hangulattal.",
    },
    {
      id: "memory",
      icon: "🕯️",
      title: "Memory",
      subtitle: "Mozgó emlék",
      mood: "emotional",
      template: "minimal",
      prompt:
        "Megható, finom mozgású emlékvideó, lágy természetes fényekkel, tiszteletteljes és nosztalgikus hangulattal.",
    },
    {
      id: "fantasy",
      icon: "🌌",
      title: "Fantasy",
      subtitle: "Varázslatos világ",
      mood: "dreamy",
      template: "dreamy",
      prompt:
        "Varázslatos fantasy cinematic jelenet, ragyogó fényekkel, lebegő részecskékkel, álomszerű háttérrel és elegáns mozgással.",
    },
    {
      id: "celebrity",
      icon: "📸",
      title: "Celebrity",
      subtitle: "Glamour hatás",
      mood: "premium",
      template: "luxury",
      prompt:
        "Glamour celebrity cinematic jelenet, prémium fényekkel, kameravillanásokkal, elegáns pózzal és vörös szőnyeg hangulattal.",
    },
    {
      id: "cinematic",
      icon: "🎬",
      title: "Cinematic",
      subtitle: "Filmes mozi hatás",
      mood: "dramatic",
      template: "dark-cinematic",
      prompt:
        "Prémium cinematic jelenet, lassú kameramozgással, drámai de ízléses fényekkel és filmes hangulattal.",
    },
  ];

  const moods = [
    { id: "premium", icon: "💼", title: "Premium" },
    { id: "romantic", icon: "🌹", title: "Romantic" },
    { id: "emotional", icon: "🕯️", title: "Emotional" },
    { id: "dreamy", icon: "✨", title: "Dreamy" },
    { id: "dramatic", icon: "🌑", title: "Dramatic" },
    { id: "viral", icon: "⚡", title: "Viral" },
  ];

  const templates = [
    { id: "auto", title: "Auto AI" },
    { id: "luxury", title: "Luxury Glow" },
    { id: "dark-cinematic", title: "Dark Cinematic" },
    { id: "dreamy", title: "Dreamy Soft" },
    { id: "tiktok-fast", title: "Viral Motion" },
    { id: "minimal", title: "Soft Minimal" },
  ];

  const videoModes = [
    {
      id: "clip_6s",
      title: "6 mp",
      desc: "gyors cinematic klip",
      credits: 1,
      label: "1 kredit",
    },
    {
      id: "clip_8s",
      title: "8 mp",
      desc: "hosszabb prémium jelenet",
      credits: 2,
      label: "2 kredit",
    },
  ];

  const pricingPackages = [
    {
      id: "starter",
      title: "Starter",
      price: "1 990 Ft",
      credits: 5,
      desc: "kb. 5 rövid vagy 2 hosszabb videó",
      highlight: false,
    },
    {
      id: "creator",
      title: "Creator",
      price: "4 990 Ft",
      credits: 15,
      desc: "kb. 15 rövid vagy 7 hosszabb videó",
      highlight: true,
    },
    {
      id: "pro",
      title: "Pro",
      price: "9 990 Ft",
      credits: 35,
      desc: "tartalomgyártóknak és ügyfélmunkára",
      highlight: false,
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
        checkCredits(false);
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
      setRenderProgress((prev) =>
        Math.min(prev + Math.floor(Math.random() * 5) + 2, 94)
      );

      setRenderStep((prev) => (prev + 1) % renderSteps.length);
    }, 2200);

    return () => clearInterval(timer);
  }, [loading]);

  async function handleLogin() {
    try {
      setMessage("Google belépés indítása...");
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user?.email) {
        setUser(result.user);
        await checkCredits(false);
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

  async function checkCredits(showMsg = true) {
    if (!auth.currentUser) {
      if (showMsg) setMessage("Nincs bejelentkezett felhasználó.");
      return;
    }

    try {
      const token = await getAuthToken();

      const res = await fetch(`${API_URL}/check-credits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    if (!auth.currentUser) {
      setMessage("Először jelentkezz be Google fiókkal.");
      scrollToGenerator();
      return;
    }

    setBuying(true);
    setMessage("Stripe fizetés indítása...");

    try {
      const token = await getAuthToken();

      const res = await fetch(`${API_URL}/buy-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
    if (!auth.currentUser) {
      setMessage("Először jelentkezz be Google fiókkal.");
      scrollToGenerator();
      return;
    }

    if (!image) {
      setMessage("Először tölts fel egy képet.");
      scrollToGenerator();
      return;
    }

    if (creditsLeft !== null && creditsLeft < currentVideoMode.credits) {
      setMessage("Nincs elég kredited ehhez a videóhoz.");
      setShowPricing(true);
      setTimeout(scrollToPricing, 80);
      return;
    }

    setLoading(true);
    setRenderProgress(8);
    setRenderStep(0);
    setMessage("");
    setPreviewError("");
    setVideoUrl("");

    setTimeout(() => {
      document.getElementById("result")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    try {
      const token = await getAuthToken();
      const formData = new FormData();

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
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        if (data.error === "no_credits") {
          setPreviewError("Nincs elég kredited a generáláshoz.");
          setShowPricing(true);
          scrollToPricing();
        } else if (data.error === "generation_failed") {
          setPreviewError(
            "A Veo most nem tudta elkészíteni a videót. Próbáld újra pár perc múlva, vagy válassz egyszerűbb képet / másik hangulatot."
          );
        } else {
          setPreviewError("Hiba történt: " + data.error);
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
      setPreviewError("Szerver hiba történt generálás közben.");
    }

    setLoading(false);
  }

  function scrollToGenerator() {
    document.getElementById("generator")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function selectExperience(item) {
    setCategory(item.id);
    setText(item.prompt);
    setMood(item.mood || "premium");
    setTemplate(item.template || "auto");
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setVideoUrl("");
    setPreviewError("");
    setMessage("Kép kiválasztva. Indíthatod a generálást.");
  }

  const RenderLoadingCard = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-700/25 via-black to-cyan-500/20" />
      <div className="absolute h-44 w-44 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 mb-4 text-5xl">🎬</div>

      <div className="relative z-10 mb-2 text-xl font-black">
        AI videó készül
      </div>

      <div className="relative z-10 mb-5 max-w-xs text-sm text-zinc-300">
        {renderSteps[renderStep]}
      </div>

      <div className="relative z-10 w-full max-w-xs rounded-full bg-white/10 p-1">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300 transition-all duration-700"
          style={{ width: `${renderProgress}%` }}
        />
      </div>

      <div className="relative z-10 mt-3 text-xs font-bold text-cyan-300">
        {renderProgress}% · ne zárd be
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050816] pb-24 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-[360px] w-[360px] rounded-full bg-violet-700/25 blur-[120px]" />
        <div className="absolute right-[-170px] top-[300px] h-[480px] w-[480px] rounded-full bg-cyan-500/15 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
        <nav className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl shadow-lg shadow-violet-900/40">
              ✦
            </div>

            <div className="min-w-0 text-left">
              <div className="truncate text-2xl font-black tracking-tight md:text-3xl">
                Képlabor
              </div>
              <div className="hidden text-xs text-zinc-500 sm:block">
                magyar AI videólabor
              </div>
            </div>
          </button>

          {user ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
              <button
                onClick={scrollToPricing}
                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
              >
                {creditsLeft ?? "—"} kredit
              </button>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300"
              >
                Kilépés
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black shadow-lg shadow-violet-900/30"
            >
              Google belépés
            </button>
          )}
        </nav>

        <section className="mb-5 overflow-hidden rounded-[34px] border border-white/10 bg-black/35 shadow-2xl backdrop-blur md:grid md:grid-cols-[1fr_0.9fr] md:items-center">
          <div className="relative min-h-[560px] p-5 md:min-h-[620px] md:p-10">
            <video
              src="/hero-bg.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-[#050816]/40 via-[#050816]/52 to-[#050816]/95 md:bg-gradient-to-r md:from-[#050816]/90 md:via-[#050816]/68 md:to-[#050816]/35" />

            <div className="relative z-10 flex min-h-[520px] flex-col justify-between md:min-h-[560px]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/12 px-4 py-2 text-sm text-zinc-100 backdrop-blur">
                  🇭🇺 Magyar fejlesztésű AI videólabor
                </div>

                <h1 className="mb-4 text-[48px] font-black leading-[0.94] tracking-[-0.04em] md:text-7xl">
                  Egy fotóból
                  <span className="block bg-gradient-to-r from-violet-100 via-white to-cyan-200 bg-clip-text text-transparent">
                    filmjelenet.
                  </span>
                </h1>

                <p className="mb-5 max-w-xl text-[17px] leading-relaxed text-zinc-100 md:text-xl">
                  Tölts fel egy képet, válassz élményt, és készül egy 6–8
                  mp-es filmes AI videó. Nem kell promptoláshoz értened.
                </p>

                <div className="mb-5 flex flex-wrap gap-2">
                  {["1 kép", "6–8 mp", "Stripe fizetés", "Magyar felület"].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-zinc-100 backdrop-blur"
                      >
                        ✓ {item}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div>
                <button
                  onClick={scrollToGenerator}
                  className="mb-3 w-full rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 px-7 py-5 text-lg font-black shadow-lg shadow-violet-900/40 transition active:scale-[0.98] md:w-auto"
                >
                  Kipróbálom most →
                </button>

                <button
                  onClick={() => setShowPricing((v) => !v)}
                  className="w-full rounded-3xl border border-white/10 bg-white/10 px-7 py-4 font-black backdrop-blur transition active:scale-[0.98] md:ml-3 md:w-auto"
                >
                  Árak / kreditek
                </button>

                <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm text-yellow-100">
                  🚧 Korai béta, de valódi AI videót készít.
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0 md:p-8">
            <div className="rounded-[30px] border border-white/10 bg-black/45 p-3 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <div className="text-sm font-black">Valódi demo</div>
                  <div className="text-xs text-zinc-400">fotó → AI videó</div>
                </div>

                <div className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                  before / after
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <img
                  src="/oldal.png"
                  className="h-[260px] w-full rounded-3xl object-cover md:h-[380px]"
                  alt="Képlabor fotó példa"
                />

                <video
                  src="/oldal.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-[260px] w-full rounded-3xl object-cover md:h-[380px]"
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["1 kép", "feltöltés"],
                  ["AI", "prompt"],
                  ["6–8 mp", "videó"],
                ].map(([a, b]) => (
                  <div
                    key={a}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="font-black">{a}</div>
                    <div className="text-xs text-zinc-400">{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="generator"
          className="mb-6 rounded-[34px] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur md:p-8"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                generátor
              </p>

              <h2 className="text-3xl font-black md:text-5xl">
                Készíts saját videót
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
                Kép → élmény → generálás. A részletes opciók el vannak rejtve,
                hogy mobilon ne legyen végtelen görgetés.
              </p>
            </div>

            {user && (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-right text-xs font-bold text-cyan-200">
                {creditsLeft ?? "—"}
                <br />
                kredit
              </div>
            )}
          </div>

          {!user && (
            <button
              onClick={handleLogin}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-3xl bg-white px-5 py-4 text-lg font-black text-black shadow-lg shadow-violet-900/20"
            >
              <span className="text-2xl">G</span>
              Folytatás Google fiókkal
            </button>
          )}

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-black text-zinc-200">
                    1. Kép
                  </label>

                  {imagePreview && (
                    <span className="text-xs font-bold text-cyan-300">
                      kiválasztva
                    </span>
                  )}
                </div>

                <label className="group flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-[30px] border border-dashed border-cyan-400/30 bg-black/30 p-4 text-center transition hover:border-cyan-300 hover:bg-cyan-400/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      className="max-h-[300px] w-full rounded-3xl object-cover"
                      alt="Feltöltött kép előnézet"
                    />
                  ) : (
                    <>
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 text-3xl shadow-lg shadow-violet-900/40">
                        📸
                      </div>

                      <div className="mb-1 text-xl font-black">
                        Kép feltöltése
                      </div>

                      <div className="max-w-xs text-sm text-zinc-400">
                        Portré, páros fotó, termék, autó vagy emlék.
                      </div>
                    </>
                  )}
                </label>
              </div>

              <div>
                <label className="mb-3 block text-sm font-black text-zinc-200">
                  2. Élmény
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {experiences.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectExperience(item)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        category === item.id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="text-lg">{item.icon}</div>
                      <div className="text-sm font-black">{item.title}</div>
                      <div className="truncate text-[11px] text-zinc-400">
                        {item.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-black text-zinc-200">
                  3. Hossz
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {videoModes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVideoMode(item.id)}
                      className={`rounded-2xl border p-4 text-left ${
                        videoMode === item.id
                          ? "border-violet-400 bg-violet-400/10"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="font-black">{item.title}</div>
                      <div className="text-xs text-zinc-400">{item.desc}</div>
                      <div className="mt-2 text-sm font-black text-cyan-300">
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200"
              >
                {showAdvanced
                  ? "Haladó opciók bezárása"
                  : "Extra kérés / haladó opciók"}
              </button>

              {showAdvanced && (
                <div className="space-y-4 rounded-3xl border border-white/10 bg-black/25 p-4">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows="4"
                    placeholder="Pl.: lassú kameramozgás, szél fújja a hajat, prémium reklámfilm hangulat..."
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                  />

                  <div>
                    <div className="mb-2 text-xs font-black text-zinc-400">
                      Hangulat
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {moods.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setMood(item.id)}
                          className={`rounded-xl border px-2 py-2 text-xs font-bold ${
                            mood === item.id
                              ? "border-fuchsia-300 bg-fuchsia-400/10"
                              : "border-white/10 bg-black/30"
                          }`}
                        >
                          {item.icon} {item.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-black text-zinc-400">
                      Stílus
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {templates.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setTemplate(item.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                            template === item.id
                              ? "border-violet-300 bg-violet-400/10"
                              : "border-white/10 bg-black/30"
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={generateVideo}
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 py-5 text-lg font-black shadow-lg shadow-violet-900/40 transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? "🎬 AI jelenet készül..."
                  : `✨ Generálás — ${currentVideoMode?.label}`}
              </button>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">
                  {message}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-cyan-300">
                      Kiválasztott élmény
                    </div>

                    <div className="text-2xl font-black">
                      {currentExperience?.icon} {currentExperience?.title}
                    </div>
                  </div>

                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                    {currentVideoMode?.label}
                  </div>
                </div>

                <div
                  id="result"
                  className="flex h-[360px] items-center justify-center overflow-hidden rounded-[26px] border border-cyan-400/20 bg-black/45 md:h-[500px]"
                >
                  {loading ? (
                    <RenderLoadingCard />
                  ) : videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      className="h-full w-full object-cover"
                    />
                  ) : previewError ? (
                    <div className="px-6 text-center">
                      <div className="mb-3 text-5xl">⚠️</div>

                      <div className="mb-2 text-xl font-black text-red-200">
                        Nem sikerült
                      </div>

                      <p className="text-sm leading-relaxed text-zinc-300">
                        {previewError}
                      </p>

                      <button
                        onClick={generateVideo}
                        className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-black"
                      >
                        Újrapróbálom
                      </button>
                    </div>
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      className="h-full w-full object-cover opacity-80"
                      alt="Feltöltött kép"
                    />
                  ) : (
                    <div className="px-8 text-center text-zinc-500">
                      Itt jelenik meg a képed, majd a kész videó.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-zinc-300">
                <strong className="text-white">Röviden:</strong> a Képlabor a
                kiválasztott élményből és a képből épít cinematic promptot. A
                usernek nem kell technikai promptot írnia.
              </div>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="mb-6 rounded-[34px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl backdrop-blur md:p-8"
        >
          <button
            onClick={() => setShowPricing((v) => !v)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                árak
              </p>

              <h2 className="text-3xl font-black">Egyszerű kreditek</h2>

              <p className="mt-2 text-sm text-zinc-400">
                6 mp = 1 kredit, 8 mp = 2 kredit. Nincs havi előfizetés.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">
              {showPricing ? "−" : "+"}
            </div>
          </button>

          {showPricing && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {pricingPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-3xl border p-5 ${
                    pkg.highlight
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-white/10 bg-black/25"
                  }`}
                >
                  {pkg.highlight && (
                    <div className="mb-3 inline-flex rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-black">
                      ajánlott
                    </div>
                  )}

                  <h3 className="text-2xl font-black">{pkg.title}</h3>

                  <div className="mt-2 text-3xl font-black">{pkg.price}</div>

                  <div className="mt-1 font-bold text-cyan-300">
                    {pkg.credits} kredit
                  </div>

                  <p className="mt-3 min-h-[44px] text-sm text-zinc-400">
                    {pkg.desc}
                  </p>

                  <button
                    onClick={() => buyCredits(pkg.id)}
                    disabled={buying}
                    className={`mt-5 w-full rounded-2xl px-4 py-4 font-black ${
                      pkg.highlight
                        ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {buying ? "Indítás..." : "Megveszem"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-[34px] border border-white/10 bg-black/25 p-5 shadow-2xl backdrop-blur md:p-8">
          <button
            onClick={() => setShowLegal((v) => !v)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-violet-300">
                jogi információk
              </p>

              <h2 className="text-2xl font-black">
                ÁSZF, adatkezelés és felhasználási feltételek
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Rövid, általános tájékoztató a szolgáltatás használatáról.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">
              {showLegal ? "−" : "+"}
            </div>
          </button>

          {showLegal && (
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-zinc-300">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Általános Szerződési Feltételek
                </h3>

                <p>
                  A Képlabor egy online AI videógeneráló szolgáltatás, amely a
                  felhasználó által feltöltött képből és kiválasztott
                  beállításokból mesterséges intelligencia segítségével videós
                  tartalmat készít. A szolgáltatás használatával a felhasználó
                  elfogadja, hogy a generált eredmény minősége függhet a
                  feltöltött kép minőségétől, a választott stílustól, az AI
                  modell aktuális működésétől és a rendszer terheltségétől.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Kreditek és fizetés
                </h3>

                <p>
                  A szolgáltatás kreditalapú rendszerben működik. A felhasználó
                  kreditcsomagot vásárolhat, amelyet videógenerálásra használhat
                  fel. A fizetés külső fizetési szolgáltatón, például Stripe-on
                  keresztül történhet. Sikertelen generálás esetén a rendszer
                  célja, hogy ne vonjon le kreditet, vagy technikai hiba esetén
                  a felhasználó kérhesse a jóváírás ellenőrzését.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Feltöltött tartalom
                </h3>

                <p>
                  A felhasználó kizárólag olyan képet tölthet fel, amelynek
                  használatára jogosult. Tilos más személy jogait, jó hírnevét,
                  személyiségi jogait vagy szerzői jogait sértő tartalmat
                  feltölteni. A felhasználó felel a feltöltött kép jogszerű
                  használatáért.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Adatkezelés
                </h3>

                <p>
                  A Képlabor a szolgáltatás működéséhez szükséges adatokat,
                  például e-mail címet, kreditállapotot, fizetési státuszt és a
                  generáláshoz szükséges feltöltött képet kezelheti. A fizetési
                  adatokat a fizetési szolgáltató kezeli. A szolgáltatás célja,
                  hogy csak a működéshez szükséges adatokat használja.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Béta működés
                </h3>

                <p>
                  A szolgáltatás jelenleg korai béta állapotban is működhet,
                  ezért előfordulhatnak technikai hibák, lassabb generálási idők
                  vagy változó minőségű eredmények. A fejlesztő fenntartja a
                  jogot a funkciók, árak, kreditértékek és szolgáltatási
                  feltételek módosítására.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 text-yellow-100">
                <strong>Fontos:</strong> ez egy általános, ideiglenes jogi
                szöveg. Éles fizetéses működés előtt érdemes hivatalos ÁSZF-et,
                adatkezelési tájékoztatót és impresszumot készíteni.
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="mb-2 text-lg font-black text-white">
                  Kapcsolat
                </h3>

                <p>
                  Kérdés, technikai hiba vagy kreditprobléma esetén a
                  szolgáltatóval a weboldalon megadott kapcsolati e-mail címen
                  lehet egyeztetni.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[34px] border border-white/10 bg-black/25 p-5 text-center shadow-2xl backdrop-blur md:p-10">
          <h2 className="mb-3 text-3xl font-black md:text-5xl">
            Egy kép. Egy érzés. Egy videó.
          </h2>

          <p className="mx-auto mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Emlékekhez, szerelmes képekhez, fantasy jelenetekhez, luxury social
            tartalmakhoz és cinematic AI videókhoz.
          </p>

          <button
            onClick={scrollToGenerator}
            className="rounded-3xl bg-white px-7 py-4 font-black text-black"
          >
            Feltöltök egy képet →
          </button>
        </section>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-50 rounded-3xl border border-white/10 bg-[#090b16]/90 p-3 shadow-2xl backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black">1 kép → AI videó</div>
            <div className="text-xs text-zinc-400">6 mp már 1 kredit</div>
          </div>

          <button
            onClick={scrollToGenerator}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-sm font-black"
          >
            Kezdés
          </button>
        </div>
      </div>
    </div>
  );
}