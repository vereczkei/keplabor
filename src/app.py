import os
import uuid
import time
import json
import subprocess
import smtplib
from email.message import EmailMessage
import modal
import stripe
import firebase_admin

from google import genai
from google.genai import types

from firebase_admin import credentials
from firebase_admin import auth as firebase_auth

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

MY_TEST_EMAIL = "vereczkeijanosgabor@gmail.com"

image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi[standard]",
        "stripe",
        "pillow",
        "google-genai",
        "firebase-admin",
    )
)

app = modal.App("video-test", image=image)
api = FastAPI()

users_db = modal.Dict.from_name("video-users-db", create_if_missing=True)
capacity_db = modal.Dict.from_name("keplabor-capacity-db", create_if_missing=True)
notifications_db = modal.Dict.from_name("keplabor-notifications-db", create_if_missing=True)
videos_db = modal.Dict.from_name("keplabor-saved-videos-db", create_if_missing=True)
video_volume = modal.Volume.from_name("keplabor-videos", create_if_missing=True)

MODAL_BASE_URL = "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run"
FRONTEND_URL = "https://keplabor.hu"
VIDEO_DIR = "/outputs"

ADMIN_ALERT_EMAIL = os.environ.get("ADMIN_ALERT_EMAIL", "vereczkeijanosgabor@gmail.com")
DEFAULT_CAPACITY_SECONDS = int(os.environ.get("DEFAULT_CAPACITY_SECONDS", "480"))
ALERT_THRESHOLD_SECONDS = int(os.environ.get("ALERT_THRESHOLD_SECONDS", "30"))
BLOCK_THRESHOLD_SECONDS = int(os.environ.get("BLOCK_THRESHOLD_SECONDS", "15"))
MAX_SAVED_VIDEOS = 5

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

