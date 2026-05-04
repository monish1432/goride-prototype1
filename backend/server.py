"""GoRide backend - unified ride hailing + logistics marketplace."""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="GoRide API")
api = APIRouter(prefix="/api")

# ---------- Config ----------
VEHICLE_CATALOG = {
    "bike":   {"category": "passenger", "label": "Bike",  "rate_per_km": 18, "base_fare": 20, "capacity": "1 rider",      "eta_min": 3},
    "auto":   {"category": "passenger", "label": "Auto",  "rate_per_km": 22, "base_fare": 30, "capacity": "3 riders",     "eta_min": 4},
    "car":    {"category": "passenger", "label": "Car",   "rate_per_km": 30, "base_fare": 50, "capacity": "4 riders",     "eta_min": 5},
    "taxi":   {"category": "passenger", "label": "Taxi",  "rate_per_km": 35, "base_fare": 60, "capacity": "4 riders",     "eta_min": 6},
    "tempo":  {"category": "logistics", "label": "Tempo", "rate_per_km": 40, "base_fare": 80, "capacity": "Up to 750 kg", "eta_min": 8},
    "truck":  {"category": "logistics", "label": "Truck", "rate_per_km": 60, "base_fare": 150,"capacity": "Up to 3 tons", "eta_min": 12},
}
PLATFORM_FEE = 1.0  # ₹1 hidden Worker Wallet deduction

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def haversine_km(a: dict, b: dict) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a["lat"], a["lng"], b["lat"], b["lng"]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return round(2 * 6371 * math.asin(math.sqrt(h)), 2)

async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1].strip()
    user = await db.users.find_one({"id": token}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid token")
    return user

def require_role(role: str):
    async def dep(user: dict = Depends(current_user)):
        if user.get("role") != role:
            raise HTTPException(403, f"Requires {role}")
        return user
    return dep

# ---------- Models ----------
class LatLng(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class RoleSelect(BaseModel):
    role: Literal["customer", "worker", "admin"]
    name: Optional[str] = None

class VehicleCreate(BaseModel):
    type: Literal["bike", "auto", "car", "taxi", "tempo", "truck"]
    plate: str
    license_no: str
    rc_no: str

class FareEstimateRequest(BaseModel):
    pickup: LatLng
    drop: LatLng
    vehicle_type: str

class RideCreate(BaseModel):
    pickup: LatLng
    drop: LatLng
    vehicle_type: str
    note: Optional[str] = None

class StatusUpdate(BaseModel):
    status: Literal["arrived", "started", "completed", "cancelled"]

# ---------- Routes: meta ----------
@api.get("/")
async def root():
    return {"message": "GoRide API live", "platform_fee": PLATFORM_FEE}

@api.get("/catalog")
async def catalog():
    return {"vehicles": VEHICLE_CATALOG, "platform_fee": PLATFORM_FEE}

# ---------- Routes: auth (mock OTP) ----------
@api.post("/auth/send-otp")
async def send_otp(body: OTPRequest):
    if not body.phone or len(body.phone) < 8:
        raise HTTPException(400, "Invalid phone")
    return {"sent": True, "demo_otp": "123456", "phone": body.phone}

@api.post("/auth/verify-otp")
async def verify_otp(body: OTPVerify):
    if body.otp != "123456":
        raise HTTPException(400, "Invalid OTP. Use 123456 for demo.")
    user = await db.users.find_one({"phone": body.phone}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "phone": body.phone,
            "name": None,
            "role": None,
            "created_at": now_iso(),
            "wallet_balance": 200.0,  # workers start with ₹200 buffer
            "is_online": False,
            "active_vehicle_id": None,
        }
        await db.users.insert_one(user.copy())
    return {"token": user["id"], "user": {k: v for k, v in user.items() if k != "_id"}}

@api.post("/auth/select-role")
async def select_role(body: RoleSelect, user: dict = Depends(current_user)):
    update = {"role": body.role}
    if body.name:
        update["name"] = body.name
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"user": fresh}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": user}

# ---------- Routes: vehicles (worker) ----------
@api.get("/vehicles")
async def list_vehicles(user: dict = Depends(require_role("worker"))):
    items = await db.vehicles.find({"owner_id": user["id"]}, {"_id": 0}).to_list(50)
    return {"vehicles": items, "active_vehicle_id": user.get("active_vehicle_id")}

@api.post("/vehicles")
async def add_vehicle(body: VehicleCreate, user: dict = Depends(require_role("worker"))):
    if body.type not in VEHICLE_CATALOG:
        raise HTTPException(400, "Invalid vehicle type")
    veh = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "type": body.type,
        "plate": body.plate,
        "license_no": body.license_no,
        "rc_no": body.rc_no,
        "verified": True,  # auto-verify in demo
        "created_at": now_iso(),
    }
    await db.vehicles.insert_one(veh.copy())
    # Auto-set active if first vehicle
    if not user.get("active_vehicle_id"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"active_vehicle_id": veh["id"]}})
    return {"vehicle": {k: v for k, v in veh.items() if k != "_id"}}

