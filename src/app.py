import os
import uuid
import subprocess
import modal
import stripe

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
    .pip_install("fastapi[standard]", "stripe", "pillow")
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


def require_app_secret(x_app_secret: str = Header(None)):
    if x_app_secret != os.environ["APP_SECRET"]:
        raise HTTPException(status_code=403, detail="Forbidden")


def choose_template(text: str, filename: str = ""):
    t = (text or "").lower()
    f = (filename or "").lower()

    if any(w in t for w in ["luxus", "premium", "prémium", "autó", "ingatlan", "óra", "ékszer"]):
        return "luxury"

    if any(w in t for w in ["akció", "kedvezmény", "étel", "pizza", "burger", "rendelj", "kupon"]):
        return "tiktok-fast"

    if any(w in t for w in ["dark", "cinematic", "film", "titok", "misztikus"]):
        return "dark-cinematic"

    if any(w in t for w in ["minimal", "egyszerű", "clean", "letisztult"]):
        return "minimal"

    if any(w in f for w in ["car", "auto", "luxury"]):
        return "luxury"

    return "dark-cinematic"


def style_for_template(template: str):
    if template == "luxury":
        return {"font_color": "white", "font_size": "72", "box_color": "black@0.55"}

    if template == "tiktok-fast":
        return {"font_color": "white", "font_size": "86", "box_color": "0xff0050@0.65"}

    if template == "minimal":
        return {"font_color": "black", "font_size": "56", "box_color": "white@0.75"}

    return {"font_color": "white", "font_size": "64", "box_color": "black@0.60"}


def clean_text(text: str):
    return (
        text.replace("'", "")
        .replace(":", "")
        .replace("\\", "")
        .replace("\n", " ")
    )


def render_video(text: str, template: str, email: str, image_path: str | None = None):
    credits = int(users_db.get(email, 0))

    if credits <= 0:
        return {
            "error": "no_credits",
            "message": "Nincs elég kredited a videó generálásához."
        }

    users_db[email] = credits - 1

    video_id = str(uuid.uuid4())
    output_path = f"/tmp/{video_id}.mp4"

    safe_text = clean_text(text)
    style = style_for_template(template)

    if image_path:
        vf = (
            "scale=1200:-1,"
            "zoompan=z='min(zoom+0.0015,1.18)':"
            "x='iw/2-(iw/zoom/2)':"
            "y='ih/2-(ih/zoom/2)':"
            "d=150:s=1080x1920:fps=30,"
            f"drawtext=text='{safe_text}':"
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
            "-t", "5",
            "-pix_fmt", "yuv420p",
            output_path
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", "color=c=black:s=1080x1920:d=5",
            "-vf",
            (
                f"drawtext=text='{safe_text}':"
                f"fontcolor={style['font_color']}:"
                f"fontsize={style['font_size']}:"
                "x=(w-text_w)/2:"
                "y=(h-text_h)/2:"
                "box=1:"
                f"boxcolor={style['box_color']}:"
                "boxborderw=28"
            ),
            "-pix_fmt", "yuv420p",
            output_path
        ]

    subprocess.run(cmd, check=True)

    return {
        "video_id": video_id,
        "template": template,
        "download": f"{MODAL_BASE_URL}/download/{video_id}",
        "credits_left": users_db[email]
    }


@api.get("/")
def home():
    return {"status": "ok", "message": "Képlabor backend fut"}


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
                        "name": "Képlabor kredit csomag - 10 kredit"
                    },
                    "unit_amount": 200000,
                },
                "quantity": 1,
            }],
            metadata={
                "email": email,
                "credits": "10"
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
            os.environ["STRIPE_WEBHOOK_SECRET"]
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
        "credits": int(users_db.get(email, 0))
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

    if not email or not text:
        return {"error": "missing_data"}

    if template == "auto":
        template = choose_template(text)

    return render_video(text, template, email)


@api.post("/generate-from-image")
async def generate_from_image(
    x_app_secret: str = Header(None),
    email: str = Form(...),
    text: str = Form(...),
    template: str = Form("auto"),
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

    return render_video(text, template, email, image_path)


@api.get("/download/{video_id}")
def download(video_id: str):
    return FileResponse(
        f"/tmp/{video_id}.mp4",
        media_type="video/mp4",
        filename="keplabor-video.mp4"
    )


@app.function(
    secrets=[
        modal.Secret.from_name("stripe-secret"),
        modal.Secret.from_name("app-auth"),
    ]
)
@modal.asgi_app()
def fastapi_app():
    return api