#!/usr/bin/env python3
"""
Analyze Garmin FIT files from a kiteboarding session.

Dependencies: fitparse, matplotlib (and numpy, typically pulled in by matplotlib)

Usage:
  python analyze_session.py <path_to_fit_file>
  python analyze_session.py --dir <path_to_garmin_activity_folder>
"""

from __future__ import annotations

import csv
import math
import os
import sys
from datetime import datetime
from statistics import mean
from typing import Any, Dict, List, Optional, Tuple

from fitparse import FitFile
import matplotlib.pyplot as plt

# --- Constants ---
MPS_TO_KTS = 1.9438444924406  # 1 knot = 0.514444 m/s
M_TO_NM = 0.0005399568034557236
SEMICIRCLE_SCALE = 180.0 / (2**31)
GPS_GAP_THRESHOLD_S = 3.0
SPEED_SPIKE_KTS = 50.0
JUMP_ALT_DELTA_M = 0.5
JUMP_WINDOW_S = 5.0
OUTPUT_PNG = "session_analysis.png"
OUTPUT_CSV = "session_records.csv"


def semicircles_to_deg(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value) * SEMICIRCLE_SCALE
    except (TypeError, ValueError):
        return None


def mps_to_knots(speed_mps: Optional[float]) -> Optional[float]:
    if speed_mps is None:
        return None
    try:
        return float(speed_mps) * MPS_TO_KTS
    except (TypeError, ValueError):
        return None


def parse_args(argv: List[str]) -> Tuple[str, str]:
    """Returns (mode, path) where mode is 'file' or 'dir'."""
    if len(argv) < 2:
        print(
            "Usage:\n"
            "  python analyze_session.py <path_to_fit_file>\n"
            "  python analyze_session.py --dir <path_to_garmin_activity_folder>",
            file=sys.stderr,
        )
        sys.exit(1)
    if argv[1] == "--dir":
        if len(argv) < 3:
            print("Error: --dir requires a directory path.", file=sys.stderr)
            sys.exit(1)
        return "dir", argv[2]
    return "file", argv[1]


def find_newest_fit(directory: str) -> str:
    directory = os.path.abspath(os.path.expanduser(directory))
    if not os.path.isdir(directory):
        print(f"Error: not a directory: {directory}", file=sys.stderr)
        sys.exit(1)
    candidates: List[Tuple[float, str]] = []
    for name in os.listdir(directory):
        lower = name.lower()
        if lower.endswith(".fit"):
            full = os.path.join(directory, name)
            if os.path.isfile(full):
                try:
                    mtime = os.path.getmtime(full)
                except OSError:
                    continue
                candidates.append((mtime, full))
    if not candidates:
        print(f"Error: no .fit files found in {directory}", file=sys.stderr)
        sys.exit(1)
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def resolve_fit_path(argv: List[str]) -> str:
    mode, path = parse_args(argv)
    path = os.path.abspath(os.path.expanduser(path))
    if mode == "dir":
        return find_newest_fit(path)
    if not os.path.isfile(path):
        print(f"Error: FIT file not found: {path}", file=sys.stderr)
        sys.exit(1)
    return path


def get_field(values: Dict[str, Any], *names: str) -> Any:
    for n in names:
        if n in values and values[n] is not None:
            return values[n]
    return None