THEME_BLUEPRINTS = {
    "luxury": {
        "goal": "premium luxury commercial image-to-video scene with polished cinematic wow",
        "shot": "medium cinematic portrait or product-style hero shot with premium framing",
        "camera": "slow smooth dolly-in, subtle parallax, elegant commercial reveal",
        "motion": (
            "subtle wind, elegant fabric movement, natural subject motion, moving glossy reflections, "
            "premium light sweep, soft atmospheric depth and clean luxury reveal"
        ),
        "environment": (
            "high-end cinematic luxury atmosphere with moving reflections, soft premium depth, "
            "gentle commercial background motion while preserving the original subject and composition"
        ),
        "lighting": "golden rim light, soft cinematic highlights, glossy reflections, gentle moving light sweep",
        "style": "luxury fashion advertisement, expensive brand film, polished realism, premium social-ready cinematic look",
        "audio": "soft premium ambient music with elegant cinematic rise and subtle luxury atmosphere",
        "negative": (
            "text, subtitles, logos, watermark, distorted face, broken hands, flicker, chaotic motion, "
            "identity change, outfit replacement, excessive transformation"
        ),
    },
    "love": {
        "goal": "romantic cinematic image-to-video scene with emotional atmosphere",
        "shot": "soft medium close-up or gentle couple framing with warm emotional composition",
        "camera": "slow emotional push-in with soft handheld cinematic feeling and gentle parallax",
        "motion": (
            "natural smiles, subtle eye contact, gentle breeze, warm human micro movements, "
            "soft background glow and delicate romantic atmosphere"
        ),
        "environment": (
            "romantic atmosphere with soft background depth, warm light movement and gentle environmental motion "
            "without changing the people or relationship spacing"
        ),
        "lighting": "warm golden light, soft glow, gentle highlights on faces, subtle romantic light bloom",
        "style": "wedding film realism, intimate love story, elegant romantic cinematic look",
        "audio": "soft romantic piano ambience with warm natural background sound",
        "negative": (
            "identity drift, swapped faces, distorted faces, text, logos, watermark, chaotic movement, "
            "sexualized movement, aggressive transformation"
        ),
    },
    "memory": {
        "goal": "emotional memory film from a real photo with respectful subtle motion",
        "shot": "nostalgic medium shot with respectful composition",
        "camera": "slow nostalgic push-in with gentle parallax and calm documentary movement",
        "motion": (
            "very subtle lifelike movement, soft background motion, gentle breathing or expression, "
            "small nostalgic light movement"
        ),
        "environment": "warm memory atmosphere, realistic and respectful, slight environmental depth and soft emotional glow",
        "lighting": "soft warm natural light, nostalgic glow, delicate contrast, gentle highlight movement",
        "style": "documentary memory film, emotional realism, respectful family-photo atmosphere",
        "audio": "soft emotional piano with warm ambient room tone",
        "negative": (
            "exaggerated fantasy, face distortion, identity drift, text, logos, watermark, aggressive effects, "
            "changing age, changing identity"
        ),
    },
    "fantasy": {
        "goal": "magical fantasy cinematic scene with stable elegant wow effect",
        "shot": "cinematic subject shot with magical background depth and clean reveal",
        "camera": "slow floating cinematic camera movement with gentle parallax",
        "motion": (
            "floating glowing particles, soft magical atmosphere, gentle background motion, "
            "subtle light pulses, elegant cinematic reveal, soft environmental depth"
        ),
        "environment": (
            "dreamlike fantasy atmosphere added to the original scene, with soft glow, light particles "
            "and gentle volumetric depth while preserving the original image structure, subject identity and composition"
        ),
        "lighting": "soft magical glow, gentle volumetric light, subtle highlight movement, clean cinematic color shift",
        "style": "magical realistic fantasy film look, elegant cinematic atmosphere, clean premium visual effects",
        "audio": "soft fantasy ambience with light magical shimmer and subtle cinematic rise",
        "negative": (
            "overloaded effects, changed identity, distorted anatomy, text, logos, watermark, face morphing, "
            "body transformation, horror elements, chaotic particles, aggressive transformation, full environment replacement"
        ),
    },
    "celebrity": {
        "goal": "glamour celebrity cinematic scene with premium social wow effect",
        "shot": "red carpet style medium shot with glossy editorial framing",
        "camera": "controlled tracking shot with subtle paparazzi energy, slow push-in and premium glamour reveal",
        "motion": (
            "paparazzi camera flashes, subtle luxury background activity, moving city lights, "
            "cinematic crowd silhouettes in the distance, subtle hair and clothing movement, reflective glamour reveal"
        ),
        "environment": (
            "luxury celebrity arrival atmosphere with cinematic city lights, moving reflections and subtle background activity "
            "while keeping the subject unchanged"
        ),
        "lighting": "flash photography, glossy night lights, luxury reflections, moving light bursts, premium rim light",
        "style": "glamour magazine commercial, red carpet film, premium realistic look, luxury social content",
        "audio": "distant crowd ambience, camera shutters, soft cinematic music and premium event atmosphere",
        "negative": (
            "real celebrity impersonation, identity replacement, distorted face, text, logos, watermark, "
            "crowd covering the subject, excessive face changes"
        ),
    },
    "product": {
        "goal": "premium product reveal for ecommerce or ad creative with strong commercial motion",
        "shot": "macro close-up opening shot or clean hero product shot",
        "camera": "slow dolly out with subtle parallax, clean stabilization and premium reveal movement",
        "motion": (
            "slow product reveal, rotating light reflections, elegant background movement, "
            "premium light sweep, subtle atmospheric particles and glossy commercial depth"
        ),
        "environment": (
            "clean premium studio or luxury commercial environment with moving reflections, "
            "soft atmospheric depth and polished brand-film energy"
        ),
        "lighting": "controlled studio lighting with glossy highlights, soft falloff and animated reflection movement",
        "style": "Apple-style clean commercial, luxury product film, minimal premium realism",
        "audio": "clean premium product sound design with subtle whoosh, soft impact and brand ambience",
        "negative": (
            "messy background, warped geometry, extra objects, text, logos, watermark, product deformation, "
            "incorrect labels"
        ),
    },
    "funny": {
        "goal": "playful social-ready cinematic moment with clean viral energy",
        "shot": "clear readable social media framing",
        "camera": "dynamic but stable camera movement with quick readable reveal",
        "motion": (
            "fun reveal, expressive motion, playful energy, small environmental reaction, "
            "social-ready motion beat without distortion"
        ),
        "environment": "bright clean social video atmosphere with subtle background movement and playful energy",
        "lighting": "clean bright lighting with colorful premium look and gentle animated highlights",
        "style": "premium social media ad, playful but high-quality, fun cinematic realism",
        "audio": "light playful sound design with short viral-style music energy",
        "negative": "chaotic motion, distorted face, broken anatomy, text, logos, watermark, ugly deformation",
    },
    "cinematic": {
        "goal": "premium cinematic image-to-video scene with controlled dramatic wow effect",
        "shot": "tight medium cinematic shot with movie-like framing",
        "camera": "slow cinematic push-in, natural handheld realism, subtle parallax movement and dramatic reveal toward the end",
        "motion": (
            "natural subject movement, subtle background depth, atmospheric motion, moving light rays, "
            "soft environmental reaction and elegant cinematic reveal"
        ),
        "environment": (
            "movie-like atmosphere based on the uploaded image, with subtle background evolution, "
            "volumetric depth, light movement and cinematic environmental detail"
        ),
        "lighting": "dramatic but tasteful film lighting, soft shadows, realistic highlights, moving cinematic light sweep",
        "style": "movie trailer realism, premium film look, emotional visual storytelling, cinematic social content",
        "audio": "cinematic ambient music with natural environmental sound and subtle dramatic rise",
        "negative": (
            "distorted face, broken hands, flicker, text, subtitles, logos, watermark, identity change, "
            "excessive fantasy effects"
        ),
    },
}