@api.post("/vehicles/{vid}/activate")
async def activate_vehicle(vid: str, user: dict = Depends(require_role("worker"))):
    veh = await db.vehicles.find_one({"id": vid, "owner_id": user["id"]}, {"_id": 0})
    if not veh:
        raise HTTPException(404, "Vehicle not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"active_vehicle_id": vid}})
    return {"active_vehicle_id": vid}

# ---------- Routes: worker online toggle ----------
class OnlineToggle(BaseModel):
    online: bool

@api.post("/worker/online")
async def set_online(body: OnlineToggle, user: dict = Depends(require_role("worker"))):
    if body.online and not user.get("active_vehicle_id"):
        raise HTTPException(400, "Add and activate a vehicle before going online")
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_online": body.online}})
    return {"is_online": body.online}

# ---------- Routes: rides ----------
@api.post("/rides/estimate")
async def estimate_fare(body: FareEstimateRequest):
    cfg = VEHICLE_CATALOG.get(body.vehicle_type)
    if not cfg:
        raise HTTPException(400, "Unknown vehicle type")
    distance = haversine_km(body.pickup.model_dump(), body.drop.model_dump())
    fare = round(cfg["base_fare"] + distance * cfg["rate_per_km"], 2)
    return {
        "vehicle_type": body.vehicle_type,
        "distance_km": distance,
        "fare": fare,
        "base_fare": cfg["base_fare"],
        "rate_per_km": cfg["rate_per_km"],
        "eta_min": cfg["eta_min"],
        "label": cfg["label"],
    }

@api.post("/rides")
async def create_ride(body: RideCreate, user: dict = Depends(require_role("customer"))):
    cfg = VEHICLE_CATALOG.get(body.vehicle_type)
    if not cfg:
        raise HTTPException(400, "Unknown vehicle type")
    distance = haversine_km(body.pickup.model_dump(), body.drop.model_dump())
    fare = round(cfg["base_fare"] + distance * cfg["rate_per_km"], 2)
    ride = {
        "id": str(uuid.uuid4()),
        "customer_id": user["id"],
        "customer_name": user.get("name") or user.get("phone"),
        "customer_phone": user.get("phone"),
        "worker_id": None,
        "worker_name": None,
        "worker_phone": None,
        "vehicle_id": None,
        "vehicle_type": body.vehicle_type,
        "category": cfg["category"],
        "pickup": body.pickup.model_dump(),
        "drop": body.drop.model_dump(),
        "distance_km": distance,
        "fare": fare,
        "status": "searching",   # searching → assigned → arrived → started → completed
        "note": body.note,
        "created_at": now_iso(),
        "timeline": [{"status": "searching", "at": now_iso()}],
    }
    await db.rides.insert_one(ride.copy())
    return {"ride": {k: v for k, v in ride.items() if k != "_id"}}

@api.get("/rides/customer")
async def my_rides_customer(user: dict = Depends(require_role("customer"))):
    items = await db.rides.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"rides": items}

