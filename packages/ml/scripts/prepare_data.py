"""
prepare_data.py — Feature engineering for NWS Utah Lake thermal-stall predictor.

Reads ground-truth sensor data and the TRUE historical HRRR forecast from
Open-Meteo, then produces a flat CSV of engineered features for XGBoost.

IMPORTANT — Training-Serving Consistency
────────────────────────────────────────
In production the model receives an NWS/HRRR *forecast* as Baseline_Wind,
NOT airport sensor readings.  We therefore train on the same data source:
the archived HRRR model output from Open-Meteo's Historical Forecast API.

Data sources
────────────
1. Weather Underground hourly JSON  (../../scripts/wu-historical-data.json)
   -> Target_Wind  (actual lakefront sensor readings)

2. Open-Meteo Historical Forecast API  (HRRR 3 km model)
   -> Baseline_Wind        wind_speed_10m  at Utah Lake coordinates
   -> Baseline_Direction    wind_direction_10m
   -> Baseline_Gust         wind_gusts_10m
   -> Baseline_Temp         temperature_2m
   -> Pressure gradient     pressure_msl at KSLC coords - pressure_msl at KPVU coords

3. Optional: Ambient CSV export from Zigzag Island PWS
   -> Additional Target_Wind rows (3 years of 5-min data)

4. Utah Lake seasonal water-temp model
   -> Thermal_Delta  (air_temp - water_temp)

Target variable
───────────────
Wind_Error = Target_Wind - Baseline_Wind
  positive -> lake thermal amplified wind beyond HRRR prediction
  negative -> HRRR over-predicted; thermal stalled

Usage
─────
  python prepare_data.py                          # WU JSON + Open-Meteo HRRR
  python prepare_data.py --ambient path/to.csv    # also ingest Ambient CSV
  python prepare_data.py --no-fetch               # skip API, use cache only
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# ── Paths ──────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PKG_DIR = SCRIPT_DIR.parent
REPO_ROOT = PKG_DIR.parent.parent
DATA_DIR = PKG_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

WU_JSON_PATH = REPO_ROOT / "scripts" / "wu-historical-data.json"
HRRR_CACHE = DATA_DIR / "hrrr_cache.json"
PRESSURE_CACHE = DATA_DIR / "pressure_cache.json"
OUTPUT_CSV = DATA_DIR / "training_data.csv"

# ── Coordinates ────────────────────────────────────────────────────────────
# Target: Saratoga Springs / Zigzag Island — NW shore of Utah Lake
TARGET_LAT, TARGET_LON = 40.35, -111.88
# Pressure reference points (north-south gradient drives the thermal)
KSLC_LAT, KSLC_LON = 40.79, -111.98   # Salt Lake City Intl
KPVU_LAT, KPVU_LON = 40.22, -111.72   # Provo Municipal

# ── Constants ──────────────────────────────────────────────────────────────

OPEN_METEO_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"

UTAH_LAKE_STATIONS = [
    "KUTSARAT50", "KUTSARAT88", "KUTSARAT81", "KUTSARAT74", "KUTSARAT62",
    "KUTLEHI73", "KUTLEHI160", "KUTLEHI111",
    "KUTPLEAS11",
]

# Monthly avg water temp (°F) — from satellite-calibrated seasonal model
# Index 0 = January, 11 = December
UTAH_LAKE_WATER_TEMP_F = [36, 39, 43, 48, 55, 65, 72, 72, 68, 55, 46, 37]

# Open-Meteo caps date ranges at ~3 months per request; chunk if needed
MAX_DAYS_PER_REQUEST = 90


# ═══════════════════════════════════════════════════════════════════════════
# 1.  LOAD GROUND-TRUTH SENSOR DATA
# ═══════════════════════════════════════════════════════════════════════════

def load_wu_data() -> pd.DataFrame:
    """Load Weather Underground hourly JSON for Utah Lake stations."""
    print(f"[1/5] Loading WU sensor data from {WU_JSON_PATH.name} ...")

    if not WU_JSON_PATH.exists():
        sys.exit(f"  ERROR: {WU_JSON_PATH} not found.")

    with open(WU_JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    rows = []
    for sid in UTAH_LAKE_STATIONS:
        if sid not in raw:
            print(f"  WARN: station {sid} not in WU JSON — skipping")
            continue
        for entry in raw[sid]["hourly"]:
            rows.append({
                "station_id": sid,
                "datetime": pd.to_datetime(entry["hour"], format="%Y-%m-%d %H"),
                "target_wind": entry["windSpeed"],
                "target_gust": entry["windGust"],
                "target_dir": entry["windDirection"],
                "air_temp": entry["temperature"],
                "obs_count": entry["obsCount"],
            })

    df = pd.DataFrame(rows)
    df = df.dropna(subset=["target_wind"])
    df = df[df["obs_count"] >= 4]
    print(f"  -> {len(df):,} rows from {df['station_id'].nunique()} stations")
    return df


def load_ambient_csv(csv_path: str) -> pd.DataFrame:
    """Load and hourly-aggregate an Ambient Weather Network CSV export."""
    print(f"[1b]  Loading Ambient CSV: {csv_path}")

    df = pd.read_csv(csv_path, parse_dates=["Date"])
    df = df.rename(columns={
        "Date": "datetime",
        "Wind Speed (mph)": "target_wind",
        "Wind Gust (mph)": "target_gust",
        "Wind Direction (°)": "target_dir",
        "Outside temperature Temperature (°F)": "air_temp",
        "Relative Pressure (inHg)": "local_pressure",
    })

    df = df.dropna(subset=["target_wind", "datetime"])
    df["hour"] = df["datetime"].dt.floor("h")
    df["station_id"] = "ZIGZAG_PWS"

    hourly = df.groupby(["station_id", "hour"]).agg(
        target_wind=("target_wind", "mean"),
        target_gust=("target_gust", "max"),
        target_dir=("target_dir", lambda x: x.mode().iloc[0] if len(x) > 0 else np.nan),
        air_temp=("air_temp", "mean"),
        local_pressure=("local_pressure", "mean"),
        obs_count=("target_wind", "count"),
    ).reset_index()

    hourly = hourly.rename(columns={"hour": "datetime"})
    hourly = hourly[hourly["obs_count"] >= 4]
    print(f"  -> {len(hourly):,} hourly rows from Ambient CSV")
    return hourly


# ═══════════════════════════════════════════════════════════════════════════
# 2.  FETCH HRRR HISTORICAL FORECAST FROM OPEN-METEO
# ═══════════════════════════════════════════════════════════════════════════

def _fetch_open_meteo(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    hourly_vars: list[str],
    model: str = "ncep_hrrr_conus",
) -> dict | None:
    """
    Fetch hourly data from the Open-Meteo Historical Forecast API.

    Returns the raw JSON response dict, or None on failure.
    Respects rate limits with a small sleep between calls.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ",".join(hourly_vars),
        "models": model,
        "wind_speed_unit": "mph",
        "temperature_unit": "fahrenheit",
        "timezone": "America/Denver",
    }

    print(f"    GET {OPEN_METEO_URL}")
    print(f"        lat={lat} lon={lon}  {start_date} -> {end_date}")
    print(f"        model={model}  vars={','.join(hourly_vars)}")

    resp = requests.get(OPEN_METEO_URL, params=params, timeout=120)

    if resp.status_code == 429:
        print("    Rate limited — waiting 30s and retrying ...")
        time.sleep(30)
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=120)

    if resp.status_code != 200:
        print(f"    ERROR: HTTP {resp.status_code} — {resp.text[:200]}")
        return None

    return resp.json()