TEMPLATE_LAYERS = {
    "auto": "Use the best natural cinematic treatment for the uploaded photo.",
    "luxury": "Add premium brand polish, glossy highlights and elegant commercial atmosphere.",
    "dark-cinematic": "Use darker cinematic grading, controlled contrast and serious film mood.",
    "tiktok-fast": "Use stronger first-second visual impact and social-ready motion while staying clean.",
    "minimal": "Use clean composition, soft movement and minimal background complexity.",
    "dreamy": "Use soft dreamlike glow, gentle bokeh and smooth floating movement.",
}

MOOD_LAYERS = {
    "auto": "natural cinematic mood",
    "emotional": "warm, human and emotional",
    "epic": "large-scale, powerful and cinematic",
    "dreamy": "soft, magical and atmospheric",
    "dramatic": "serious, intense and film-like",
    "romantic": "intimate, warm and romantic",
    "premium": "elegant, expensive and polished",
    "viral": "attention-grabbing and social-first",
    "calm": "soft, peaceful and elegant",
}

SCENE_ANALYSIS_FALLBACK = {
    "main_subject": "the main subject from the uploaded image",
    "scene_context": "the original scene from the uploaded image",
    "visible_style": "realistic photo style",
    "lighting": "the original lighting of the image",
    "camera_angle": "natural camera angle",
    "people_count": 0,
    "safe_motion_ideas": [
        "subtle natural movement",
        "gentle camera motion",
        "soft environmental motion",
    ],
}

SCENE_SCHEMA = {
    "type": "object",
    "properties": {
        "main_subject": {"type": "string"},
        "scene_context": {"type": "string"},
        "visible_style": {"type": "string"},
        "lighting": {"type": "string"},
        "camera_angle": {"type": "string"},
        "people_count": {"type": "integer"},
        "safe_motion_ideas": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "main_subject",
        "scene_context",
        "visible_style",
        "lighting",
        "camera_angle",
        "people_count",
        "safe_motion_ideas",
    ],
}



def now_ts():
    return int(time.time())


def get_capacity_seconds():
    return int(capacity_db.get("seconds_left", DEFAULT_CAPACITY_SECONDS))


def set_capacity_seconds(seconds: int):
    seconds = max(0, int(seconds))
    capacity_db["seconds_left"] = seconds

    if seconds > ALERT_THRESHOLD_SECONDS:
        notifications_db["capacity_alert_sent"] = False
        notifications_db["capacity_block_sent"] = False

    return seconds


def reduce_capacity_seconds(seconds_used: int):
    current = get_capacity_seconds()
    next_value = max(0, current - int(seconds_used))
    capacity_db["seconds_left"] = next_value
    return next_value


def is_capacity_open():
    return get_capacity_seconds() > BLOCK_THRESHOLD_SECONDS


