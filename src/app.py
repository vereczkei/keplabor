import os
import uuid
import time
import subprocess
import modal
import stripe

from google import genai
from google.genai import types

from fastapi import (
    FastAPI,
    Request,
    UploadFile,
    File,
    Form,
    Header,
    HTTPException,
)

from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# =========================
# SAJÁT TESZT EMAIL
# =========================

MY_TEST_EMAIL = "vereczkeijanosgabor@gmail.com"

# =========================
# MODAL IMAGE
# =========================

image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi[standard]",
        "stripe",
        "pillow",
        "google-genai",
    )
)

app = modal.App("video-test", image=image)
api = FastAPI()

users_db = modal.Dict.from_name("video-users-db", create_if_missing=True)
video_volume = modal.Volume.from_name("keplabor-videos", create_if_missing=True)

MODAL_BASE_URL = "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run"
FRONTEND_URL = "https://keplabor.hu"
VIDEO_DIR = "/outputs"

# =========================
# CORS
# =========================

api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://keplabor.hu",
        "https://www.keplabor.hu",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# STRIPE PACKAGES
# =========================

CREDIT_PACKAGES = {
    "starter": {
        "name": "Képlabor Starter kreditcsomag",
        "credits": 5,
        "amount_huf": 1990,
        "description": "5 kredit cinematic AI videókhoz",
    },
    "creator": {
        "name": "Képlabor Creator kreditcsomag",
        "credits": 15,
        "amount_huf": 4990,
        "description": "15 kredit rendszeres tartalomkészítéshez",
    },
    "pro": {
        "name": "Képlabor Pro kreditcsomag",
        "credits": 35,
        "amount_huf": 9990,
        "description": "35 kredit creatoroknak és vállalkozásoknak",
    },
}

# =========================
# VIDEO MODES
# =========================

VIDEO_MODES = {
    "clip_6s": {
        "duration": 6,
        "credit_cost": 1,
        "label": "6 mp cinematic klip",
    },
    "clip_8s": {
        "duration": 8,
        "credit_cost": 2,
        "label": "8 mp prémium jelenet",
    },
    "simple_clip": {
        "duration": 6,
        "credit_cost": 1,
        "label": "6 mp cinematic klip",
    },
    "short_ad": {
        "duration": 8,
        "credit_cost": 2,
        "label": "8 mp prémium jelenet",
    },
}

DISABLED_VIDEO_MODES = {"narrated_ad"}

# =========================
# KÉPLABOR CINEMATIC PROMPT ENGINE V2
# =========================

ALLOWED_CATEGORIES = {
    "auto",
    "cinematic",
    "luxury",
    "love",
    "fantasy",
    "memory",
    "celebrity",
    "product",
    "funny",
}

ALLOWED_TEMPLATES = {
    "auto",
    "luxury",
    "dark-cinematic",
    "tiktok-fast",
    "minimal",
    "dreamy",
}

ALLOWED_MOODS = {
    "auto",
    "emotional",
    "epic",
    "dreamy",
    "dramatic",
    "romantic",
    "premium",
    "viral",
    "calm",
}