def _open_meteo_to_df(data: dict, prefix: str = "") -> pd.DataFrame:
    """Convert Open-Meteo hourly JSON to a tidy DataFrame."""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    if not times:
        return pd.DataFrame()

    df = pd.DataFrame({"datetime": pd.to_datetime(times)})
    for key, values in hourly.items():
        if key == "time":
            continue
        col_name = f"{prefix}{key}" if prefix else key
        df[col_name] = values

    return df


def _chunk_date_range(start: str, end: str, max_days: int = MAX_DAYS_PER_REQUEST):
    """Yield (start_date, end_date) chunks that stay under the API limit."""
    s = pd.to_datetime(start)
    e = pd.to_datetime(end)
    while s <= e:
        chunk_end = min(s + pd.Timedelta(days=max_days - 1), e)
        yield s.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")
        s = chunk_end + pd.Timedelta(days=1)


def fetch_hrrr_baseline(start_date: str, end_date: str, use_cache: bool = True) -> pd.DataFrame:
    """
    Fetch the HRRR historical forecast for the Utah Lake target point.

    Returns a DataFrame with columns:
      datetime, baseline_wind, baseline_dir, baseline_gust, baseline_temp
    """
    print(f"[2/5] Fetching HRRR baseline forecast (Open-Meteo) ...")

    if use_cache and HRRR_CACHE.exists():
        print(f"  Loading cache: {HRRR_CACHE.name}")
        df = pd.read_json(HRRR_CACHE, orient="records")
        if not df.empty:
            df["datetime"] = pd.to_datetime(df["datetime"])
            print(f"  -> {len(df):,} cached HRRR rows")
            return df

    vars_target = [
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "temperature_2m",
    ]

    frames = []
    for chunk_start, chunk_end in _chunk_date_range(start_date, end_date):
        data = _fetch_open_meteo(
            TARGET_LAT, TARGET_LON, chunk_start, chunk_end, vars_target
        )
        if data:
            frames.append(_open_meteo_to_df(data))
        time.sleep(1)

    if not frames:
        sys.exit("  FATAL: Could not fetch any HRRR data from Open-Meteo.")

    df = pd.concat(frames, ignore_index=True)
    df = df.rename(columns={
        "wind_speed_10m": "baseline_wind",
        "wind_direction_10m": "baseline_dir",
        "wind_gusts_10m": "baseline_gust",
        "temperature_2m": "baseline_temp",
    })

    df.to_json(HRRR_CACHE, orient="records", date_format="iso", indent=2)
    print(f"  -> {len(df):,} HRRR rows cached to {HRRR_CACHE.name}")
    return df