def send_admin_email(subject: str, body: str):
    """
    SMTP beállítás Modal Secretből:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, opcionálisan SMTP_FROM.
    Ha nincs beállítva, nem dob hibát, csak logol.
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user or ADMIN_ALERT_EMAIL)

    full_body = body.strip() + "\n\n---\nKéplabor automatikus rendszerüzenet"

    if not smtp_host or not smtp_user or not smtp_pass:
        print("ADMIN EMAIL NOT SENT - missing SMTP settings")
        print("TO:", ADMIN_ALERT_EMAIL)
        print("SUBJECT:", subject)
        print("BODY:", full_body)
        return False

    try:
        msg = EmailMessage()
        msg["From"] = smtp_from
        msg["To"] = ADMIN_ALERT_EMAIL
        msg["Subject"] = subject
        msg.set_content(full_body)

        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        print("ADMIN EMAIL SENT:", subject)
        return True

    except Exception as e:
        print("ADMIN EMAIL SEND FAILED:", e)
        return False


def send_once(flag_key: str, subject: str, body: str):
    if notifications_db.get(flag_key, False):
        return False

    sent = send_admin_email(subject, body)
    notifications_db[flag_key] = True
    return sent


def check_capacity_events(seconds_left: int):
    if seconds_left <= ALERT_THRESHOLD_SECONDS:
        send_once(
            "capacity_alert_sent",
            "⚠️ Képlabor kapacitás alacsony",
            f"A Képlabor generálási kapacitása {seconds_left} mp-re csökkent. 15 mp alatt a vásárlás és generálás automatikusan lezár.",
        )

    if seconds_left <= BLOCK_THRESHOLD_SECONDS:
        send_once(
            "capacity_block_sent",
            "⛔ Képlabor kapacitás lezárva",
            f"A Képlabor kapacitása {seconds_left} mp-re csökkent. A vásárlás és generálás automatikusan zárva van.",
        )


def notify_closed_attempt(email: str, action: str, details: str = ""):
    key = f"closed_attempt_{action}_{email}_{now_ts() // 3600}"
    send_once(
        key,
        f"👀 Képlabor érdeklődés lezárt kapacitás alatt: {action}",
        f"User: {email}\nMűvelet: {action}\nKapacitás: {get_capacity_seconds()} mp\nRészletek: {details or '-'}",
    )


def save_user_video(email: str, video_id: str, url: str, category: str, video_mode: str, duration: int):
    email = email.strip().lower()
    current = videos_db.get(email, [])

    item = {
        "video_id": video_id,
        "url": url,
        "category": category,
        "video_mode": video_mode,
        "duration": duration,
        "created_at": now_ts(),
    }

    videos_db[email] = [item] + current[: MAX_SAVED_VIDEOS - 1]
    return videos_db[email]


def capacity_closed_response(email: str | None = None, action: str = "general"):
    if email:
        notify_closed_attempt(email, action)

    return {
        "error": "capacity_closed",
        "message": "A béta kapacitás jelenleg megtelt. Új csomagok hamarosan elérhetők.",
        "sales_enabled": False,
    }


def get_stripe():
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe


def get_gemini_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def require_app_secret(x_app_secret: str = Header(None)):
    if x_app_secret != os.environ["APP_SECRET"]:
        raise HTTPException(status_code=403, detail="Forbidden")


def get_current_user_email(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_authorization")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="invalid_authorization_format")

    token = authorization.replace("Bearer ", "").strip()

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        email = decoded_token.get("email")

        if not email:
            raise HTTPException(status_code=401, detail="missing_email_in_token")

        return email.strip().lower()

    except HTTPException:
        raise

    except Exception as e:
        print("FIREBASE TOKEN VERIFY ERROR:", e)
        raise HTTPException(status_code=401, detail="unauthorized")


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


def analyze_image_for_video(image_path: str | None):
    if not image_path:
        return SCENE_ANALYSIS_FALLBACK

    try:
        client = get_gemini_client()
        image_input = types.Image.from_file(location=image_path)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                image_input,
                (
                    "Analyze this uploaded image for an image-to-video prompt compiler. "
                    "Return only factual visual details useful for motion planning. "
                    "Do not invent brand names, celebrity names, identities or unsafe assumptions. "
                    "Focus on main subject, scene context, visible style, lighting, camera angle, "
                    "people count, and safe natural motion ideas."
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SCENE_SCHEMA,
            ),
        )

        data = json.loads(response.text)

        if not isinstance(data.get("safe_motion_ideas"), list) or len(data["safe_motion_ideas"]) < 2:
            data["safe_motion_ideas"] = SCENE_ANALYSIS_FALLBACK["safe_motion_ideas"]

        return {
            "main_subject": data.get("main_subject") or SCENE_ANALYSIS_FALLBACK["main_subject"],
            "scene_context": data.get("scene_context") or SCENE_ANALYSIS_FALLBACK["scene_context"],
            "visible_style": data.get("visible_style") or SCENE_ANALYSIS_FALLBACK["visible_style"],
            "lighting": data.get("lighting") or SCENE_ANALYSIS_FALLBACK["lighting"],
            "camera_angle": data.get("camera_angle") or SCENE_ANALYSIS_FALLBACK["camera_angle"],
            "people_count": int(data.get("people_count", 0) or 0),
            "safe_motion_ideas": data.get("safe_motion_ideas") or SCENE_ANALYSIS_FALLBACK["safe_motion_ideas"],
        }

    except Exception as e:
        print("IMAGE ANALYSIS FAILED, USING FALLBACK:", e)
        return SCENE_ANALYSIS_FALLBACK


def build_cinematic_prompt(
    category: str,
    template: str,
    video_mode: str,
    user_extra_text: str = "",
    mood: str = "auto",
    scene: dict | None = None,
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

    blueprint = THEME_BLUEPRINTS.get(category, THEME_BLUEPRINTS["cinematic"])
    template_layer = TEMPLATE_LAYERS.get(template, TEMPLATE_LAYERS["auto"])
    mood_layer = MOOD_LAYERS.get(mood, MOOD_LAYERS["auto"])
    scene = scene or SCENE_ANALYSIS_FALLBACK

    motion_ideas = scene.get("safe_motion_ideas") or SCENE_ANALYSIS_FALLBACK["safe_motion_ideas"]
    beat_1 = motion_ideas[0] if len(motion_ideas) > 0 else "subtle natural movement"
    beat_2 = motion_ideas[1] if len(motion_ideas) > 1 else "gentle camera motion"
    beat_3 = motion_ideas[2] if len(motion_ideas) > 2 else "the motion settles into a polished ending frame"

    people_count = int(scene.get("people_count", 0) or 0)

    if people_count >= 2:
        people_line = (
            "If multiple people are visible, preserve each person's face, position, body proportions "
            "and relationship spacing. Avoid swapping, merging or morphing identities."
        )
    elif people_count == 1:
        people_line = (
            "If a person is visible, preserve the face, hairstyle, clothing, body shape and identity impression."
        )
    else:
        people_line = (
            "Preserve the main object, product, pet, vehicle or scene structure from the uploaded image."
        )

    extra = (user_extra_text or "").strip()

    if extra:
        extra_line = f"Additional creative direction: {extra}"
    else:
        extra_line = "Additional creative direction: keep the scene simple, elegant and cinematic."

    duration_line = "short 6-second cinematic clip" if video_mode in ["clip_6s", "simple_clip"] else "8-second premium cinematic scene"

    prompt = f"""
