# RALPH Validation Report

Generated: 2026-05-28T20:55:54.456Z

## Summary

- Total locations: **46**
- Grades:
  - A: 32
  - B: 14
- Issues:
  - medium: 14
  - low: 2
  - info: 17

## Top Issue Codes

- `INSUFFICIENT_THERMAL_DAYS`: 17
- `PEAK_HOUR_DRIFT`: 14
- `DIRECTION_DRIFT`: 2

## Per-Location Results

### Bear Lake (`bear-lake`) — Grade: **A**
- Coords: 41.96, -111.302
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=3, thermal=OK
- Log: observed peak 15:00 @ 12.5 mph @ 291°
- Predict: peakHr=14, optDir=285°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=5.789841915140585° (OK)

### Deer Creek (`deer-creek`) — Grade: **A**
- Coords: 40.45830163741306, -111.47407868398149
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=5, thermal=OK
- Log: observed peak 15:00 @ 8.7 mph @ 210°
- Predict: peakHr=15, optDir=215°, prob=92%
- Hone: peakDrift=0h (OK), dirDrift=5.382900186683486° (OK)

### East Canyon Reservoir (`east-canyon`) — Grade: **A**
- Coords: 40.892, -111.594
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Echo Reservoir (`echo`) — Grade: **A**
- Coords: 40.9645, -111.438
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=255°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Fish Lake (`fish-lake`) — Grade: **A**
- Coords: 38.5462, -111.7135
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 14:00 @ 11.6 mph @ 227°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=0h (OK), dirDrift=2.332753728081002° (OK)

### Flaming Gorge (`flaming-gorge`) — Grade: **B**
- Coords: 41.0385, -109.5725
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 15.1 mph @ 167°
- Predict: peakHr=14, optDir=165°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=1.514987183800713° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 6 qualifying days (drift 3h)

### Grantsville Reservoir (`grantsville`) — Grade: **A**
- Coords: 40.59, -112.44
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Hyrum Reservoir (`hyrum`) — Grade: **A**
- Coords: 41.6225, -111.868
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=190°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Inspiration Point (`inspo`) — Grade: **A**
- Coords: 40.3, -111.64
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=13, optDir=250°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Jordanelle Reservoir (`jordanelle`) — Grade: **A**
- Coords: 40.599, -111.4302
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=3, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Lake Powell (`lake-powell`) — Grade: **B**
- Coords: 37.0173, -111.4858
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 16.1 mph @ 201°
- Predict: peakHr=14, optDir=200°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=1.163727343010578° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 7 qualifying days (drift 3h)

### Minersville Reservoir (`minersville`) — Grade: **B**
- Coords: 38.213, -112.874
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 18.1 mph @ 220°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=5.356315048776622° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 6 qualifying days (drift 3h)

### Monte Cristo (`monte-cristo`) — Grade: **B**
- Coords: 41.45, -111.5
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 16:00 @ 12.1 mph @ 271°
- Predict: peakHr=13, optDir=285°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=13.958009781146018° (OK)
- Verify: suggested peak hour = 16 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 16:00 across 8 qualifying days (drift 3h)

### Otter Creek Reservoir (`otter-creek`) — Grade: **B**
- Coords: 38.352, -111.987
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 10.8 mph @ 201°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=3.8629318892935203° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 4 qualifying days (drift 3h)

### Panguitch Lake (`panguitch`) — Grade: **A**
- Coords: 37.713, -112.653
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=255°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Pineview Reservoir (`pineview`) — Grade: **A**
- Coords: 41.2552, -111.8484
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak 15:00 @ 8.7 mph @ 281°
- Predict: peakHr=14, optDir=270°, prob=28%
- Hone: peakDrift=1h (OK), dirDrift=10.766460054055074° (OK)

### Piute Reservoir (`piute`) — Grade: **A**
- Coords: 38.328, -112.162
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 14:00 @ 13.4 mph @ 194°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=0h (OK), dirDrift=11.380467206004909° (OK)

### Point of the Mountain — North (`potm-north`) — Grade: **A**
- Coords: 40.46, -111.9
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak 17:00 @ 12.4 mph @ 343°
- Predict: peakHr=15, optDir=340°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=2.678466317915138° (OK)

### Point of the Mountain — South (`potm-south`) — Grade: **B**
- Coords: 40.445, -111.915
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak 16:00 @ 16 mph @ 138°
- Predict: peakHr=10, optDir=180°, prob=null%
- Hone: peakDrift=6h (DRIFT), dirDrift=42.00107361703232° (DRIFT)
- Verify: suggested peak hour = 16 (was 10)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 10:00, observed 16:00 across 6 qualifying days (drift 6h)
  - **LOW** [`DIRECTION_DRIFT`]: Predicted optimal 180°, observed 138° (drift 42° across 6 qualifying days)

### Powder Mountain (`powder-mountain`) — Grade: **A**
- Coords: 41.38, -111.78
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 14:00 @ 9.7 mph @ 241°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=16.250749522594788° (OK)

### Quail Creek Reservoir (`quail-creek`) — Grade: **B**
- Coords: 37.192, -113.378
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 15.9 mph @ 230°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=4h (DRIFT), dirDrift=5.080167102988298° (OK)
- Verify: suggested peak hour = 17 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 17:00 across 13 qualifying days (drift 4h)

### Red Fleet Reservoir (`red-fleet`) — Grade: **B**
- Coords: 40.5748, -109.4635
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 11.9 mph @ 201°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=4.243550764513344° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 6 qualifying days (drift 3h)

