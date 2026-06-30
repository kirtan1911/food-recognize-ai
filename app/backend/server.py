from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import json
import base64
import secrets
import csv
import io
import asyncio
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import google.generativeai as genai

# ---------- Logging (FIRST - before everything else) ----------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("foodai")

# ---------- App / DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="AI Food Recognition & Calorie Estimator")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']
genai.configure(api_key=GEMINI_API_KEY)

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileIn(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    fitness_goal: Optional[Literal["lose", "maintain", "gain"]] = None
    daily_calorie_target: Optional[int] = None

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

class HistoryIn(BaseModel):
    food_name: str
    confidence: float
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    serving_size: str = ""
    healthy_score: int = 0
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    image_b64: Optional[str] = None
    items: Optional[List[dict]] = None

# ---------- Helpers ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(uid: str, email: str, ttl_minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "age": u.get("age"),
        "gender": u.get("gender"),
        "height_cm": u.get("height_cm"),
        "weight_kg": u.get("weight_kg"),
        "fitness_goal": u.get("fitness_goal"),
        "daily_calorie_target": u.get("daily_calorie_target", 2000),
        "role": u.get("role", "user"),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie(
        "access_token", token,
        httponly=True, secure=False, samesite="lax",
        max_age=60 * 60 * 24 * 7, path="/"
    )

# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_pw(body.password),
        "name": body.name,
        "role": "user",
        "daily_calorie_target": 2000,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = make_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(doc), "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return serialize_user(user)

@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_resets.insert_one({
            "token": token,
            "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"[RESET LINK] /reset-password?token={token} for {body.email}")
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}

@api.post("/auth/reset-password")
async def reset(body: ResetIn):
    rec = await db.password_resets.find_one({"token": body.token, "used": False})
    if not rec or rec["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(400, "Invalid or expired token")
    await db.users.update_one(
        {"_id": ObjectId(rec["user_id"])},
        {"$set": {"password_hash": hash_pw(body.new_password)}}
    )
    await db.password_resets.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"ok": True}

# ---------- Profile ----------
@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return serialize_user(user)

@api.put("/profile")
async def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    u = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(u)

# ---------- Food Prediction (Google Gemini Vision) ----------
PREDICT_SYSTEM = """You are a nutrition vision expert. The user uploads a food photo.
Identify the primary food item (and any visible side items). Estimate nutrition for the visible portion.
Reply STRICTLY with valid JSON only (no markdown, no commentary), matching this schema:
{
  "food_name": string,
  "confidence": number between 0 and 1,
  "items": [{"name": string, "calories": number}],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "serving_size": string,
  "healthy_score": integer 0-100,
  "bounding_box": {"x": number, "y": number, "w": number, "h": number}
}
If no food is visible, return {"food_name":"unknown","confidence":0,...zeros...}.
Units: calories=kcal, macros=grams, sodium=mg. Bounding box values in 0..1 relative coordinates."""

def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    s = text.find("{")
    e = text.rfind("}")
    if s == -1 or e == -1:
        raise ValueError("No JSON object found")
    return json.loads(text[s:e + 1])

@api.post("/predict")
async def predict(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
        raise HTTPException(400, "Unsupported image format. Use JPG/PNG/WEBP.")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image exceeds 10MB")

    # Re-encode to JPEG and resize to keep payload small
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((1280, 1280))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        jpeg_bytes = buf.getvalue()
    except Exception:
        raise HTTPException(400, "Invalid image")

    b64 = base64.b64encode(jpeg_bytes).decode()

    started = datetime.now(timezone.utc)
    try:
        # ✅ Google Gemini Vision Call
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=PREDICT_SYSTEM
        )
        image_part = {"mime_type": "image/jpeg", "data": jpeg_bytes}
        response = await asyncio.to_thread(
            model.generate_content,
            ["Analyze this food image and return the JSON only.", image_part]
        )
        reply = response.text
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(502, f"AI service error: {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()

    try:
        data = _extract_json(reply if isinstance(reply, str) else str(reply))
    except Exception:
        raise HTTPException(502, "AI returned invalid JSON")

    data["prediction_time"] = round(elapsed, 2)
    data["image_b64"] = b64
    return data

# ---------- History ----------
@api.post("/history")
async def add_history(body: HistoryIn, user=Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = str(user["_id"])
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.history.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/history")
async def list_history(user=Depends(get_current_user), limit: int = 100):
    cursor = db.history.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)

@api.delete("/history/{hid}")
async def del_history(hid: str, user=Depends(get_current_user)):
    res = await db.history.delete_one({"id": hid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# ---------- Dashboard ----------
def _day_key(iso: str) -> str:
    return iso[:10]

@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start_week = today - timedelta(days=6)
    items = await db.history.find(
        {"user_id": str(user["_id"])}, {"_id": 0}
    ).to_list(2000)

    target = user.get("daily_calorie_target", 2000) or 2000
    today_items = [i for i in items if _day_key(i["created_at"]) == today.isoformat()]
    daily_cal = sum(i.get("calories", 0) for i in today_items)
    protein = sum(i.get("protein", 0) for i in today_items)
    carbs = sum(i.get("carbs", 0) for i in today_items)
    fat = sum(i.get("fat", 0) for i in today_items)

    # weekly
    week_map = {(start_week + timedelta(days=d)).isoformat(): 0 for d in range(7)}
    for i in items:
        d = _day_key(i["created_at"])
        if d in week_map:
            week_map[d] += i.get("calories", 0)
    weekly = [{"date": d, "calories": round(v, 1)} for d, v in week_map.items()]

    # monthly (last 30 days)
    start_month = today - timedelta(days=29)
    month_map = {(start_month + timedelta(days=d)).isoformat(): 0 for d in range(30)}
    for i in items:
        d = _day_key(i["created_at"])
        if d in month_map:
            month_map[d] += i.get("calories", 0)
    monthly = [{"date": d, "calories": round(v, 1)} for d, v in month_map.items()]

    by_meal = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for i in today_items:
        mt = i.get("meal_type", "snack")
        by_meal[mt] = by_meal.get(mt, 0) + i.get("calories", 0)

    return {
        "daily_calorie_target": target,
        "daily_calories": round(daily_cal, 1),
        "remaining_calories": round(target - daily_cal, 1),
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fat": round(fat, 1),
        "recognition_count": len(items),
        "weekly": weekly,
        "monthly": monthly,
        "by_meal": by_meal,
        "today_items": today_items[:10],
    }

# ---------- Common Foods ----------
COMMON_FOODS = [
    {"name": "Apple", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3},
    {"name": "Banana", "calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4},
    {"name": "Grilled Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
    {"name": "Brown Rice (1 cup)", "calories": 216, "protein": 5, "carbs": 45, "fat": 1.8},
    {"name": "Avocado Toast", "calories": 290, "protein": 9, "carbs": 30, "fat": 16},
    {"name": "Caesar Salad", "calories": 470, "protein": 23, "carbs": 17, "fat": 35},
    {"name": "Margherita Pizza Slice", "calories": 285, "protein": 12, "carbs": 36, "fat": 10},
    {"name": "Salmon Fillet", "calories": 208, "protein": 22, "carbs": 0, "fat": 13},
    {"name": "Greek Yogurt", "calories": 100, "protein": 17, "carbs": 6, "fat": 0.7},
    {"name": "Oatmeal Bowl", "calories": 158, "protein": 6, "carbs": 27, "fat": 3.2},
]

@api.get("/foods")
async def foods():
    return COMMON_FOODS

# ---------- Reports ----------
def _filter_range(items, period: str):
    today = datetime.now(timezone.utc).date()
    if period == "daily":
        start = today
    elif period == "weekly":
        start = today - timedelta(days=6)
    else:
        start = today - timedelta(days=29)
    return [i for i in items if _day_key(i["created_at"]) >= start.isoformat()]

@api.get("/report/csv")
async def report_csv(period: str = Query("weekly"), user=Depends(get_current_user)):
    items = await db.history.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(5000)
    items = _filter_range(items, period)
    items.sort(key=lambda x: x["created_at"])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date", "Meal", "Food", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Fiber (g)", "Healthy Score"])
    for i in items:
        w.writerow([
            i["created_at"][:10], i.get("meal_type", ""), i.get("food_name", ""),
            i.get("calories", 0), i.get("protein", 0), i.get("carbs", 0),
            i.get("fat", 0), i.get("fiber", 0), i.get("healthy_score", 0),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=food-report-{period}.csv"},
    )

@api.get("/report/pdf")
async def report_pdf(period: str = Query("weekly"), user=Depends(get_current_user)):
    items = await db.history.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(5000)
    items = _filter_range(items, period)
    items.sort(key=lambda x: x["created_at"])
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Title"], textColor=colors.HexColor("#2C4C3B"))
    story = [
        Paragraph(f"Nutrition Report — {period.title()}", title_style),
        Paragraph(f"User: {user.get('name', user['email'])}", styles["Normal"]),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 16),
    ]
    total_cal = sum(i.get("calories", 0) for i in items)
    total_p = sum(i.get("protein", 0) for i in items)
    total_c = sum(i.get("carbs", 0) for i in items)
    total_f = sum(i.get("fat", 0) for i in items)
    summary = [
        ["Total Meals", len(items)],
        ["Total Calories (kcal)", round(total_cal, 1)],
        ["Total Protein (g)", round(total_p, 1)],
        ["Total Carbs (g)", round(total_c, 1)],
        ["Total Fat (g)", round(total_f, 1)],
    ]
    t = Table(summary, hAlign="LEFT", colWidths=[180, 120])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F1EA")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EAE6")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 18))

    rows = [["Date", "Meal", "Food", "kcal", "P", "C", "F", "Score"]]
    for i in items:
        rows.append([
            i["created_at"][:10], i.get("meal_type", ""), i.get("food_name", "")[:30],
            round(i.get("calories", 0), 1), round(i.get("protein", 0), 1),
            round(i.get("carbs", 0), 1), round(i.get("fat", 0), 1), i.get("healthy_score", 0),
        ])
    tbl = Table(rows, hAlign="LEFT", repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=food-report-{period}.pdf"}
    )

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.history.create_index([("user_id", 1), ("created_at", -1)])
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@foodai.com")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_pw(admin_pass),
            "name": "Admin",
            "role": "admin",
            "daily_calorie_target": 2000,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_pw(admin_pass, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_pw(admin_pass)}}
        )

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ---------- Hello ----------
@api.get("/")
async def root():
    return {"app": "AI Food Recognition & Calorie Estimator", "status": "ok"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)