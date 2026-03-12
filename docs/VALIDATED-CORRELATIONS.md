# Validated Wind Correlations

This document records all validated correlations discovered through historical data analysis.

---

## Utah Lake

### SE Thermal - Spanish Fork Canyon (QSF) → Zig Zag

**Mechanism**: Spanish Fork Canyon heats up, creating SE flow that reaches Utah Lake ~2 hours later.

**Analysis Period**: 3 years (2023-2026)

**Correlation**:
| QSF SE Wind | Lead Time | Zig Zag Avg | Foil Kiteable | Twin Tip Kiteable |
|-------------|-----------|-------------|---------------|-------------------|
| 6-8 mph     | 2 hours   | 8.5 mph     | 35%           | 10%               |
| 8-10 mph    | 2 hours   | 11.2 mph    | 52%           | 25%               |
| 10-15 mph   | 2 hours   | 14.8 mph    | 75%           | 45%               |
| 15+ mph     | 2 hours   | 19.5 mph    | 90%           | 70%               |

**Threshold Recommendation**: 8+ mph for actionable prediction

---

### North Flow - Salt Lake City Airport (KSLC) → Zig Zag

**Mechanism**: Pressure gradient drives north flow from Great Salt Lake area through Point of Mountain gap to Utah Lake.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| KSLC N Wind | Lead Time | Zig Zag Avg | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|-------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph     | 1 hour    | 9.3 mph     | 45%           | 14%               | 156         |
| 8-10 mph    | 1 hour    | 12.6 mph    | 56%           | 31%               | 89          |
| 10-15 mph   | 1 hour    | 15.5 mph    | 81%           | 50%               | 52          |
| 15+ mph     | 1 hour    | 23.4 mph    | 100%          | 100%              | 18          |

**Key Finding**: 5 mph threshold only 45% kiteable - raised minimum to 8 mph for meaningful predictions.

**Threshold Recommendation**: 8+ mph for "possible", 10+ mph for "likely"

---

### North Flow (Southern Launches) - Provo Airport (KPVU) → Lincoln/Sandy Beach

**Mechanism**: KPVU is closer to southern Utah Lake launches, providing better correlation than KSLC.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| KPVU N Wind | Lead Time | Target Avg  | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|-------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph     | 1 hour    | 10.1 mph    | 52%           | 18%               | 134         |
| 8-10 mph    | 1 hour    | 14.2 mph    | **78%**       | 42%               | 76          |
| 10-15 mph   | 1 hour    | 17.8 mph    | 89%           | 62%               | 41          |
| 15+ mph     | 1 hour    | 24.1 mph    | 100%          | 95%               | 15          |

**Key Finding**: KPVU is **significantly better** than KSLC for southern launches:
- At 8-10 mph: KPVU = 78% foil kiteable vs KSLC = 56%
- At 10-15 mph: KPVU = 89% foil kiteable vs KSLC = 81%

**Recommendation**: Use KPVU as primary indicator for Lincoln Beach and Sandy Beach.

---

### Gap Wind Confirmation - Point of Mountain (UTALP)

**Mechanism**: UTALP sits at the gap entrance, confirming north flow is funneling through.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| UTALP N Wind | Lead Time | Target Avg  | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|--------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph      | 0.5 hours | 8.8 mph     | 42%           | 12%               | 145         |
| 8-10 mph     | 0.5 hours | 11.9 mph    | 58%           | 28%               | 82          |
| 10-15 mph    | 0.5 hours | 15.2 mph    | 78%           | 48%               | 48          |
| 15+ mph      | 0.5 hours | 21.5 mph    | 95%           | 85%               | 22          |

**Key Finding**: UTALP provides near-real-time confirmation (30 min lead). Best used in combination with KSLC/KPVU for higher confidence.

---

## Deer Creek Reservoir

### Canyon Thermal - Arrowhead Summit (SND) → Deer Creek Dam

**Mechanism**: Provo Canyon heats, creating upslope flow that draws wind up canyon.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| Arrowhead SSW Wind | Lead Time | Dam Avg | Foil Kiteable | Twin Tip Kiteable |
|--------------------|-----------|---------|---------------|-------------------|
| 10-12 mph          | 1.5 hours | 6.5 mph | 4%            | 0%                |
| 12-15 mph          | 1.5 hours | 9.2 mph | 13%           | 3%                |
| 15-18 mph          | 1.5 hours | 12.8 mph| 25%           | 10%               |
| 18+ mph            | 1.5 hours | 16.5 mph| 30%           | 15%               |

**Key Finding**: Deer Creek thermals are less reliable than Utah Lake. Even strong Arrowhead signals only produce ~30% kiteable conditions.

**Threshold Recommendation**: 15+ mph for "possible", but manage expectations

---

## Indicator Comparison Summary

### Best Indicators by Launch

| Launch | Best Thermal Indicator | Best North Flow Indicator |
|--------|------------------------|---------------------------|
| MM19 (North) | QSF (Spanish Fork) | KSLC + UTALP |
| Zig Zag | QSF (Spanish Fork) | KSLC + UTALP |
| Vineyard | QSF (Spanish Fork) | KSLC + UTALP |
| Sandy Beach | QSF (Spanish Fork) | **KPVU** (Provo) |
| Lincoln Beach | QSF (Spanish Fork) | **KPVU** (Provo) |

### Indicator Reliability Ranking

| Indicator | Wind Type | Reliability | Notes |
|-----------|-----------|-------------|-------|
| KPVU (Provo) | North Flow | ⭐⭐⭐⭐⭐ | Best for southern launches |
| KSLC (SLC) | North Flow | ⭐⭐⭐⭐ | Good for central/northern |
| QSF (Spanish Fork) | SE Thermal | ⭐⭐⭐⭐ | 2-hour lead time |
| UTALP (PotM) | Gap Wind | ⭐⭐⭐ | Confirmation indicator |
| SND (Arrowhead) | Canyon Thermal | ⭐⭐ | Lower reliability |

---

## How These Correlations Were Validated

### Step 1: Identify Good Wind Days
- Query target station historical data
- Find days with 10+ mph wind from target direction
- Record first hour of good wind

### Step 2: Check Indicator Stations
- For each good wind day, query indicator stations
- Check what indicator showed 1, 2, 3, 4 hours before
- Calculate correlation rate

### Step 3: Validate with Speed Buckets
**This is the critical step most skip!**

Instead of just "does indicator correlate with target", we ask:
> "When indicator shows X mph, what is the ACTUAL speed at target?"
> "What % of the time is it KITEABLE?"

This gives actionable thresholds, not just correlations.

### Step 4: Set Meaningful Thresholds
- Don't alert at 5 mph if only 45% kiteable
- Set minimum threshold where prediction is actionable
- Provide specific probabilities for each speed bucket

---

## Future Validation Needed

1. **Willard Bay**: Need to validate Hill AFB (KHIF) correlation
2. **Pineview**: Need to identify and validate indicators
3. **Seasonal Variation**: Do correlations change by season?
4. **Time of Day**: Do correlations change by time of day?
5. **Pressure Gradient**: How does ΔP affect correlation strength?

---

*Last Updated: March 2026*
*Data Sources: MesoWest/Synoptic API, Ambient Weather PWS*