def fetch_pressure_gradient(start_date: str, end_date: str, use_cache: bool = True) -> pd.DataFrame:
    """
    Fetch HRRR pressure_msl at KSLC and KPVU coordinates, return gradient.

    Returns a DataFrame with columns:
      datetime, kslc_pressure, kpvu_pressure, pressure_gradient
    """
    print(f"[3/5] Fetching HRRR pressure gradient (KSLC - KPVU) ...")

    if use_cache and PRESSURE_CACHE.exists():
        print(f"  Loading cache: {PRESSURE_CACHE.name}")
        df = pd.read_json(PRESSURE_CACHE, orient="records")
        if not df.empty:
            df["datetime"] = pd.to_datetime(df["datetime"])
            print(f"  -> {len(df):,} cached pressure rows")
            return df

    kslc_frames = []
    kpvu_frames = []

    for chunk_start, chunk_end in _chunk_date_range(start_date, end_date):
        kslc_data = _fetch_open_meteo(
            KSLC_LAT, KSLC_LON, chunk_start, chunk_end, ["pressure_msl"]
        )
        time.sleep(1)
        kpvu_data = _fetch_open_meteo(
            KPVU_LAT, KPVU_LON, chunk_start, chunk_end, ["pressure_msl"]
        )
        time.sleep(1)

        if kslc_data:
            kslc_frames.append(_open_meteo_to_df(kslc_data, prefix="kslc_"))
        if kpvu_data:
            kpvu_frames.append(_open_meteo_to_df(kpvu_data, prefix="kpvu_"))

    if not kslc_frames or not kpvu_frames:
        print("  WARN: Could not fetch pressure data — gradient will be NaN")
        return pd.DataFrame()

    kslc = pd.concat(kslc_frames, ignore_index=True)
    kpvu = pd.concat(kpvu_frames, ignore_index=True)

    kslc = kslc.rename(columns={"kslc_datetime": "datetime", "kslc_pressure_msl": "kslc_pressure"})
    kpvu = kpvu.rename(columns={"kpvu_datetime": "datetime", "kpvu_pressure_msl": "kpvu_pressure"})

    # The datetime column from _open_meteo_to_df is always called "datetime"
    if "datetime" not in kslc.columns:
        kslc = kslc.rename(columns={c: "datetime" for c in kslc.columns if "datetime" in c.lower()})
    if "datetime" not in kpvu.columns:
        kpvu = kpvu.rename(columns={c: "datetime" for c in kpvu.columns if "datetime" in c.lower()})

    merged = pd.merge(
        kslc[["datetime", "kslc_pressure"]],
        kpvu[["datetime", "kpvu_pressure"]],
        on="datetime",
        how="inner",
    )
    # Gradient: positive = higher pressure in SLC than Provo (favors thermal)
    merged["pressure_gradient"] = merged["kslc_pressure"] - merged["kpvu_pressure"]

    merged.to_json(PRESSURE_CACHE, orient="records", date_format="iso", indent=2)
    print(f"  -> {len(merged):,} pressure rows cached to {PRESSURE_CACHE.name}")
    return merged