THEME_PRESETS = {
    "luxury": {
        "camera": "Smooth slow tracking shot with subtle dolly-in movement",
        "scene": "premium luxury commercial atmosphere",
        "lighting": "golden rim light, glossy reflections, soft cinematic highlights",
        "motion": "subtle wind, elegant fabric movement, slow confident reveal",
        "audio": "soft premium ambient music, subtle camera flash sounds if appropriate",
        "style": "high-end fashion advertisement, expensive brand film, polished realism",
    },
    "love": {
        "camera": "Soft handheld cinematic close-up with gentle push-in",
        "scene": "romantic emotional moment with warm intimate atmosphere",
        "lighting": "golden hour light, soft glow, gentle highlights on the face",
        "motion": "slow natural movement, warm breeze, emotional micro expressions",
        "audio": "soft romantic piano ambience, gentle natural background sound",
        "style": "wedding film, emotional love story, elegant romantic realism",
    },
    "fantasy": {
        "camera": "Floating cinematic camera movement with slow magical reveal",
        "scene": "dreamlike fantasy environment surrounding the original subject",
        "lighting": "soft magical glow, volumetric light, floating particles",
        "motion": "subtle magical atmosphere, glowing particles, cinematic environmental movement",
        "audio": "soft fantasy ambience, light magical shimmer, orchestral undertone",
        "style": "epic fantasy film look, magical but realistic, elegant transformation",
    },
    "memory": {
        "camera": "Slow nostalgic camera push-in with gentle parallax",
        "scene": "emotional memory scene based on the uploaded real photo",
        "lighting": "soft warm natural light, nostalgic glow, delicate contrast",
        "motion": "very subtle life-like movement, gentle breathing, soft background movement",
        "audio": "soft emotional piano, warm ambient room tone",
        "style": "respectful memory film, documentary emotional realism, no exaggeration",
    },
    "celebrity": {
        "camera": "Red carpet cinematic tracking shot with controlled paparazzi energy",
        "scene": "premium celebrity arrival scene, glamorous public moment",
        "lighting": "flash photography, luxury night lighting, glossy reflections",
        "motion": "hair and clothing move naturally, camera flashes, elegant walking or posing",
        "audio": "distant crowd ambience, camera shutters, premium cinematic music",
        "style": "glamour magazine commercial, red carpet film, realistic celebrity atmosphere",
    },
    "product": {
        "camera": "Macro cinematic product shot with smooth orbiting movement",
        "scene": "premium product advertisement environment",
        "lighting": "studio highlights, controlled reflections, clean shadows",
        "motion": "slow product reveal, rotating light reflections, elegant background motion",
        "audio": "clean premium product sound design, subtle whoosh, soft brand ambience",
        "style": "Apple-style clean commercial, luxury product film, minimal premium realism",
    },
    "funny": {
        "camera": "Dynamic social media camera movement with clear readable composition",
        "scene": "playful viral cinematic moment",
        "lighting": "bright clean lighting, colorful but premium look",
        "motion": "expressive motion, fun reveal, but no chaotic distortion",
        "audio": "light playful sound design, short viral-style music hit",
        "style": "premium social media ad, playful but high-quality",
    },
    "cinematic": {
        "camera": "Slow cinematic dolly-in with natural handheld realism",
        "scene": "premium cinematic scene based on the uploaded image",
        "lighting": "dramatic but tasteful film lighting, soft shadows, realistic highlights",
        "motion": "natural subject movement, subtle background depth, elegant reveal",
        "audio": "cinematic ambient music, natural environmental sound",
        "style": "movie trailer realism, premium film look, emotional visual storytelling",
    },
}

TEMPLATE_LAYERS = {
    "auto": "Let the AI director choose the best visual treatment while keeping the result premium and realistic.",
    "luxury": "Increase premium brand feeling, glossy reflections, elegant highlights, high-end commercial polish.",
    "dark-cinematic": "Use darker cinematic grading, dramatic shadows, controlled contrast, serious film atmosphere.",
    "tiktok-fast": "Use stronger first-second visual impact, dynamic reveal, social media energy, but keep it clean and premium.",
    "minimal": "Use clean composition, soft movement, minimal background complexity, elegant and simple premium result.",
    "dreamy": "Use soft dreamlike glow, gentle bokeh, smooth floating movement, emotional atmosphere.",
}

MOOD_LAYERS = {
    "auto": "Mood should match the selected theme naturally.",
    "emotional": "The mood is emotional, human, warm and meaningful.",
    "epic": "The mood is epic, large-scale, powerful and cinematic.",
    "dreamy": "The mood is dreamy, soft, magical and atmospheric.",
    "dramatic": "The mood is dramatic, intense, premium and film-like.",
    "romantic": "The mood is romantic, intimate, warm and beautiful.",
    "premium": "The mood is premium, elegant, expensive and polished.",
    "viral": "The mood is attention-grabbing, social-first and instantly impressive.",
    "calm": "The mood is calm, soft, elegant and peaceful.",
}

