import os
import uuid
import subprocess
import modal
import stripe
from openai import OpenAI

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
# MODAL IMAGE
# =========================

image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi[standard]",
        "stripe",
        "pillow",
        "openai",
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

    # Régi frontend kompatibilitás
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
# CINEMATIC PROMPT ENGINE
# =========================

BASE_PRESETS = {
    "memory": """
Emotional cinematic memory scene from a real photo.
Gentle camera movement, soft natural light, respectful atmosphere.
The subject should remain recognizable and realistic.
Subtle motion only, warm emotional tone, nostalgic feeling.
No exaggerated fantasy elements unless requested.
""",
    "fantasy": """
Magical fantasy cinematic transformation from a real photo.
Dreamlike atmosphere, glowing particles, epic but elegant visual style.
Slow camera movement, rich environmental depth, cinematic lighting.
Keep the original subject recognizable while enhancing the world around it.
""",
    "cinematic": """
Premium cinematic scene from a real photo.
Slow camera movement, dramatic but tasteful lighting, movie-like realism.
High-end composition, shallow depth of field, elegant motion.
Natural subject consistency, realistic details, emotional visual storytelling.
""",
    "love": """
Romantic cinematic scene from a real photo.
Soft golden light, emotional atmosphere, gentle camera movement.
Wedding film feeling, intimate and beautiful mood.
Keep the subject realistic and flattering, avoid exaggerated artificial effects.
""",
    "luxury": """
Luxury cinematic commercial scene from a real photo.
Premium lighting, elegant reflections, high-end fashion or product commercial feeling.
Slow confident camera movement, expensive visual atmosphere.
Clean composition, polished cinematic realism, premium brand aesthetic.
""",
    "funny": """
Playful cinematic social video from a real photo.
Lighthearted motion, expressive but safe transformation, viral social media energy.
Keep the scene visually clean and understandable.
Avoid chaotic or low-quality effects.
""",
}

TEMPLATE_LAYERS = {
    "auto": """
Let the AI director choose the best cinematic treatment based on the selected preset.
Prioritize a clean, premium, visually impressive result.
""",
    "dark-cinematic": """
Dark cinematic grade, dramatic shadows, premium contrast, moody film lighting.
Slow controlled camera movement, serious high-quality atmosphere.
""",
    "luxury": """
Luxury glow, premium reflections, elegant highlights, high-end commercial style.
Clean expensive look, polished cinematic brand feeling.
""",
    "tiktok-fast": """
Social-first cinematic motion, more attention-grabbing movement, dynamic reveal.
Still keep the output premium, not cheap or chaotic.
""",
    "minimal": """
Soft minimal cinematic movement, clean composition, gentle realistic motion.
Avoid overcomplication, keep the feeling emotional and elegant.
""",
}

VIDEO_MODE_PROMPTS = {
    "clip_6s": """
Create a short 6-second cinematic moment.
One clear visual idea, clean movement, immediate wow effect.
""",
    "clip_8s": """
Create an 8-second premium cinematic scene.
More breathing room, stronger atmosphere, richer movement and more polished reveal.
""",
    "simple_clip": """
Create a short 6-second cinematic moment.
One clear visual idea, clean movement, immediate wow effect.
""",
    "short_ad": """
Create an 8-second premium cinematic scene.
More breathing room, stronger atmosphere, richer movement and more polished reveal.
""",
}

SAFETY_AND_QUALITY_LAYER = """
Important quality rules:
- Preserve the identity and main visual structure of the uploaded image.
- Do not radically change clothing, face, body shape, or main subject unless clearly requested.
- Avoid distorted hands, broken anatomy, flickering, warped faces, or chaotic motion.
- Keep the final result premium, cinematic, realistic and emotionally clear.
- Do not add text, subtitles, logos, watermarks, UI elements, or random symbols into the video.
- If the user gives an extra request, incorporate it naturally, but keep the Képlabor cinematic style.
"""

# =========================
# HELPERS
# =========================

def get_stripe():
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe


def get_openai_client():
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def require_app_secret(x_app_secret: str = Header(None)):
    if x_app_secret != os.environ["APP_SECRET"]:
        raise HTTPException(status_code=403, detail="Forbidden")


def clean_text(text: str):
    return (
        (text or "")
        .replace("'", "")
        .replace(":", "")
        .replace("\\", "")
        .replace("\n", " ")
    )


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

    if any(w in t for w in ["szerelem", "romantikus", "esküvő", "love", "pár"]):
        return "love"

    if any(w in t for w in ["emlék", "család", "régi kép", "megható", "memory"]):
        return "memory"

    if any(w in t for w in ["fantasy", "varázs", "mágia", "álom", "mese"]):
        return "fantasy"

    if any(w in t for w in ["vicces", "funny", "poén", "tiktok", "virális"]):
        return "funny"

    if any(w in f for w in ["car", "auto", "luxury"]):
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

    if any(w in t for w in ["minimal", "egyszerű", "clean", "letisztult"]):
        return "minimal"

    if any(w in f for w in ["car", "auto", "luxury"]):
        return "luxury"

    return "auto"