Animate the uploaded photo into a {duration_line}.

Use the uploaded image as the visual reference.
Preserve the main subject, face, body proportions, clothing and composition.
Do not over-redesign the image. Add cinematic motion, camera movement and premium atmosphere.

Subject:
{scene["main_subject"]}

Scene:
In {scene["scene_context"]}. Visible style: {scene["visible_style"]}. Observed lighting: {scene["lighting"]}. Camera angle: {scene["camera_angle"]}.

Continuity:
{people_line}

Shot:
{blueprint["shot"]}

Action:
{beat_1}; then {beat_2}; then {beat_3}.

Camera:
{blueprint["camera"]}

Environmental motion:
{blueprint["motion"]}

Environment:
{blueprint["environment"]}

Lighting:
{blueprint["lighting"]}

Style:
{blueprint["style"]}

Mood:
{mood_layer}

Visual treatment:
{template_layer}

Audio:
{blueprint["audio"]}

{extra_line}

Avoid:
{blueprint["negative"]}

No on-screen text, no subtitles, no logos, no watermark.
""".strip()

    return prompt


def extract_veo_error(operation):
    error = getattr(operation, "error", None)

    if not error:
        return None, None

    if isinstance(error, dict):
        return error.get("code"), error.get("message")

    return getattr(error, "code", None), getattr(error, "message", str(error))


def generate_with_veo_lite(
    image_path: str | None,
    prompt: str,
    final_video_path: str,
    duration: int,
    category: str,
    template: str,
    mood: str,
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

    max_attempts = 2
    last_error = None

    for attempt in range(1, max_attempts + 1):
        print("VEO REQUEST START")
        print("attempt:", attempt)
        print("model:", "veo-3.1-lite-generate-preview")
        print("category:", category)
        print("template:", template)
        print("mood:", mood)
        print("duration:", duration)
        print("prompt_chars:", len(prompt))
        print("prompt_preview:", prompt[:1600])

        try:
            operation = client.models.generate_videos(
                model="veo-3.1-lite-generate-preview",
                prompt=prompt,
                image=image_input,
                config=config,
            )

            while not operation.done:
                time.sleep(15)
                operation = client.operations.get(operation)

            if operation.response and operation.response.generated_videos:
                generated_video = operation.response.generated_videos[0]
                client.files.download(file=generated_video.video)
                generated_video.video.save(final_video_path)
                return

            code, msg = extract_veo_error(operation)

            print("FULL VEO OPERATION:", operation)
            print("VEO ERROR CODE:", code)
            print("VEO ERROR MESSAGE:", msg)
            print("VEO RESPONSE:", getattr(operation, "response", None))

            last_error = {
                "code": code,
                "message": msg,
                "operation": str(operation),
            }

            if code in [13, 500, 503, 504] and attempt < max_attempts:
                time.sleep(8 * attempt)
                continue

            raise RuntimeError(f"A Veo nem adott vissza videót. Error: {last_error}")

        except Exception as e:
            print("VEO ATTEMPT ERROR:", e)
            last_error = str(e)

            if attempt < max_attempts:
                time.sleep(8 * attempt)
                continue

            raise RuntimeError(f"A Veo generálás sikertelen. Error: {last_error}")


def render_video(
    text: str,
    template: str,
    email: str,
    category: str = "cinematic",
    video_mode: str = "clip_6s",
    image_path: str | None = None,
    mood: str = "auto",
):
    settings = get_video_settings(video_mode)

    if settings.get("error"):
        return settings

    duration = int(settings["duration"])
    credit_cost = int(settings["credit_cost"])

    if not is_capacity_open():
        return capacity_closed_response(email, "generate")

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

    if category == "auto":
        category = choose_category(text)
    if template == "auto":
        template = choose_template(text)
    if mood == "auto":
        mood = choose_mood(text)

    scene_analysis = analyze_image_for_video(image_path)

    cinematic_prompt = build_cinematic_prompt(
        category=category,
        template=template,
        video_mode=video_mode,
        user_extra_text=text,
        mood=mood,
        scene=scene_analysis,
    )

    try:
        generate_with_veo_lite(
            image_path=image_path,
            prompt=cinematic_prompt,
            final_video_path=final_video_path,
            duration=duration,
            category=category,
            template=template,
            mood=mood,
        )

        users_db[email] = credits - credit_cost
        capacity_left = reduce_capacity_seconds(duration)
        check_capacity_events(capacity_left)
        download_url = f"{MODAL_BASE_URL}/download/{video_id}"
        save_user_video(email, video_id, download_url, category, video_mode, duration)
        video_volume.commit()

    except Exception as e:
        print("VEO GENERATION ERROR:", e)
        return {
            "error": "generation_failed",
            "message": str(e),
            "credits_left": credits,
            "engine": "veo_3_1_lite",
            "category": category,
            "template": template,
            "mood": mood,
            "cinematic_prompt": cinematic_prompt,
            "scene_analysis": scene_analysis,
        }

    return {
        "video_id": video_id,
        "category": category,
        "template": template,
        "mood": mood,
        "video_mode": video_mode,
        "duration": duration,
        "credit_cost": credit_cost,
        "download": download_url,
        "credits_left": int(users_db.get(email, 0)),
        "capacity_status": "open" if is_capacity_open() else "closed",
        "cinematic_prompt": cinematic_prompt,
        "scene_analysis": scene_analysis,
        "status": "ready",
        "engine": "veo_3_1_lite",
    }


@api.get("/")
def home():
    return {
        "status": "ok",
        "message": "Képlabor backend fut",
        "engine": "veo_3_1_lite",
        "auth": "firebase_id_token",
        "packages": CREDIT_PACKAGES,
        "video_modes": VIDEO_MODES,
        "categories": list(ALLOWED_CATEGORIES),
        "templates": list(ALLOWED_TEMPLATES),
        "moods": list(ALLOWED_MOODS),
        "sales_enabled": is_capacity_open(),
        "capacity_status": "open" if is_capacity_open() else "closed",
    }


@api.post("/buy-credits")
async def buy_credits(
    request: Request,
    authorization: str = Header(None),
):
    email = get_current_user_email(authorization)

    data = await request.json()
    package_id = data.get("package_id", "starter")

    package = CREDIT_PACKAGES.get(package_id)

    if not is_capacity_open():
        return capacity_closed_response(email, f"buy_{package_id}")

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

        metadata = session["metadata"] if "metadata" in session else {}

        email = metadata["email"] if "email" in metadata else None
        credits_to_add = int(metadata["credits"]) if "credits" in metadata else 0

        if not email:
            customer_details = (
                session["customer_details"]
                if "customer_details" in session
                else None
            )

            if customer_details and "email" in customer_details:
                email = customer_details["email"]

        if email and credits_to_add > 0:
            email = email.strip().lower()
            current_credits = int(users_db.get(email, 0))
            users_db[email] = current_credits + credits_to_add
            print(f"CREDITS ADDED: {email} +{credits_to_add}, total={users_db[email]}")
            send_admin_email(
                "✅ Képlabor Stripe fizetés sikeres",
                f"User: {email}\nJóváírt kredit: {credits_to_add}\nÖsszes kredit: {users_db[email]}",
            )
        else:
            print("WEBHOOK PAYMENT RECEIVED BUT MISSING EMAIL OR CREDITS")
            print("SESSION:", session)

    return {"ok": True}


@api.post("/check-credits")
async def check_credits(
    authorization: str = Header(None),
):
    email = get_current_user_email(authorization)

    return {
        "email": email,
        "credits": int(users_db.get(email, 0)),
        "sales_enabled": is_capacity_open(),
        "capacity_status": "open" if is_capacity_open() else "closed",
    }



@api.post("/my-videos")
async def my_videos(
    authorization: str = Header(None),
):
    email = get_current_user_email(authorization)
    return {
        "ok": True,
        "videos": videos_db.get(email, [])[:MAX_SAVED_VIDEOS],
    }


@api.get("/public-status")
def public_status():
    return {
        "sales_enabled": is_capacity_open(),
        "capacity_status": "open" if is_capacity_open() else "closed",
        "message": "A béta kapacitás jelenleg megtelt. Új csomagok hamarosan elérhetők." if not is_capacity_open() else "open",
    }


@api.post("/admin-set-capacity")
async def admin_set_capacity(
    request: Request,
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    data = await request.json()
    seconds = int(data.get("seconds", DEFAULT_CAPACITY_SECONDS))
    next_seconds = set_capacity_seconds(seconds)

    return {
        "ok": True,
        "seconds_left": next_seconds,
        "sales_enabled": is_capacity_open(),
    }


@api.post("/admin-capacity")
async def admin_capacity(
    x_app_secret: str = Header(None),
):
    require_app_secret(x_app_secret)

    return {
        "ok": True,
        "seconds_left": get_capacity_seconds(),
        "alert_threshold_seconds": ALERT_THRESHOLD_SECONDS,
        "block_threshold_seconds": BLOCK_THRESHOLD_SECONDS,
        "sales_enabled": is_capacity_open(),
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

    email = email.strip().lower()

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
    authorization: str = Header(None),
):
    email = get_current_user_email(authorization)

    payload = await request.json()

    text = payload.get("text", "")
    category = payload.get("category", "cinematic")
    template = payload.get("template", "auto")
    mood = payload.get("mood", "auto")
    video_mode = payload.get("video_mode", "clip_6s")

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
    authorization: str = Header(None),
    text: str = Form(""),
    category: str = Form("cinematic"),
    template: str = Form("auto"),
    mood: str = Form("auto"),
    video_mode: str = Form("clip_6s"),
    image_file: UploadFile = File(None),
):
    email = get_current_user_email(authorization)

    image_path = None
    filename = ""

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
        modal.Secret.from_name("firebase-admin"),
        modal.Secret.from_name("smtp-secret"),
    ],
    volumes={
        VIDEO_DIR: video_volume,
    },
    timeout=900,
)
@modal.asgi_app()
def fastapi_app():
    os.makedirs(VIDEO_DIR, exist_ok=True)

    if not firebase_admin._apps:
        firebase_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

        if not firebase_json:
            raise RuntimeError("Missing FIREBASE_SERVICE_ACCOUNT_JSON secret")

        cred = credentials.Certificate(json.loads(firebase_json))
        firebase_admin.initialize_app(cred)

    return api