### Rockport Reservoir (`rockport`) — Grade: **A**
- Coords: 40.783, -111.3955
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Rush Lake (`rush-lake`) — Grade: **A**
- Coords: 40.5, -112.37
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 15:00 @ 13.3 mph @ 178°
- Predict: peakHr=14, optDir=190°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=12.24927005554082° (OK)

### Sand Hollow Reservoir (`sand-hollow`) — Grade: **B**
- Coords: 37.1072, -113.385
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 18:00 @ 16.5 mph @ 232°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=6.524856092358675° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 8 qualifying days (drift 5h)

### Scofield Reservoir (`scofield`) — Grade: **B**
- Coords: 39.7865, -111.1518
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 16:00 @ 12.9 mph @ 298°
- Predict: peakHr=13, optDir=285°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=12.840472183561474° (OK)
- Verify: suggested peak hour = 16 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 16:00 across 11 qualifying days (drift 3h)

### Skyline Drive (Big Drift) (`skyline-drive`) — Grade: **B**
- Coords: 39.61554, -111.30271
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=3, lakeshore=2, thermal=OK
- Log: observed peak 17:00 @ 14.3 mph @ 273°
- Predict: peakHr=13, optDir=295°, prob=null%
- Hone: peakDrift=4h (DRIFT), dirDrift=21.984001173631498° (OK)
- Verify: suggested peak hour = 17 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 17:00 across 10 qualifying days (drift 4h)

### Starvation Reservoir (`starvation`) — Grade: **A**
- Coords: 40.1855, -110.4415
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Steinaker Reservoir (`steinaker`) — Grade: **A**
- Coords: 40.5262, -109.534
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 16:00 @ 12.2 mph @ 202°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=2.8774821229261818° (OK)

### Stockton Bar (`stockton-bar`) — Grade: **A**
- Coords: 40.44, -112.37
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 11 mph @ 6°
- Predict: peakHr=15, optDir=180°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=174.40377580604712° (DRIFT)
- Issues:
  - **LOW** [`DIRECTION_DRIFT`]: Predicted optimal 180°, observed 6° (drift 174° across 10 qualifying days)

### Strawberry Reservoir (`strawberry`) — Grade: **B**
- Coords: 40.1783, -111.1952
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 18:00 @ 12.3 mph @ 287°
- Predict: peakHr=13, optDir=300°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=13.159858845682152° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 6 qualifying days (drift 5h)

### Strawberry Bay (`strawberry-bay`) — Grade: **A**
- Coords: 40.175, -111.18
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 15:00 @ 11.3 mph @ 260°
- Predict: peakHr=13, optDir=250°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=10.277803329342873° (OK)

### Ladders (NW) (`strawberry-ladders`) — Grade: **B**
- Coords: 40.185, -111.16
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=3, lakeshore=3, thermal=OK
- Log: observed peak 18:00 @ 12.3 mph @ 287°
- Predict: peakHr=13, optDir=300°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=13.159858845682152° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 6 qualifying days (drift 5h)

### The River (`strawberry-river`) — Grade: **A**
- Coords: 40.145, -111.135
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 15:00 @ 9.7 mph @ 256°
- Predict: peakHr=13, optDir=230°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=26.476482220499406° (OK)

### Soldier Creek (`strawberry-soldier`) — Grade: **A**
- Coords: 40.12, -111.1
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=13, optDir=210°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### The View (`strawberry-view`) — Grade: **A**
- Coords: 40.165, -111.11
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 15:00 @ 14 mph @ 274°
- Predict: peakHr=13, optDir=295°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=20.550260233251834° (OK)

### Sulphur Creek Reservoir (`sulfur-creek`) — Grade: **A**
- Coords: 41.095, -110.955
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 16:00 @ 13.6 mph @ 264°
- Predict: peakHr=14, optDir=270°, prob=31%
- Hone: peakDrift=2h (OK), dirDrift=6.1565662475286445° (OK)

### Utah Lake (All) (`utah-lake`) — Grade: **A**
- Coords: 40.2369, -111.7388
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=6, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=150°, prob=12%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Lincoln Beach (`utah-lake-lincoln`) — Grade: **A**
- Coords: 40.14371515780893, -111.80194831196697
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=150°, prob=12%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Mile Marker 19 (`utah-lake-mm19`) — Grade: **B**
- Coords: 40.19869601578235, -111.88652790796455
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 16:00 @ 15.5 mph @ 140°
- Predict: peakHr=11, optDir=140°, prob=19%
- Hone: peakDrift=5h (DRIFT), dirDrift=0.07311815947190325° (OK)
- Verify: suggested peak hour = 16 (was 11)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 11:00, observed 16:00 across 4 qualifying days (drift 5h)

### Sandy Beach (`utah-lake-sandy`) — Grade: **A**
- Coords: 40.17049661378955, -111.74571902175627
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=145°, prob=12%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Vineyard (`utah-lake-vineyard`) — Grade: **A**
- Coords: 40.31765814163484, -111.76473863107265
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=12, optDir=225°, prob=12%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Zig Zag (`utah-lake-zigzag`) — Grade: **A**
- Coords: 40.30268164473557, -111.8799503518146
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=150°, prob=12%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### West Mountain (`west-mountain`) — Grade: **A**
- Coords: 40.1, -111.8
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=295°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Willard Bay (`willard-bay`) — Grade: **A**
- Coords: 41.3686, -112.0772
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=3, lakeshore=3, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=13, optDir=195°, prob=22%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Yuba Reservoir (`yuba`) — Grade: **A**
- Coords: 39.405, -111.928
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 14:00 @ 11.2 mph @ 195°
- Predict: peakHr=13, optDir=200°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=4.942721092146456° (OK)