VIDEO_MODE_PROMPTS = {
    "clip_6s": "Create a clean 6-second cinematic moment with one strong visual idea and immediate wow effect.",
    "clip_8s": "Create an 8-second premium cinematic scene with richer atmosphere, smoother build-up and stronger reveal.",
    "simple_clip": "Create a clean 6-second cinematic moment with one strong visual idea and immediate wow effect.",
    "short_ad": "Create an 8-second premium cinematic scene with richer atmosphere, smoother build-up and stronger reveal.",
}

IDENTITY_LOCK_LAYER = """
CRITICAL IMAGE CONSISTENCY RULES:
- Use the uploaded image as the exact visual reference.
- Preserve the person's face, identity, age impression, body shape, hairstyle and main clothing.
- Do not replace the person with another model.
- Do not change the main outfit unless the selected theme absolutely requires only subtle styling.
- Keep the original pose and composition recognizable, but add cinematic motion.
- If there is a product, car, pet, object or place in the image, preserve its core appearance.
"""
COUPLE_LAYER = """
If multiple people are present:
- preserve all faces and identities consistently
- maintain relationship positioning and body proportions
- do not replace either person
- keep realistic interaction and natural eye contact
- avoid morphing or identity drift between subjects
"""

QUALITY_LAYER = """
QUALITY RULES:
- Premium cinematic realism.
- Natural camera motion.
- No warped faces.
- No broken hands.
- No flickering.
- No random text.
- No subtitles.
- No logos.
- No watermark.
- No UI elements.
- No cheap fantasy overload.
- No chaotic motion.
- Clean composition.
- Realistic lighting.
- High-end commercial quality.
"""

# =========================
# HELPERS
# =========================

def get_stripe():
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe


def get_gemini_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def require_app_secret(x_app_secret: str = Header(None)):
    if x_app_secret != os.environ["APP_SECRET"]:
        raise HTTPException(status_code=403, detail="Forbidden")


def require_test_email(email: str):
    if not email:
        raise HTTPException(status_code=400, detail="missing_email")

    if email.strip().lower() != MY_TEST_EMAIL.strip().lower():
        raise HTTPException(
            status_code=403,
            detail="A Veo teszt jelenleg csak belső használatra engedélyezett.",
        )


def clean_text(text: str):
    return (
        (text or "")
        .replace("'", "")
        .replace(":", "")
        .replace("\\", "")
        .replace("\n", " ")
    )


def normalize_choice(value: str, allowed: set[str], default: str):
    value = (value or default).strip().lower()
    return value if value in allowed else default


def get_video_settings(video_mode: str):
    if video_mode in DISABLED_VIDEO_MODES:
        return {
            "error": "video_mode_disabled",
            "message": "Ez a videó mód jelenleg nincs bekapcsolva.",
        }

    return VIDEO_MODES.get(video_mode, VIDEO_MODES["clip_6s"])


def choose_category(text: str, filename: str = ""):
    t = (text or "").lower()
    f = (filename or "").lower()

    if any(w in t for w in ["luxus", "premium", "prémium", "autó", "ingatlan", "óra", "ékszer", "fashion"]):
        return "luxury"

    if any(w in t for w in ["celeb", "sztár", "celebrity", "red carpet", "paparazzi", "híresség"]):
        return "celebrity"

    if any(w in t for w in ["termék", "product", "reklám", "brand", "márka", "üzlet"]):
        return "product"

    if any(w in t for w in ["szerelem", "romantikus", "esküvő", "love", "pár"]):
        return "love"

    if any(w in t for w in ["emlék", "család", "régi kép", "megható", "memory"]):
        return "memory"

    if any(w in t for w in ["fantasy", "varázs", "mágia", "álom", "mese"]):
        return "fantasy"

    if any(w in t for w in ["vicces", "funny", "poén", "tiktok", "virális"]):
        return "funny"

    if any(w in f for w in ["car", "auto", "luxury", "watch", "jewelry"]):
        return "luxury"

    return "cinematic"


