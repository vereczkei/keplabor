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

image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi[standard]",
        "stripe",
        "pillow",
        "openai"
    )
)

app = modal.App("video-test", image=image)
api = FastAPI()

users_db = modal.Dict.from_name("video-users-db", create_if_missing=True)

MODAL_BASE_URL = "https://vereczkeijanosgabor--video-test-fastapi-app.modal.run"
FRONTEND_URL = "https://keplabor.hu"

api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://keplabor.hu",
        "https://www.keplabor.hu",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        text.replace("'", "")
        .replace(":", "")
        .replace("\\", "")
        .replace("\n", " ")
    )


def choose_template(text: str, filename: str = ""):
    t = (text or "").lower()
    f = (filename or "").lower()

    if any(w in t for w in ["luxus", "premium", "prémium", "autó", "ingatlan", "óra", "ékszer"]):
        return "luxury"

    if any(w in t for w in ["akció", "kedvezmény", "étel", "pizza", "burger", "rendelj", "kupon"]):
        return "tiktok-fast"

    if any(w in t for w in ["dark", "cinematic", "film", "titok", "misztikus", "sötét"]):
        return "dark-cinematic"

    if any(w in t for w in ["minimal", "egyszerű", "clean", "letisztult"]):
        return "minimal"

    if any(w in f for w in ["car", "auto", "luxury"]):
        return "luxury"

    return "dark-cinematic"


def get_video_settings(video_mode: str):
    if video_mode == "short_ad":
        return {
            "duration": 15,
            "credit_cost": 3,
            "has_narration": False,
            "label": "15 mp reklám",
        }

    if video_mode == "narrated_ad":
        return {
            "duration": 30,
            "credit_cost": 10,
            "has_narration": True,
            "label": "30 mp narrált reklám",
        }

    return {
        "duration": 5,
        "credit_cost": 1,
        "has_narration": False,
        "label": "5 mp klip",
    }


def style_for_template(template: str):
    if template == "luxury":
        return {
            "font_color": "white",
            "font_size": "70",
            "box_color": "black@0.50",
            "bg": "black",
        }

    if template == "tiktok-fast":
        return {
            "font_color": "white",
            "font_size": "82",
            "box_color": "0xff0050@0.65",
            "bg": "black",
        }

    if template == "minimal":
        return {
            "font_color": "black",
            "font_size": "56",
            "box_color": "white@0.75",
            "bg": "white",
        }

    return {
        "font_color": "white",
        "font_size": "64",
        "box_color": "black@0.60",
        "bg": "black",
    }


def choose_music_style(template: str, text: str):
    t = (text or "").lower()

    if template == "luxury":
        return "luxury_cinematic"

    if template == "tiktok-fast":
        return "energetic_social"

    if template == "minimal":
        return "clean_modern"

    if any(w in t for w in ["dark", "sötét", "film", "cinematic", "drámai"]):
        return "dark_cinematic"

    return "cinematic_commercial"


def create_narration_text(text: str, template: str, video_mode: str):
    if video_mode != "narrated_ad":
        return ""

    client = get_openai_client()

    prompt = f"""
Írj egy profi, magyar nyelvű reklámnarrációt egy 30 másodperces videóhoz.

Fontos szabályok:
- NE olvasd fel szó szerint a felhasználó szövegét.
- A felhasználó szövege csak brief.
- Legyen természetes, prémium, emberi.
- Ne legyen túlmagyarázós.
- Ne legyen sablonos.
- Maximum 35-42 szó legyen.
- A szöveg legyen lezárt, kerek egész gondolat.
- Legyen természetes befejezése.
- Ne maradjon félbe.
- Magyarul írj.
- Ne használj idézőjeleket.
- Ne írj címet.

Felhasználói brief:
{text}

Stílus:
{template}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Te profi magyar reklámszövegíró vagy."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.9,
    )

    return response.choices[0].message.content.strip()


def create_caption_text(text: str, template: str, video_mode: str):
    if video_mode == "simple_clip":
        return text

    if video_mode == "short_ad":
        return f"{text} | AI reklámvideó"

    if video_mode == "narrated_ad":
        return "AI reklámvideó"

    return text


def create_future_ai_prompt(text: str, template: str, video_mode: str):
    if template == "luxury":
        style = "luxury cinematic commercial, premium lighting, elegant reflections"
    elif template == "tiktok-fast":
        style = "fast energetic TikTok ad, dynamic motion, social media style"
    elif template == "minimal":
        style = "clean minimal product commercial"
    else:
        style = "dark cinematic commercial, dramatic lighting"

    if video_mode == "narrated_ad":
        structure = "multi scene advertisement with strong call to action"
    else:
        structure = "short product commercial"

    return f"{style}, {structure}, user request: {text}"


def generate_tts_audio(narration_text: str, audio_path: str):
    if not narration_text:
        return None

    client = get_openai_client()

    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="nova",
        input=narration_text,
        instructions="""