def build_cinematic_prompt(
    category: str,
    template: str,
    video_mode: str,
    user_extra_text: str,
):
    base = BASE_PRESETS.get(category, BASE_PRESETS["cinematic"])
    template_layer = TEMPLATE_LAYERS.get(template, TEMPLATE_LAYERS["auto"])
    video_layer = VIDEO_MODE_PROMPTS.get(video_mode, VIDEO_MODE_PROMPTS["clip_6s"])

    extra = (user_extra_text or "").strip()

    if extra:
        extra_layer = f"""
Optional user request:
{extra}

Use this request as creative direction, but do not let it damage realism, identity consistency or cinematic quality.
"""
    else:
        extra_layer = """
No extra user request was provided.
Use the selected preset as the main creative direction.
"""

    final_prompt = f"""
KÉPLABOR CINEMATIC AI DIRECTOR PROMPT

Base cinematic preset:
{base}

Style layer:
{template_layer}

Video mode:
{video_layer}

User direction:
{extra_layer}

Quality and consistency:
{SAFETY_AND_QUALITY_LAYER}
"""

    return final_prompt.strip()


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


def generate_with_veo_placeholder(
    image_path: str | None,
    prompt: str,
    final_video_path: str,
    duration: int,
):
    """
    IDE JÖN MAJD A VALÓDI VEO 3.1 LITE PRODUCTION HÍVÁS.

    Jelenleg fallback preview videót készítünk ffmpeg-gel,
    hogy a teljes SaaS flow tesztelhető legyen:
    login -> kredit -> Stripe -> upload -> generate -> download.

    Amikor bekötöd a Veo-t:
    - image_path: feltöltött kép elérési útja
    - prompt: backend cinematic director prompt
    - duration: 6 vagy 8
    - final_video_path: ide mentsd a kész mp4-et
    """
    raise NotImplementedError("Veo production call még nincs bekötve.")


def render_video(
    text: str,
    template: str,
    email: str,
    category: str = "cinematic",
    video_mode: str = "clip_6s",
    image_path: str | None = None,
):
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
    )

    caption_text = create_caption_text(category, video_mode)

    try:
        # Később itt lesz a valódi Veo hívás.
        # Most direkt fallback megy, hogy a flow működjön.
        create_fallback_preview_video(
            image_path=image_path,
            final_video_path=final_video_path,
            caption_text=caption_text,
            template=template,
            duration=duration,
        )

        # Kredit levonás csak sikeres videókészítés után.
        users_db[email] = credits - credit_cost
        video_volume.commit()

    except Exception as e:
        print("VIDEO GENERATION ERROR:", e)
        return {
            "error": "generation_failed",
            "message": str(e),
            "credits_left": credits,
        }

    return {
        "video_id": video_id,
        "category": category,
        "template": template,
        "video_mode": video_mode,
        "duration": duration,
        "credit_cost": credit_cost,
        "download": f"{MODAL_BASE_URL}/download/{video_id}",
        "credits_left": int(users_db.get(email, 0)),
        "cinematic_prompt": cinematic_prompt,
        "status": "ready",
        "engine": "ffmpeg_fallback_until_veo_connected",
    }


# =========================
# ROUTES
# =========================

@api.get("/")
def home():
    return {
        "status": "ok",
        "message": "Képlabor backend fut",
        "features": [
            "credits",
            "stripe_packages",
            "clip_6s",
            "clip_8s",
            "cinematic_prompt_engine",
            "image_upload",
            "modal_volume_video_storage",
            "veo_ready_placeholder",
        ],
        "packages": CREDIT_PACKAGES,
        "video_modes": VIDEO_MODES,
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
    video_mode = payload.get("video_mode", "clip_6s")

    if not email:
        return {"error": "missing_email"}

    if category == "auto":
        category = choose_category(text)

    if template == "auto":
        template = choose_template(text)

    return render_video(
        text=text,
        template=template,
        email=email,
        category=category,
        video_mode=video_mode,
    )


@api.post("/generate-from-image")
async def generate_from_image(
    x_app_secret: str = Header(None),
    email: str = Form(...),
    text: str = Form(""),
    category: str = Form("cinematic"),
    template: str = Form("auto"),
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

    return render_video(
        text=text,
        template=template,
        email=email,
        category=category,
        video_mode=video_mode,
        image_path=image_path,
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
        modal.Secret.from_name("openai-secret"),
    ],
    volumes={
        VIDEO_DIR: video_volume,
    },
)
@modal.asgi_app()
def fastapi_app():
    os.makedirs(VIDEO_DIR, exist_ok=True)
    return api