def choose_template(text: str, filename: str = ""):
    t = (text or "").lower()
    f = (filename or "").lower()

    if any(w in t for w in ["luxus", "premium", "prémium", "autó", "ingatlan", "óra", "ékszer"]):
        return "luxury"

    if any(w in t for w in ["tiktok", "virális", "gyors", "reels", "social"]):
        return "tiktok-fast"

    if any(w in t for w in ["dark", "cinematic", "film", "titok", "misztikus", "sötét", "drámai"]):
        return "dark-cinematic"

    if any(w in t for w in ["álom", "dream", "dreamy", "puha", "lebegő"]):
        return "dreamy"

    if any(w in t for w in ["minimal", "egyszerű", "clean", "letisztult"]):
        return "minimal"

    if any(w in f for w in ["car", "auto", "luxury"]):
        return "luxury"

    return "auto"


def choose_mood(text: str):
    t = (text or "").lower()

    if any(w in t for w in ["megható", "emlék", "család", "sírás", "érzelmes"]):
        return "emotional"

    if any(w in t for w in ["epic", "grandiózus", "nagy", "hősies"]):
        return "epic"

    if any(w in t for w in ["álom", "dream", "dreamy", "varázs", "mágia"]):
        return "dreamy"

    if any(w in t for w in ["dráma", "drámai", "sötét", "komoly"]):
        return "dramatic"

    if any(w in t for w in ["romantikus", "szerelem", "esküvő", "love"]):
        return "romantic"

    if any(w in t for w in ["luxus", "premium", "prémium", "elegáns"]):
        return "premium"

    if any(w in t for w in ["tiktok", "viral", "virális", "reels"]):
        return "viral"

    return "auto"


def build_cinematic_prompt(
    category: str,
    template: str,
    video_mode: str,
    user_extra_text: str = "",
    mood: str = "auto",
):
    category = normalize_choice(category, ALLOWED_CATEGORIES, "cinematic")
    template = normalize_choice(template, ALLOWED_TEMPLATES, "auto")
    mood = normalize_choice(mood, ALLOWED_MOODS, "auto")

    if category == "auto":
        category = choose_category(user_extra_text)

    if template == "auto":
        template = choose_template(user_extra_text)

    if mood == "auto":
        mood = choose_mood(user_extra_text)

    preset = THEME_PRESETS.get(category, THEME_PRESETS["cinematic"])
    template_layer = TEMPLATE_LAYERS.get(template, TEMPLATE_LAYERS["auto"])
    mood_layer = MOOD_LAYERS.get(mood, MOOD_LAYERS["auto"])
    video_layer = VIDEO_MODE_PROMPTS.get(video_mode, VIDEO_MODE_PROMPTS["clip_6s"])

    extra = (user_extra_text or "").strip()

    user_layer = (
        f"Extra user direction: {extra}"
        if extra
        else "No extra user direction. Follow the selected Képlabor preset."
    )

    return f"""
KÉPLABOR VEO 3.1 LITE CINEMATIC DIRECTOR PROMPT

Generate an image-to-video cinematic scene from the uploaded image.

CAMERA:
{preset["camera"]}

SCENE:
{preset["scene"]}

LIGHTING:
{preset["lighting"]}

MOTION:
{preset["motion"]}

STYLE:
{preset["style"]}

MOOD:
{mood_layer}

TEMPLATE:
{template_layer}

VIDEO LENGTH:
{video_layer}

AUDIO:
{preset["audio"]}

USER REQUEST:
{user_layer}

{IDENTITY_LOCK_LAYER}

{COUPLE_LAYER}

{QUALITY_LAYER}

Final goal:
Create a premium, emotionally clear, social-ready cinematic video that feels like a high-end AI commercial, not a generic AI effect.
""".strip()