Magyar prémium reklám narrátor.

Természetes, emberi, cinematic hangzás.
Nyugodt, magabiztos tempó.
Minőségi reklám vibe.
Nem monoton.
Kicsit mélyebb hangszín.
Tiszta artikuláció.
Modern reklám stílus.
A mondatok végét szépen zárja le.
"""
    ) as response:
        response.stream_to_file(audio_path)

    return audio_path


def render_video(
    text: str,
    template: str,
    email: str,
    video_mode: str = "simple_clip",
    image_path: str | None = None
):
    settings = get_video_settings(video_mode)

    video_duration = settings["duration"]
    credit_cost = settings["credit_cost"]
    has_narration = settings["has_narration"]

    credits = int(users_db.get(email, 0))


    if credits < credit_cost:
        return {
            "error": "no_credits",
            "message": "Nincs elég kredited.",
            "required_credits": credit_cost,
            "credits_left": credits,
        }

    narration_text = create_narration_text(text, template, video_mode)
    caption_text = create_caption_text(text, template, video_mode)
    music_style = choose_music_style(template, text)
    future_ai_prompt = create_future_ai_prompt(text, template, video_mode)

    users_db[email] = credits - credit_cost

    video_id = str(uuid.uuid4())

    raw_video_path = f"/tmp/{video_id}_raw.mp4"
    final_video_path = f"/tmp/{video_id}.mp4"
    narration_audio_path = f"/tmp/{video_id}_voice.mp3"

    safe_caption = clean_text(caption_text)
    style = style_for_template(template)

    if image_path:
        vf = (
            "scale=1200:-1,"
            "zoompan=z='min(zoom+0.0012,1.20)':"
            "x='iw/2-(iw/zoom/2)':"
            "y='ih/2-(ih/zoom/2)':"
            f"d={video_duration * 30}:"
            "s=1080x1920:fps=30,"
            f"drawtext=text='{safe_caption}':"
            f"fontcolor={style['font_color']}:"
            f"fontsize={style['font_size']}:"
            "x=(w-text_w)/2:"
            "y=h*0.78:"
            "box=1:"
            f"boxcolor={style['box_color']}:"
            "boxborderw=28"
        )

        cmd = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", image_path,
            "-vf", vf,
            "-t", str(video_duration),
            "-pix_fmt", "yuv420p",
            raw_video_path,
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i",
            f"color=c={style['bg']}:s=1080x1920:d={video_duration}",
            "-vf",
            (
                f"drawtext=text='{safe_caption}':"
                f"fontcolor={style['font_color']}:"
                f"fontsize={style['font_size']}:"
                "x=(w-text_w)/2:"
                "y=(h-text_h)/2:"
                "box=1:"
                f"boxcolor={style['box_color']}:"
                "boxborderw=28"
            ),
            "-pix_fmt",
            "yuv420p",
            raw_video_path,
        ]

    subprocess.run(cmd, check=True)

    narration_generated = False

    if has_narration and narration_text:
        try:
            generate_tts_audio(narration_text, narration_audio_path)

            merge_cmd = [
                "ffmpeg",
                "-y",
                "-i",
                raw_video_path,
                "-i",
                narration_audio_path,
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                final_video_path,
            ]

            subprocess.run(merge_cmd, check=True)
            narration_generated = True

        except Exception as e:
            print("TTS ERROR:", e)

            subprocess.run([
                "ffmpeg",
                "-y",
                "-i",
                raw_video_path,
                "-c",
                "copy",
                final_video_path,
            ], check=True)

    else:
        subprocess.run([
            "ffmpeg",
            "-y",
            "-i",
            raw_video_path,
            "-c",
            "copy",
            final_video_path,
        ], check=True)

    return {
        "video_id": video_id,
        "template": template,
        "video_mode": video_mode,
        "duration": video_duration,
        "credit_cost": credit_cost,
        "download": f"{MODAL_BASE_URL}/download/{video_id}",
        "credits_left": users_db[email],
        "narration_text": narration_text,
        "music_style": music_style,
        "future_ai_prompt": future_ai_prompt,
        "narration_generated": narration_generated,
        "status": "tts_ready",
    }


@api.get("/")
def home():
    return {
        "status": "ok",
        "message": "Képlabor backend fut",
        "features": [
            "tts",
            "credits",
            "stripe",
            "video_modes",
            "future_ai_prompt",
            "narration_pipeline",
        ],
    }


@api.post("/buy-credits")
async def buy_credits(
    request: Request,
    x_app_secret: str = Header(None)
):
    require_app_secret(x_app_secret)

    data = await request.json()
    email = data.get("email")

    if not email:
        return {"error": "missing_email"}

    try:
        stripe_client = get_stripe()

        session = stripe_client.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            customer_creation="always",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "huf",
                    "product_data": {
                        "name": "Képlabor kredit csomag"
                    },
                    "unit_amount": 200000,
                },
                "quantity": 1,
            }],
            metadata={
                "email": email,
                "credits": "10",
            },
            success_url=f"{FRONTEND_URL}/success",
            cancel_url=f"{FRONTEND_URL}/cancel",
        )

        return {"url": session.url}

    except Exception as e:
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
        return {"error": str(e)}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        email = session.get("metadata", {}).get("email")
        credits_to_add = int(session.get("metadata", {}).get("credits", 10))

        if not email and session.get("customer_details"):
            email = session["customer_details"].get("email")

        if email:
            current_credits = int(users_db.get(email, 0))
            users_db[email] = current_credits + credits_to_add

    return {"ok": True}


@api.post("/check-credits")
async def check_credits(
    request: Request,
    x_app_secret: str = Header(None)
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
    x_app_secret: str = Header(None)
):
    require_app_secret(x_app_secret)

    payload = await request.json()

    email = payload.get("email")
    text = payload.get("text")
    template = payload.get("template", "auto")
    video_mode = payload.get("video_mode", "simple_clip")

    if not email or not text:
        return {"error": "missing_data"}

    if template == "auto":
        template = choose_template(text)

    return render_video(
        text=text,
        template=template,
        email=email,
        video_mode=video_mode,
    )


@api.post("/generate-from-image")
async def generate_from_image(
    x_app_secret: str = Header(None),
    email: str = Form(...),
    text: str = Form(...),
    template: str = Form("auto"),
    video_mode: str = Form("simple_clip"),
    image_file: UploadFile = File(None)
):
    require_app_secret(x_app_secret)

    image_path = None
    filename = ""

    if not email or not text:
        return {"error": "missing_data"}

    if image_file:
        filename = image_file.filename or "upload.jpg"
        image_path = f"/tmp/{uuid.uuid4()}_{filename}"

        content = await image_file.read()

        with open(image_path, "wb") as f:
            f.write(content)

    if template == "auto":
        template = choose_template(text, filename)

    return render_video(
        text=text,
        template=template,
        email=email,
        video_mode=video_mode,
        image_path=image_path,
    )


@api.get("/download/{video_id}")
def download(video_id: str):
    return FileResponse(
        f"/tmp/{video_id}.mp4",
        media_type="video/mp4",
        filename="keplabor-video.mp4",
    )


@app.function(
    secrets=[
        modal.Secret.from_name("stripe-secret"),
        modal.Secret.from_name("app-auth"),
        modal.Secret.from_name("openai-secret"),
    ]
)
@modal.asgi_app()
def fastapi_app():
    return api