@api.get("/rides/{rid}")
async def get_ride(rid: str, user: dict = Depends(current_user)):
    ride = await db.rides.find_one({"id": rid}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if user["role"] != "admin" and user["id"] not in (ride.get("customer_id"), ride.get("worker_id")):
        raise HTTPException(403, "Not your ride")
    return {"ride": ride}

@api.get("/rides/worker/available")
async def available_rides(user: dict = Depends(require_role("worker"))):
    if not user.get("is_online") or not user.get("active_vehicle_id"):
        return {"rides": []}
    veh = await db.vehicles.find_one({"id": user["active_vehicle_id"]}, {"_id": 0})
    if not veh:
        return {"rides": []}
    items = await db.rides.find(
        {"status": "searching", "vehicle_type": veh["type"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"rides": items, "vehicle_type": veh["type"]}

@api.get("/rides/worker/mine")
async def worker_rides(user: dict = Depends(require_role("worker"))):
    items = await db.rides.find({"worker_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"rides": items}

@api.post("/rides/{rid}/accept")
async def accept_ride(rid: str, user: dict = Depends(require_role("worker"))):
    if not user.get("active_vehicle_id"):
        raise HTTPException(400, "No active vehicle")
    ride = await db.rides.find_one({"id": rid}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if ride["status"] != "searching":
        raise HTTPException(400, "Ride no longer available")
    update = {
        "worker_id": user["id"],
        "worker_name": user.get("name") or user.get("phone"),
        "worker_phone": user.get("phone"),
        "vehicle_id": user["active_vehicle_id"],
        "status": "assigned",
    }
    await db.rides.update_one(
        {"id": rid},
        {"$set": update, "$push": {"timeline": {"status": "assigned", "at": now_iso()}}},
    )
    fresh = await db.rides.find_one({"id": rid}, {"_id": 0})
    return {"ride": fresh}

@api.post("/rides/{rid}/status")
async def update_ride_status(rid: str, body: StatusUpdate, user: dict = Depends(current_user)):
    ride = await db.rides.find_one({"id": rid}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    # Permissions: worker drives; customer can cancel only when searching/assigned
    if body.status == "cancelled":
        if user["id"] not in (ride.get("customer_id"), ride.get("worker_id")):
            raise HTTPException(403, "Not your ride")
        if ride["status"] in ("completed", "cancelled"):
            raise HTTPException(400, "Cannot cancel finished ride")
    else:
        if user["id"] != ride.get("worker_id"):
            raise HTTPException(403, "Only assigned worker can update status")
        valid_next = {"assigned": "arrived", "arrived": "started", "started": "completed"}
        if valid_next.get(ride["status"]) != body.status:
            raise HTTPException(400, f"Invalid transition from {ride['status']} → {body.status}")

    await db.rides.update_one(
        {"id": rid},
        {"$set": {"status": body.status},
         "$push": {"timeline": {"status": body.status, "at": now_iso()}}},
    )

    # On completion: deduct ₹1 platform fee from worker wallet (silent)
    if body.status == "completed" and ride.get("worker_id"):
        await db.users.update_one(
            {"id": ride["worker_id"]},
            {"$inc": {"wallet_balance": -PLATFORM_FEE}},
        )
        await db.wallet_txns.insert_one({
            "id": str(uuid.uuid4()),
            "worker_id": ride["worker_id"],
            "ride_id": rid,
            "amount": -PLATFORM_FEE,
            "type": "platform_fee",
            "label": "Platform fee",
            "at": now_iso(),
        })
        # Also log earnings (informational)
        await db.wallet_txns.insert_one({
            "id": str(uuid.uuid4()),
            "worker_id": ride["worker_id"],
            "ride_id": rid,
            "amount": ride["fare"],
            "type": "earning",
            "label": f"Ride earnings · {ride['vehicle_type']}",
            "at": now_iso(),
        })

    fresh = await db.rides.find_one({"id": rid}, {"_id": 0})
    return {"ride": fresh}

# ---------- Routes: wallet ----------
@api.get("/wallet/me")
async def my_wallet(user: dict = Depends(require_role("worker"))):
    txns = await db.wallet_txns.find({"worker_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(200)
    earnings = sum(t["amount"] for t in txns if t["type"] == "earning")
    fees = sum(-t["amount"] for t in txns if t["type"] == "platform_fee")
    completed = await db.rides.count_documents({"worker_id": user["id"], "status": "completed"})
    return {
        "balance": user.get("wallet_balance", 0),
        "earnings_total": earnings,
        "platform_fees_total": fees,
        "completed_rides": completed,
        "transactions": txns,
    }

# ---------- Routes: admin ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    today = datetime.now(timezone.utc).date().isoformat()
    rides_total = await db.rides.count_documents({})
    rides_today = await db.rides.count_documents({"created_at": {"$gte": today}})
    completed = await db.rides.count_documents({"status": "completed"})
    customers = await db.users.count_documents({"role": "customer"})
    workers = await db.users.count_documents({"role": "worker"})
    online_workers = await db.users.count_documents({"role": "worker", "is_online": True})
    revenue = completed * PLATFORM_FEE
    # Gross fare aggregate
    pipeline = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$fare"}}}]
    agg = await db.rides.aggregate(pipeline).to_list(1)
    gross = round(agg[0]["total"], 2) if agg else 0.0
    return {
        "rides_total": rides_total,
        "rides_today": rides_today,
        "rides_completed": completed,
        "customers": customers,
        "workers": workers,
        "workers_online": online_workers,
        "platform_revenue": revenue,
        "gross_fare": gross,
    }

@api.get("/admin/rides")
async def admin_rides(user: dict = Depends(require_role("admin"))):
    items = await db.rides.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"rides": items}

@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    items = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"users": items}

# ---------- Mount ----------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("goride")

@app.on_event("shutdown")
async def shutdown():
    client.close()