def style_for_template(template: str):
    if template == "luxury":
        return {
            "font_color": "white",
            "font_size": "62",
            "box_color": "black@0.42",
            "bg": "black",
        }

    if template == "tiktok-fast":
        return {
            "font_color": "white",
            "font_size": "68",
            "box_color": "0xff0050@0.55",
            "bg": "black",
        }

    if template == "minimal":
        return {
            "font_color": "black",
            "font_size": "52",
            "box_color": "white@0.72",
            "bg": "white",
        }

    return {
        "font_color": "white",
        "font_size": "58",
        "box_color": "black@0.52",
        "bg": "black",
    }


def create_caption_text(category: str, video_mode: str):
    if category == "luxury":
        return "Luxury cinematic"
    if category == "love":
        return "Romantic moment"
    if category == "memory":
        return "Moving memory"
    if category == "fantasy":
        return "Fantasy scene"
    if category == "celebrity":
        return "Celebrity moment"
    if category == "product":
        return "Premium product"
    if category == "funny":
        return "Viral moment"
    return "Cinematic scene"


def create_fallback_preview_video(
    image_path: str | None,
    final_video_path: str,
    caption_text: str,
    template: str,
    duration: int,
):
    safe_caption = clean_text(caption_text)
    style = style_for_template(template)

    raw_video_path = final_video_path.replace(".mp4", "_raw.mp4")

    if image_path:
        vf = (
            "scale=1200:-1,"
            "zoompan=z='min(zoom+0.0012,1.16)':"
            "x='iw/2-(iw/zoom/2)':"
            "y='ih/2-(ih/zoom/2)':"
            f"d={duration * 30}:"
            "s=1080x1920:fps=30,"
            f"drawtext=text='{safe_caption}':"
            f"fontcolor={style['font_color']}:"
            f"fontsize={style['font_size']}:"
            "x=(w-text_w)/2:"
            "y=h*0.80:"
            "box=1:"
            f"boxcolor={style['box_color']}:"
            "boxborderw=24"
        )

        cmd = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", image_path,
            "-vf", vf,
            "-t", str(duration),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            raw_video_path,
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i",
            f"color=c={style['bg']}:s=1080x1920:d={duration}",
            "-vf",
            (
                f"drawtext=text='{safe_caption}':"
                f"fontcolor={style['font_color']}:"
                f"fontsize={style['font_size']}:"
                "x=(w-text_w)/2:"
                "y=(h-text_h)/2:"
                "box=1:"
                f"boxcolor={style['box_color']}:"
                "boxborderw=24"
            ),
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            raw_video_path,
        ]

    subprocess.run(cmd, check=True)

    compress_cmd = [
        "ffmpeg",
        "-y",
        "-i",
        raw_video_path,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        final_video_path,
    ]

    subprocess.run(compress_cmd, check=True)


def generate_with_veo_lite(
    image_path: str | None,
    prompt: str,
    final_video_path: str,
    duration: int,
):
    if duration not in [6, 8]:
        raise ValueError("Veo Lite tesztnél csak 6 vagy 8 mp engedélyezett.")

    client = get_gemini_client()

    config = types.GenerateVideosConfig(
        number_of_videos=1,
        duration_seconds=duration,
        aspect_ratio="9:16",
        resolution="720p",
        person_generation="allow_adult",
    )

    image_input = None
    if image_path:
        image_input = types.Image.from_file(location=image_path)

    operation = client.models.generate_videos(
        model="veo-3.1-lite-generate-preview",
        prompt=prompt,
        image=image_input,
        config=config,
    )

    while not operation.done:
        time.sleep(10)
        operation = client.operations.get(operation)

    if not operation.response or not operation.response.generated_videos:
        print("FULL VEO OPERATION:", operation)
        print("VEO ERROR:", getattr(operation, "error", None))
        print("VEO RESPONSE:", getattr(operation, "response", None))

        raise RuntimeError(
            f"A Veo nem adott vissza videót. Error: {getattr(operation, 'error', None)}"
        )

    generated_video = operation.response.generated_videos[0]
    client.files.download(file=generated_video.video)
    generated_video.video.save(final_video_path)


