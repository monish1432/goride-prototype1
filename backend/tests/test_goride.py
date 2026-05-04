"""GoRide end-to-end backend tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to frontend env
    from pathlib import Path
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

# Unique phone numbers per run
TS = int(time.time())
CUST_PHONE = f"9{TS % 1000000000:09d}"
WORK_PHONE = f"8{TS % 1000000000:09d}"
ADMIN_PHONE = f"7{TS % 1000000000:09d}"


def _auth(phone, role, name=None):
    r = requests.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    r = requests.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    if not r.json()["user"].get("role"):
        r = requests.post(f"{API}/auth/select-role", json={"role": role, "name": name or f"TEST_{role}"}, headers=h)
        assert r.status_code == 200, r.text
    return token, h


@pytest.fixture(scope="module")
def cust():
    return _auth(CUST_PHONE, "customer", "TEST_Cust")


@pytest.fixture(scope="module")
def work():
    return _auth(WORK_PHONE, "worker", "TEST_Work")


@pytest.fixture(scope="module")
def adm():
    return _auth(ADMIN_PHONE, "admin", "TEST_Admin")


# ---------- Meta ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["platform_fee"] == 1.0


def test_catalog():
    r = requests.get(f"{API}/catalog")
    assert r.status_code == 200
    data = r.json()
    assert data["platform_fee"] == 1.0
    assert set(data["vehicles"].keys()) == {"bike", "auto", "car", "taxi", "tempo", "truck"}
    assert data["vehicles"]["auto"]["base_fare"] == 30


# ---------- Auth ----------
def test_otp_invalid_rejected():
    r = requests.post(f"{API}/auth/verify-otp", json={"phone": "9999999999", "otp": "111111"})
    assert r.status_code == 400


def test_otp_short_phone():
    r = requests.post(f"{API}/auth/send-otp", json={"phone": "123"})
    assert r.status_code == 400


def test_no_token_returns_401():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_invalid_token_returns_401():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer bad-token"})
    assert r.status_code == 401


def test_auth_me(cust):
    _, h = cust
    r = requests.get(f"{API}/auth/me", headers=h)
    assert r.status_code == 200
    u = r.json()["user"]
    assert u["role"] == "customer"
    assert u["phone"] == CUST_PHONE


# ---------- Role enforcement ----------
def test_customer_cannot_use_worker_endpoint(cust):
    _, h = cust
    r = requests.get(f"{API}/vehicles", headers=h)
    assert r.status_code == 403


def test_worker_cannot_use_admin_endpoint(work):
    _, h = work
    r = requests.get(f"{API}/admin/stats", headers=h)
    assert r.status_code == 403


# ---------- Estimate ----------
def test_estimate_fare():
    body = {
        "pickup": {"lat": 12.9719, "lng": 77.6412},
        "drop": {"lat": 12.9352, "lng": 77.6245},
        "vehicle_type": "auto",
    }
    r = requests.post(f"{API}/rides/estimate", json=body)
    assert r.status_code == 200
    d = r.json()
    assert d["distance_km"] > 0
    assert d["fare"] == round(30 + d["distance_km"] * 22, 2)


def test_estimate_unknown_vehicle():
    body = {
        "pickup": {"lat": 12.9, "lng": 77.6},
        "drop": {"lat": 13.0, "lng": 77.7},
        "vehicle_type": "rocket",
    }
    r = requests.post(f"{API}/rides/estimate", json=body)
    assert r.status_code in (400, 422)


# ---------- Worker setup ----------
def test_worker_online_requires_vehicle(work):
    _, h = work
    # Ensure no active vehicle yet (fresh user); attempting online should 400
    # If user had a vehicle from previous test runs, this may already pass.
    r = requests.get(f"{API}/vehicles", headers=h)
    assert r.status_code == 200
    if not r.json().get("active_vehicle_id"):
        r2 = requests.post(f"{API}/worker/online", json={"online": True}, headers=h)
        assert r2.status_code == 400


def test_worker_add_and_activate_vehicle(work):
    _, h = work
    body = {"type": "auto", "plate": "KA01TEST", "license_no": "DL-T-1", "rc_no": "RC-T-1"}
    r = requests.post(f"{API}/vehicles", json=body, headers=h)
    assert r.status_code == 200
    veh = r.json()["vehicle"]
    assert veh["type"] == "auto"
    # GET verify
    r2 = requests.get(f"{API}/vehicles", headers=h)
    assert r2.status_code == 200
    items = r2.json()["vehicles"]
    assert any(v["id"] == veh["id"] for v in items)
    # Activate
    r3 = requests.post(f"{API}/vehicles/{veh['id']}/activate", json={}, headers=h)
    assert r3.status_code == 200
    assert r3.json()["active_vehicle_id"] == veh["id"]


def test_worker_go_online(work):
    _, h = work
    r = requests.post(f"{API}/worker/online", json={"online": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["is_online"] is True


# ---------- Full ride flow ----------
@pytest.fixture(scope="module")
def ride_id(cust, work):
    _, ch = cust
    body = {
        "pickup": {"lat": 12.9719, "lng": 77.6412, "address": "Indiranagar"},
        "drop": {"lat": 12.9352, "lng": 77.6245, "address": "Koramangala"},
        "vehicle_type": "auto",
    }
    r = requests.post(f"{API}/rides", json=body, headers=ch)
    assert r.status_code == 200, r.text
    ride = r.json()["ride"]
    assert ride["status"] == "searching"
    assert ride["fare"] > 0
    return ride["id"]


def test_customer_lists_own_rides(cust, ride_id):
    _, h = cust
    r = requests.get(f"{API}/rides/customer", headers=h)
    assert r.status_code == 200
    assert any(x["id"] == ride_id for x in r.json()["rides"])


def test_worker_sees_available_ride(work, ride_id):
    _, h = work
    r = requests.get(f"{API}/rides/worker/available", headers=h)
    assert r.status_code == 200
    rides = r.json()["rides"]
    assert any(x["id"] == ride_id for x in rides), f"Expected ride {ride_id} in available rides"


def test_worker_accept_and_advance(work, cust, ride_id):
    _, wh = work
    _, ch = cust

    # accept
    r = requests.post(f"{API}/rides/{ride_id}/accept", json={}, headers=wh)
    assert r.status_code == 200
    assert r.json()["ride"]["status"] == "assigned"

    # invalid transition: can't go from assigned → started
    r_bad = requests.post(f"{API}/rides/{ride_id}/status", json={"status": "started"}, headers=wh)
    assert r_bad.status_code == 400

    # arrived
    r = requests.post(f"{API}/rides/{ride_id}/status", json={"status": "arrived"}, headers=wh)
    assert r.status_code == 200
    assert r.json()["ride"]["status"] == "arrived"

    # customer cannot drive status
    r_x = requests.post(f"{API}/rides/{ride_id}/status", json={"status": "started"}, headers=ch)
    assert r_x.status_code == 403

    # started
    r = requests.post(f"{API}/rides/{ride_id}/status", json={"status": "started"}, headers=wh)
    assert r.status_code == 200

    # capture pre-completion balance
    r_w = requests.get(f"{API}/wallet/me", headers=wh)
    assert r_w.status_code == 200
    pre_bal = r_w.json()["balance"]

    # completed
    r = requests.post(f"{API}/rides/{ride_id}/status", json={"status": "completed"}, headers=wh)
    assert r.status_code == 200
    assert r.json()["ride"]["status"] == "completed"

    # post-completion wallet check: balance reduced by exactly ₹1
    r_w2 = requests.get(f"{API}/wallet/me", headers=wh)
    assert r_w2.status_code == 200
    data = r_w2.json()
    assert round(pre_bal - data["balance"], 2) == 1.0, f"expected -1 deduction, got {pre_bal} -> {data['balance']}"
    # Two new transactions for this ride
    txns_for_ride = [t for t in data["transactions"] if t["ride_id"] == ride_id]
    assert len(txns_for_ride) == 2
    types = {t["type"] for t in txns_for_ride}
    assert types == {"earning", "platform_fee"}


def test_accept_already_accepted_fails(work, ride_id):
    _, h = work
    r = requests.post(f"{API}/rides/{ride_id}/accept", json={}, headers=h)
    assert r.status_code == 400


def test_get_ride_by_id(cust, ride_id):
    _, h = cust
    r = requests.get(f"{API}/rides/{ride_id}", headers=h)
    assert r.status_code == 200
    assert r.json()["ride"]["id"] == ride_id


# ---------- Admin ----------
def test_admin_stats(adm):
    _, h = adm
    r = requests.get(f"{API}/admin/stats", headers=h)
    assert r.status_code == 200
    s = r.json()
    for key in ("rides_total", "rides_completed", "customers", "workers", "workers_online", "platform_revenue", "gross_fare"):
        assert key in s
    assert s["rides_total"] >= 1
    assert s["rides_completed"] >= 1
    assert s["platform_revenue"] >= 1.0
    # platform_revenue == completed * 1
    assert round(s["platform_revenue"], 2) == round(s["rides_completed"] * 1.0, 2)


def test_admin_rides(adm, ride_id):
    _, h = adm
    r = requests.get(f"{API}/admin/rides", headers=h)
    assert r.status_code == 200
    assert any(x["id"] == ride_id for x in r.json()["rides"])


def test_admin_users(adm):
    _, h = adm
    r = requests.get(f"{API}/admin/users", headers=h)
    assert r.status_code == 200
    phones = {u["phone"] for u in r.json()["users"]}
    assert CUST_PHONE in phones and WORK_PHONE in phones and ADMIN_PHONE in phones