def extract_records(fit_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Parse FIT file; return list of per-record dicts and session-level summary fields."""
    fitfile = FitFile(fit_path)
    rows: List[Dict[str, Any]] = []
    session_summary: Dict[str, Any] = {}

    for message in fitfile.get_messages("session"):
        vals = message.get_values()
        for key in (
            "total_timer_time",
            "total_elapsed_time",
            "total_distance",
            "total_calories",
            "avg_speed",
            "max_speed",
        ):
            if key in vals and vals[key] is not None and key not in session_summary:
                session_summary[key] = vals[key]

    for message in fitfile.get_messages("record"):
        vals = message.get_values()
        ts = get_field(vals, "timestamp")
        lat_sc = get_field(vals, "position_lat")
        lon_sc = get_field(vals, "position_long")
        speed_mps = get_field(vals, "enhanced_speed", "speed")
        hr = get_field(vals, "heart_rate")
        alt_m = get_field(vals, "enhanced_altitude", "altitude")
        dist_m = get_field(vals, "distance")

        row: Dict[str, Any] = {
            "timestamp": ts,
            "lat": semicircles_to_deg(lat_sc) if lat_sc is not None else None,
            "lon": semicircles_to_deg(lon_sc) if lon_sc is not None else None,
            "speed_mps": float(speed_mps) if speed_mps is not None else None,
            "speed_kts": mps_to_knots(float(speed_mps)) if speed_mps is not None else None,
            "hr": int(hr) if hr is not None else None,
            "altitude_m": float(alt_m) if alt_m is not None else None,
            "distance_m": float(dist_m) if dist_m is not None else None,
        }
        rows.append(row)

    return rows, session_summary


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))
    return r * c


def compute_distance_fallback(rows: List[Dict[str, Any]]) -> Optional[float]:
    total = 0.0
    prev: Optional[Tuple[float, float]] = None
    for r in rows:
        lat, lon = r.get("lat"), r.get("lon")
        if lat is None or lon is None:
            continue
        if prev is not None:
            total += haversine_m(prev[0], prev[1], lat, lon)
        prev = (lat, lon)
    if prev is None:
        return None
    return total


def to_epoch_seconds(ts: Any) -> Optional[float]:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts.timestamp()
    if isinstance(ts, (int, float)):
        return float(ts)
    return None


def build_timeline(rows: List[Dict[str, Any]]) -> Tuple[
    List[float],
    List[Optional[float]],
    List[Optional[float]],
    List[Optional[float]],
    List[Optional[float]],
    List[Optional[float]],
    List[Optional[float]],
]:
    """Relative seconds from first valid timestamp, and parallel series."""
    t0: Optional[float] = None
    for r in rows:
        t = to_epoch_seconds(r.get("timestamp"))
        if t is not None:
            t0 = t
            break
    if t0 is None:
        return [], [], [], [], [], [], []

    rel: List[float] = []
    speed_kts: List[Optional[float]] = []
    hr: List[Optional[float]] = []
    alt: List[Optional[float]] = []
    latl: List[Optional[float]] = []
    lonl: List[Optional[float]] = []
    dist: List[Optional[float]] = []

    for r in rows:
        t = to_epoch_seconds(r.get("timestamp"))
        if t is None:
            continue
        rel.append(t - t0)
        speed_kts.append(r.get("speed_kts"))
        v = r.get("hr")
        hr.append(float(v) if v is not None else None)
        alt.append(r.get("altitude_m"))
        latl.append(r.get("lat"))
        lonl.append(r.get("lon"))
        dist.append(r.get("distance_m"))

    return rel, speed_kts, hr, alt, latl, lonl, dist


def count_gps_gaps(rel_times: List[float], has_fix: List[bool]) -> int:
    if len(rel_times) < 2:
        return 0
    gaps = 0
    prev_t: Optional[float] = None
    for t, ok in zip(rel_times, has_fix):
        if not ok:
            continue
        if prev_t is not None and (t - prev_t) > GPS_GAP_THRESHOLD_S:
            gaps += 1
        prev_t = t
    return gaps


def count_speed_spikes(speed_kts: List[Optional[float]]) -> int:
    return sum(1 for s in speed_kts if s is not None and s > SPEED_SPIKE_KTS)


def find_jump_candidates(
    rel_times: List[float], altitudes: List[Optional[float]]
) -> List[int]:
    """Indices where altitude rises > JUMP_ALT_DELTA_M within JUMP_WINDOW_S seconds."""
    candidates: List[int] = []
    n = len(rel_times)
    for j in range(n):
        aj = altitudes[j]
        if aj is None:
            continue
        tj = rel_times[j]
        for i in range(j):
            if altitudes[i] is None:
                continue
            dt = tj - rel_times[i]
            if dt <= 0 or dt > JUMP_WINDOW_S:
                continue
            if aj - altitudes[i] > JUMP_ALT_DELTA_M:
                if j not in candidates:
                    candidates.append(j)
                break
    return candidates


def safe_mean(values: List[Optional[float]]) -> Optional[float]:
    xs = [float(v) for v in values if v is not None]
    if not xs:
        return None
    return mean(xs)


def safe_max(values: List[Optional[float]]) -> Optional[float]:
    xs = [float(v) for v in values if v is not None]
    if not xs:
        return None
    return max(xs)


def plot_for_display(
    rel: List[float],
    speed_kts: List[Optional[float]],
    hr: List[Optional[float]],
    alt: List[Optional[float]],
    latl: List[Optional[float]],
    lonl: List[Optional[float]],
    jump_indices: List[int],
) -> None:
    def series_numeric(vals: List[Optional[float]]) -> List[float]:
        return [float("nan") if v is None else float(v) for v in vals]

    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    ax_speed, ax_hr = axes[0]
    ax_alt, ax_gps = axes[1]

    spd = series_numeric(speed_kts)
    ax_speed.plot(rel, spd, color="C0", linewidth=0.8, label="Speed (kts)")
    spike_mask = [s if s is not None and s > SPEED_SPIKE_KTS else float("nan") for s in speed_kts]
    ax_speed.plot(rel, spike_mask, "rx", markersize=4, label=f">{SPEED_SPIKE_KTS:.0f} kts")
    ax_speed.set_ylabel("Speed (knots)")
    ax_speed.set_xlabel("Time (s)")
    ax_speed.set_title("Speed over time")
    ax_speed.legend(loc="upper right", fontsize=8)
    ax_speed.grid(True, alpha=0.3)

    ax_hr.plot(rel, series_numeric(hr), color="C1", linewidth=0.8)
    ax_hr.set_ylabel("Heart rate (bpm)")
    ax_hr.set_xlabel("Time (s)")
    ax_hr.set_title("Heart rate over time")
    ax_hr.grid(True, alpha=0.3)

    altn = series_numeric(alt)
    ax_alt.plot(rel, altn, color="C2", linewidth=0.8, label="Altitude (m)")
    for ji in jump_indices:
        if ji < len(rel):
            ax_alt.axvline(rel[ji], color="red", alpha=0.35, linewidth=0.8)
    ax_alt.set_ylabel("Altitude (m)")
    ax_alt.set_xlabel("Time (s)")
    ax_alt.set_title("Altitude (barometric) — vertical lines: jump candidates")
    ax_alt.legend(loc="upper right", fontsize=8)
    ax_alt.grid(True, alpha=0.3)

    lats = [float("nan") if v is None else float(v) for v in latl]
    lons = [float("nan") if v is None else float(v) for v in lonl]
    ax_gps.plot(lons, lats, "b-", linewidth=0.6, alpha=0.8)
    ax_gps.plot(lons, lats, "b.", markersize=1, alpha=0.5)
    ax_gps.set_xlabel("Longitude")
    ax_gps.set_ylabel("Latitude")
    ax_gps.set_title("GPS track")
    ax_gps.set_aspect("equal", adjustable="box")
    ax_gps.grid(True, alpha=0.3)

    fig.tight_layout()
    fig.savefig(OUTPUT_PNG, dpi=150)
    plt.close(fig)


def write_csv(rows: List[Dict[str, Any]], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "lat", "lon", "speed_kts", "hr", "altitude_m"])
        for r in rows:
            ts = r.get("timestamp")
            ts_str = ts.isoformat() if isinstance(ts, datetime) else ("" if ts is None else str(ts))
            w.writerow(
                [
                    ts_str,
                    r.get("lat"),
                    r.get("lon"),
                    r.get("speed_kts"),
                    r.get("hr"),
                    r.get("altitude_m"),
                ]
            )


def main() -> None:
    fit_path = resolve_fit_path(sys.argv)
    rows, session_summary = extract_records(fit_path)

    if not rows:
        print("No record messages found in FIT file.")
        sys.exit(1)

    rel, speed_kts, hr, alt, latl, lonl, dist_series = build_timeline(rows)

    has_fix = [
        latl[i] is not None and lonl[i] is not None for i in range(len(rel))
    ]
    n_fixes = sum(has_fix)
    gps_gaps = count_gps_gaps(rel, has_fix)
    n_spikes = count_speed_spikes(speed_kts)
    jump_idx = find_jump_candidates(rel, alt)

    duration_s: Optional[float] = None
    if len(rel) >= 2:
        duration_s = rel[-1] - rel[0]
    elif session_summary.get("total_timer_time") is not None:
        duration_s = float(session_summary["total_timer_time"])
    elif session_summary.get("total_elapsed_time") is not None:
        duration_s = float(session_summary["total_elapsed_time"])

    distance_m: Optional[float] = None
    for v in reversed(dist_series):
        if v is not None:
            distance_m = v
            break
    if distance_m is None and session_summary.get("total_distance") is not None:
        distance_m = float(session_summary["total_distance"])
    if distance_m is None:
        distance_m = compute_distance_fallback(rows)

    distance_nm = distance_m * M_TO_NM if distance_m is not None else None

    max_spd = safe_max(speed_kts)
    avg_spd = safe_mean(speed_kts)
    if max_spd is None and session_summary.get("max_speed") is not None:
        max_spd = mps_to_knots(float(session_summary["max_speed"]))
    if avg_spd is None and session_summary.get("avg_speed") is not None:
        avg_spd = mps_to_knots(float(session_summary["avg_speed"]))

    max_hr_f = safe_max(hr)
    avg_hr_f = safe_mean(hr)
    max_hr = int(round(max_hr_f)) if max_hr_f is not None else None
    avg_hr = int(round(avg_hr_f)) if avg_hr_f is not None else None

    calories = session_summary.get("total_calories")
    if calories is not None:
        try:
            calories = int(round(float(calories)))
        except (TypeError, ValueError):
            calories = None

    # Console report
    print("=" * 60)
    print("Kite session FIT analysis")
    print("=" * 60)
    print(f"File: {fit_path}")
    print()
    print("--- Session summary ---")
    if duration_s is not None:
        print(f"  Duration:     {duration_s / 60.0:.1f} min ({duration_s:.0f} s)")
    else:
        print("  Duration:     (unknown)")
    if distance_nm is not None:
        print(f"  Distance:     {distance_nm:.2f} NM ({distance_m:.0f} m)")
    else:
        print("  Distance:     (unknown)")
    if max_spd is not None:
        print(f"  Max speed:    {max_spd:.1f} kts")
    else:
        print("  Max speed:    (n/a)")
    if avg_spd is not None:
        print(f"  Avg speed:    {avg_spd:.1f} kts")
    else:
        print("  Avg speed:    (n/a)")
    if max_hr is not None:
        print(f"  Max HR:       {max_hr} bpm")
    else:
        print("  Max HR:       (n/a)")
    if avg_hr is not None:
        print(f"  Avg HR:       {avg_hr} bpm")
    else:
        print("  Avg HR:       (n/a)")
    if calories is not None:
        print(f"  Calories:     {calories} (from session)")
    else:
        print("  Calories:     (n/a)")
    print()
    print("--- GPS quality ---")
    print(f"  Position fixes (records with lat/lon): {n_fixes}")
    print(f"  Gaps > {GPS_GAP_THRESHOLD_S:.0f}s between fixes: {gps_gaps}")
    print(f"  Speed samples > {SPEED_SPIKE_KTS:.0f} kts (noise flag): {n_spikes}")
    print()
    print("--- Jump candidates (alt +{:.1f}m within {:.0f}s) ---".format(JUMP_ALT_DELTA_M, JUMP_WINDOW_S))
    if jump_idx:
        print(f"  Count: {len(jump_idx)} (see vertical lines on altitude subplot)")
        for ji in jump_idx[:20]:
            if ji < len(rel):
                print(f"    t ≈ {rel[ji]:.1f} s, alt ≈ {alt[ji]} m")
        if len(jump_idx) > 20:
            print(f"    ... and {len(jump_idx) - 20} more")
    else:
        print("  None detected")
    print()
    print(f"Saved plot:   {os.path.abspath(OUTPUT_PNG)}")
    print(f"Saved CSV:    {os.path.abspath(OUTPUT_CSV)}")
    print("=" * 60)

    plot_for_display(rel, speed_kts, hr, alt, latl, lonl, jump_idx)
    write_csv(rows, OUTPUT_CSV)


if __name__ == "__main__":
    main()