def render_video(
    text: str,
    template: str,
    email: str,
    category: str = "cinematic",
    video_mode: str = "clip_6s",
    image_path: str | None = None,
    mood: str = "auto",
):
    require_test_email(email)

    settings = get_video_settings(video_mode)

    if settings.get("error"):
        return settings

    duration = int(settings["duration"])
    credit_cost = int(settings["credit_cost"])

    credits = int(users_db.get(email, 0))

    if credits < credit_cost:
        return {
            "error": "no_credits",
            "message": "Nincs elég kredited.",
            "required_credits": credit_cost,
            "credits_left": credits,
        }

    video_id = str(uuid.uuid4())
    final_video_path = f"{VIDEO_DIR}/{video_id}.mp4"

    cinematic_prompt = build_cinematic_prompt(
        category=category,
        template=template,
        video_mode=video_mode,
        user_extra_text=text,
        mood=mood,
    )

    try:
        generate_with_veo_lite(
            image_path=image_path,
            prompt=cinematic_prompt,
            final_video_path=final_video_path,
            duration=duration,
        )

        users_db[email] = credits - credit_cost
        video_volume.commit()

    except Exception as e:
        print("VEO GENERATION ERROR:", e)
        return {
            "error": "generation_failed",
            "message": str(e),
            "credits_left": credits,
            "engine": "veo_3_1_lite",
            "cinematic_prompt": cinematic_prompt,
        }

    return {
        "video_id": video_id,
        "category": category,
        "template": template,
        "mood": mood,
        "video_mode": video_mode,
        "duration": duration,
        "credit_cost": credit_cost,
        "download": f"{MODAL_BASE_URL}/download/{video_id}",
        "credits_left": int(users_db.get(email, 0)),
        "cinematic_prompt": cinematic_prompt,
        "status": "ready",
        "engine": "veo_3_1_lite",
    }


# =========================
# ROUTES
# =========================

@api.get("/")
def home():
    return {
        "status": "ok",
        "message": "Képlabor backend fut",
        "engine": "veo_3_1_lite",
        "test_email_only": MY_TEST_EMAIL,
        "features": [
            "credits",
            "stripe_packages",
            "clip_6s",
            "clip_8s",
            "cinematic_prompt_engine_v2",
            "theme_presets",
            "mood_layers",
            "image_upload",
            "modal_volume_video_storage",
            "veo_3_1_lite_real_generation",
        ],
        "packages": CREDIT_PACKAGES,
        "video_modes": VIDEO_MODES,
        "categories": list(ALLOWED_CATEGORIES),
        "templates": list(ALLOWED_TEMPLATES),
        "moods": list(ALLOWED_MOODS),
    }