# ═══════════════════════════════════════════════════════════════════════════
# 3.  FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════

def get_water_temp(month: int) -> float:
    """Utah Lake seasonal water temperature model (°F)."""
    return UTAH_LAKE_WATER_TEMP_F[month - 1]


def engineer_features(
    target_df: pd.DataFrame,
    hrrr_df: pd.DataFrame,
    pressure_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Join ground-truth sensors with HRRR forecast + pressure by hour,
    then compute the full ML feature set.
    """
    print("[4/5] Engineering features ...")

    # Align everything on floored hour
    target = target_df.copy()
    target["hour"] = target["datetime"].dt.floor("h")

    hrrr = hrrr_df.copy()
    hrrr["hour"] = hrrr["datetime"].dt.floor("h")

    # Merge target with HRRR baseline
    merged = pd.merge(target, hrrr, on="hour", how="inner", suffixes=("", "_hrrr"))

    if merged.empty:
        print("  WARN: No overlapping hours between target and HRRR!")
        print(f"  Target range:  {target['hour'].min()} - {target['hour'].max()}")
        print(f"  HRRR range:    {hrrr['hour'].min()} - {hrrr['hour'].max()}")
        return pd.DataFrame()

    # Merge pressure gradient (optional — degrade gracefully if missing)
    if not pressure_df.empty:
        press = pressure_df.copy()
        press["hour"] = press["datetime"].dt.floor("h")
        merged = pd.merge(
            merged,
            press[["hour", "kslc_pressure", "kpvu_pressure", "pressure_gradient"]],
            on="hour",
            how="left",
        )
    else:
        merged["kslc_pressure"] = np.nan
        merged["kpvu_pressure"] = np.nan
        merged["pressure_gradient"] = np.nan

    # ── Core features ──────────────────────────────────────────────────

    merged["Baseline_Wind"] = merged["baseline_wind"]
    merged["Target_Wind"] = merged["target_wind"]
    merged["Wind_Error"] = merged["Target_Wind"] - merged["Baseline_Wind"]

    merged["Pressure_Gradient"] = merged["pressure_gradient"]

    merged["Month"] = merged["hour"].dt.month
    merged["water_temp"] = merged["Month"].apply(get_water_temp)
    merged["Thermal_Delta"] = merged["air_temp"] - merged["water_temp"]

    merged["Hour_of_Day"] = merged["hour"].dt.hour
    merged["Wind_Direction"] = merged["baseline_dir"]
    merged["Temperature"] = merged["air_temp"]
    merged["Wind_Gust_Baseline"] = merged["baseline_gust"]

    # ── Derived features ───────────────────────────────────────────────

    # Thermal window flag (10 AM - 6 PM local)
    merged["Is_Thermal_Window"] = (
        (merged["Hour_of_Day"] >= 10) & (merged["Hour_of_Day"] <= 18)
    ).astype(int)

    # Wind direction sin/cos (handles 360° wrap-around)
    dir_rad = np.deg2rad(merged["Wind_Direction"].fillna(0))
    merged["Wind_Dir_Sin"] = np.sin(dir_rad).round(4)
    merged["Wind_Dir_Cos"] = np.cos(dir_rad).round(4)

    # Hour sin/cos (handles midnight wrap-around)
    hour_rad = 2 * np.pi * merged["Hour_of_Day"] / 24
    merged["Hour_Sin"] = np.sin(hour_rad).round(4)
    merged["Hour_Cos"] = np.cos(hour_rad).round(4)

    # HRRR model temperature at target point (proxy for synoptic air mass)
    merged["HRRR_Temp"] = merged["baseline_temp"]

    # Delta between local sensor temp and HRRR model temp
    # Large positive delta -> surface heating exceeds model expectation
    merged["Temp_Model_Delta"] = merged["air_temp"] - merged["baseline_temp"]

    # ── Select & clean ─────────────────────────────────────────────────

    feature_cols = [
        "hour", "station_id",
        # Target
        "Wind_Error", "Target_Wind",
        # Primary features (match production inference inputs)
        "Baseline_Wind", "Pressure_Gradient", "Thermal_Delta",
        "Hour_of_Day", "Month", "Wind_Direction", "Temperature",
        "Wind_Gust_Baseline",
        # Derived features
        "Is_Thermal_Window",
        "Wind_Dir_Sin", "Wind_Dir_Cos",
        "Hour_Sin", "Hour_Cos",
        "HRRR_Temp", "Temp_Model_Delta",
    ]
    result = merged[[c for c in feature_cols if c in merged.columns]].copy()
    result = result.dropna(subset=["Wind_Error", "Baseline_Wind", "Target_Wind"])
    result = result.sort_values("hour").reset_index(drop=True)

    print(f"  -> {len(result):,} training rows")
    print(f"  -> Date range: {result['hour'].min()} - {result['hour'].max()}")
    print(f"  -> Wind_Error stats:")
    print(f"      mean  = {result['Wind_Error'].mean():+.2f} mph")
    print(f"      std   = {result['Wind_Error'].std():.2f} mph")
    print(f"      min   = {result['Wind_Error'].min():+.1f} mph")
    print(f"      max   = {result['Wind_Error'].max():+.1f} mph")

    return result


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Prepare ML training data — HRRR forecast vs actual sensor readings"
    )
    parser.add_argument("--ambient", type=str, help="Path to Ambient CSV export")
    parser.add_argument(
        "--no-fetch", action="store_true",
        help="Skip Open-Meteo API calls; use cached data only",
    )
    parser.add_argument("--output", type=str, default=str(OUTPUT_CSV))
    args = parser.parse_args()

    # 1. Load ground-truth sensor data
    wu_df = load_wu_data()

    if args.ambient and Path(args.ambient).exists():
        amb_df = load_ambient_csv(args.ambient)
        wu_df = pd.concat([wu_df, amb_df], ignore_index=True)
        print(f"  -> Combined: {len(wu_df):,} total target rows")

    date_min = wu_df["datetime"].min().strftime("%Y-%m-%d")
    date_max = wu_df["datetime"].max().strftime("%Y-%m-%d")
    print(f"  -> Sensor date range: {date_min} to {date_max}")

    # 2. Fetch HRRR baseline forecast
    #    --no-fetch means "use cache only; never hit the API"
    hrrr_df = fetch_hrrr_baseline(date_min, date_max, use_cache=True)
    if hrrr_df.empty and args.no_fetch:
        sys.exit("  No HRRR cache found and --no-fetch specified.")
    if hrrr_df.empty:
        hrrr_df = fetch_hrrr_baseline(date_min, date_max, use_cache=False)

    # 3. Fetch pressure gradient
    pressure_df = fetch_pressure_gradient(date_min, date_max, use_cache=True)
    if pressure_df.empty and not args.no_fetch:
        pressure_df = fetch_pressure_gradient(date_min, date_max, use_cache=False)

    # 4. Engineer features
    result = engineer_features(wu_df, hrrr_df, pressure_df)

    if result.empty:
        sys.exit("No training data produced. Check date ranges and API connectivity.")

    # 5. Save
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(out_path, index=False)

    print(f"\n[5/5] Saved {len(result):,} rows -> {out_path.name}")
    print(f"\nFeature summary:")
    print(result.describe().round(2).to_string())
    print(f"\nCorrelation with Wind_Error:")
    numeric = result.select_dtypes(include=[np.number])
    corr = numeric.corr()["Wind_Error"].drop(["Wind_Error", "Target_Wind"]).sort_values(
        key=abs, ascending=False
    )
    for feat, val in corr.items():
        print(f"  {feat:<25s} {val:+.3f}")


if __name__ == "__main__":
    main()