@api.post("/buy-credits")
async def buy_credits(
    request: Request,
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    data = await request.json()
    email = data.get("email")
    package_id = data.get("package_id", "starter")

    if not email:
        return {"error": "missing_email"}

    package = CREDIT_PACKAGES.get(package_id)

    if not package:
        return {
            "error": "invalid_package",
            "allowed_packages": list(CREDIT_PACKAGES.keys()),
        }

    try:
        stripe_client = get_stripe()

        session = stripe_client.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            customer_creation="always",
            customer_email=email,
            line_items=[
                {
                    "price_data": {
                        "currency": "huf",
                        "product_data": {
                            "name": package["name"],
                            "description": package["description"],
                        },
                        "unit_amount": int(package["amount_huf"]) * 100,
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "email": email,
                "package_id": package_id,
                "credits": str(package["credits"]),
                "amount_huf": str(package["amount_huf"]),
            },
            success_url=f"{FRONTEND_URL}/?payment=success",
            cancel_url=f"{FRONTEND_URL}/?payment=cancel",
        )

        return {
            "url": session.url,
            "package_id": package_id,
            "credits": package["credits"],
            "amount_huf": package["amount_huf"],
        }

    except Exception as e:
        print("STRIPE ERROR:", e)
        return {"error": str(e)}


@api.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig,
            os.environ["STRIPE_WEBHOOK_SECRET"],
        )
    except Exception as e:
        print("WEBHOOK ERROR:", e)
        return {"error": str(e)}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        metadata = session.get("metadata", {}) or {}

        email = metadata.get("email")
        credits_to_add = int(metadata.get("credits", 0))

        if not email and session.get("customer_details"):
            email = session["customer_details"].get("email")

        if email and credits_to_add > 0:
            current_credits = int(users_db.get(email, 0))
            users_db[email] = current_credits + credits_to_add

            print(
                f"CREDITS ADDED: {email} +{credits_to_add}, total={users_db[email]}"
            )

    return {"ok": True}


@api.post("/check-credits")
async def check_credits(
    request: Request,
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    data = await request.json()
    email = data.get("email")

    if not email:
        return {"error": "missing_email"}

    return {
        "email": email,
        "credits": int(users_db.get(email, 0)),
    }


@api.post("/admin-add-credits")
async def admin_add_credits(
    request: Request,
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    data = await request.json()
    email = data.get("email")
    amount = int(data.get("amount", 0))

    if not email:
        return {"error": "missing_email"}

    if email.strip().lower() != MY_TEST_EMAIL.strip().lower():
        return {"error": "only_test_email_allowed"}

    if amount <= 0 or amount > 100:
        return {"error": "invalid_amount"}

    current = int(users_db.get(email, 0))
    users_db[email] = current + amount

    return {
        "ok": True,
        "email": email,
        "credits_added": amount,
        "credits": int(users_db.get(email, 0)),
    }


@api.post("/text-to-video")
async def text_to_video(
    request: Request,
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    payload = await request.json()

    email = payload.get("email")
    text = payload.get("text", "")
    category = payload.get("category", "cinematic")
    template = payload.get("template", "auto")
    mood = payload.get("mood", "auto")
    video_mode = payload.get("video_mode", "clip_6s")

    if not email:
        return {"error": "missing_email"}

    if category == "auto":
        category = choose_category(text)

    if template == "auto":
        template = choose_template(text)

    if mood == "auto":
        mood = choose_mood(text)

    return render_video(
        text=text,
        template=template,
        email=email,
        category=category,
        video_mode=video_mode,
        mood=mood,
    )


@api.post("/generate-from-image")
async def generate_from_image(
    x_app_secret: str = Header(None),
    email: str = Form(...),
    text: str = Form(""),
    category: str = Form("cinematic"),
    template: str = Form("auto"),
    mood: str = Form("auto"),
    video_mode: str = Form("clip_6s"),
    image_file: UploadFile = File(None),
):
    require_app_secret(x_app_secret)

    image_path = None
    filename = ""

    if not email:
        return {"error": "missing_email"}

    if image_file:
        filename = image_file.filename or "upload.jpg"
        safe_filename = filename.replace(" ", "_")
        image_path = f"/tmp/{uuid.uuid4()}_{safe_filename}"

        content = await image_file.read()

        with open(image_path, "wb") as f:
            f.write(content)

    if category == "auto":
        category = choose_category(text, filename)

    if template == "auto":
        template = choose_template(text, filename)

    if mood == "auto":
        mood = choose_mood(text)

    return render_video(
        text=text,
        template=template,
        email=email,
        category=category,
        video_mode=video_mode,
        image_path=image_path,
        mood=mood,
    )


@api.get("/download/{video_id}")
def download(video_id: str):
    video_path = f"{VIDEO_DIR}/{video_id}.mp4"

    if not os.path.exists(video_path):
        return {
            "error": "video_not_found",
            "message": "A videó nem található vagy még nem készült el.",
        }

    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename="keplabor-video.mp4",
    )


@app.function(
    secrets=[
        modal.Secret.from_name("stripe-secret"),
        modal.Secret.from_name("app-auth"),
        modal.Secret.from_name("gemini-secret"),
    ],
    volumes={
        VIDEO_DIR: video_volume,
    },
    timeout=900,
)
@modal.asgi_app()
def fastapi_app():
    os.makedirs(VIDEO_DIR, exist_ok=True)
    return api