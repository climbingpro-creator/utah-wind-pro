# RALPH Validation Report

Generated: 2026-05-29T13:06:16.697Z

## Summary

- Total locations: **46**
- Grades:
  - A: 32
  - B: 14
- Issues:
  - medium: 14
  - low: 2
  - info: 15

## Top Issue Codes

- `INSUFFICIENT_THERMAL_DAYS`: 15
- `PEAK_HOUR_DRIFT`: 14
- `DIRECTION_DRIFT`: 2

## Per-Location Results

### Bear Lake (`bear-lake`) — Grade: **A**
- Coords: 41.96, -111.302
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=3, thermal=OK
- Log: observed peak 15:00 @ 13.9 mph @ 292°
- Predict: peakHr=14, optDir=285°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=6.525864037904512° (OK)

### Deer Creek (`deer-creek`) — Grade: **A**
- Coords: 40.45830163741306, -111.47407868398149
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=5, thermal=OK
- Log: observed peak 14:00 @ 9.8 mph @ 214°
- Predict: peakHr=15, optDir=215°, prob=3%
- Hone: peakDrift=1h (OK), dirDrift=0.6026725624718381° (OK)

### East Canyon Reservoir (`east-canyon`) — Grade: **B**
- Coords: 40.892, -111.594
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 11.6 mph @ 221°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=4.390457388742561° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 3 qualifying days (drift 3h)

### Echo Reservoir (`echo`) — Grade: **A**
- Coords: 40.9645, -111.438
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=14, optDir=255°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Fish Lake (`fish-lake`) — Grade: **A**
- Coords: 38.5462, -111.7135
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 14:00 @ 11.6 mph @ 227°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=0h (OK), dirDrift=2.332753728081002° (OK)

### Flaming Gorge (`flaming-gorge`) — Grade: **A**
- Coords: 41.0385, -109.5725
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 12:00 @ 15.3 mph @ 168°
- Predict: peakHr=14, optDir=165°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=3.141600294813088° (OK)

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
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 2/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

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
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Lake Powell (`lake-powell`) — Grade: **B**
- Coords: 37.0173, -111.4858
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 16.4 mph @ 202°
- Predict: peakHr=14, optDir=200°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=1.9047917113136918° (OK)
- Verify: suggested peak hour = 17 (was 14)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 14:00, observed 17:00 across 6 qualifying days (drift 3h)

### Minersville Reservoir (`minersville`) — Grade: **B**
- Coords: 38.213, -112.874
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 18.1 mph @ 222°
- Predict: peakHr=14, optDir=225°, prob=null%
- Hone: peakDrift=3h (DRIFT), dirDrift=2.6474548941617684° (OK)
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

### Otter Creek Reservoir (`otter-creek`) — Grade: **A**
- Coords: 38.352, -111.987
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 16:00 @ 10.7 mph @ 199°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=5.887931278421632° (OK)

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
- Log: observed peak 16:00 @ 8.8 mph @ 277°
- Predict: peakHr=14, optDir=270°, prob=28%
- Hone: peakDrift=2h (OK), dirDrift=7.112669561864493° (OK)

### Piute Reservoir (`piute`) — Grade: **A**
- Coords: 38.328, -112.162
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 14:00 @ 13.3 mph @ 194°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=0h (OK), dirDrift=10.872345721736735° (OK)

### Point of the Mountain — North (`potm-north`) — Grade: **A**
- Coords: 40.46, -111.9
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak 17:00 @ 12.8 mph @ 344°
- Predict: peakHr=15, optDir=340°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=4.394113448376743° (OK)

### Point of the Mountain — South (`potm-south`) — Grade: **B**
- Coords: 40.445, -111.915
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak 16:00 @ 14.2 mph @ 140°
- Predict: peakHr=10, optDir=180°, prob=null%
- Hone: peakDrift=6h (DRIFT), dirDrift=39.858880853854316° (DRIFT)
- Verify: suggested peak hour = 16 (was 10)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 10:00, observed 16:00 across 7 qualifying days (drift 6h)
  - **LOW** [`DIRECTION_DRIFT`]: Predicted optimal 180°, observed 140° (drift 40° across 7 qualifying days)

### Powder Mountain (`powder-mountain`) — Grade: **A**
- Coords: 41.38, -111.78
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 15:00 @ 9.1 mph @ 233°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=7.799903030816466° (OK)

### Quail Creek Reservoir (`quail-creek`) — Grade: **B**
- Coords: 37.192, -113.378
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 15.9 mph @ 230°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=4h (DRIFT), dirDrift=5.002335948499365° (OK)
- Verify: suggested peak hour = 17 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 17:00 across 13 qualifying days (drift 4h)

### Red Fleet Reservoir (`red-fleet`) — Grade: **A**
- Coords: 40.5748, -109.4635
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 16:00 @ 12.3 mph @ 195°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=10.149903345532636° (OK)

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
- Log: observed peak 15:00 @ 13.7 mph @ 178°
- Predict: peakHr=14, optDir=190°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=11.668908442149814° (OK)

### Sand Hollow Reservoir (`sand-hollow`) — Grade: **B**
- Coords: 37.1072, -113.385
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 18:00 @ 17.3 mph @ 230°
- Predict: peakHr=13, optDir=225°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=5.445117724445993° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 7 qualifying days (drift 5h)

### Scofield Reservoir (`scofield`) — Grade: **B**
- Coords: 39.7865, -111.1518
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 18:00 @ 12.5 mph @ 298°
- Predict: peakHr=13, optDir=285°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=12.840472183561474° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 11 qualifying days (drift 5h)

### Skyline Drive (Big Drift) (`skyline-drive`) — Grade: **B**
- Coords: 39.61554, -111.30271
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=3, lakeshore=2, thermal=OK
- Log: observed peak 17:00 @ 14.4 mph @ 274°
- Predict: peakHr=13, optDir=295°, prob=null%
- Hone: peakDrift=4h (DRIFT), dirDrift=21.082034197253847° (OK)
- Verify: suggested peak hour = 17 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 17:00 across 9 qualifying days (drift 4h)

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
- Log: observed peak 16:00 @ 12.9 mph @ 199°
- Predict: peakHr=14, optDir=205°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=5.502780133692113° (OK)

### Stockton Bar (`stockton-bar`) — Grade: **A**
- Coords: 40.44, -112.37
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=1, thermal=OK
- Log: observed peak 17:00 @ 11.2 mph @ 3°
- Predict: peakHr=15, optDir=180°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=176.77736557213444° (DRIFT)
- Issues:
  - **LOW** [`DIRECTION_DRIFT`]: Predicted optimal 180°, observed 3° (drift 177° across 10 qualifying days)

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
- Log: observed peak 15:00 @ 11.4 mph @ 260°
- Predict: peakHr=13, optDir=250°, prob=null%
- Hone: peakDrift=2h (OK), dirDrift=10.46470276918376° (OK)

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

### The River (`strawberry-river`) — Grade: **B**
- Coords: 40.145, -111.135
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 18:00 @ 9.4 mph @ 239°
- Predict: peakHr=13, optDir=230°, prob=null%
- Hone: peakDrift=5h (DRIFT), dirDrift=9.028840325925643° (OK)
- Verify: suggested peak hour = 18 (was 13)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 13:00, observed 18:00 across 4 qualifying days (drift 5h)

### Soldier Creek (`strawberry-soldier`) — Grade: **A**
- Coords: 40.12, -111.1
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=13, optDir=210°, prob=null%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### The View (`strawberry-view`) — Grade: **A**
- Coords: 40.165, -111.11
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 14:00 @ 14.1 mph @ 276°
- Predict: peakHr=13, optDir=295°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=18.737766800685336° (OK)

### Sulphur Creek Reservoir (`sulfur-creek`) — Grade: **A**
- Coords: 41.095, -110.955
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak 16:00 @ 13.8 mph @ 264°
- Predict: peakHr=14, optDir=270°, prob=5%
- Hone: peakDrift=2h (OK), dirDrift=5.7841810607009165° (OK)

### Utah Lake (All) (`utah-lake`) — Grade: **B**
- Coords: 40.2369, -111.7388
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=6, thermal=OK
- Log: observed peak 17:00 @ 14.4 mph @ 144°
- Predict: peakHr=11, optDir=150°, prob=12%
- Hone: peakDrift=6h (DRIFT), dirDrift=6.002747204714979° (OK)
- Verify: suggested peak hour = 17 (was 11)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 11:00, observed 17:00 across 3 qualifying days (drift 6h)

### Lincoln Beach (`utah-lake-lincoln`) — Grade: **A**
- Coords: 40.14371515780893, -111.80194831196697
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=150°, prob=8%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Mile Marker 19 (`utah-lake-mm19`) — Grade: **B**
- Coords: 40.19869601578235, -111.88652790796455
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 17:00 @ 14.7 mph @ 140°
- Predict: peakHr=11, optDir=140°, prob=12%
- Hone: peakDrift=6h (DRIFT), dirDrift=0.25633278989187147° (OK)
- Verify: suggested peak hour = 17 (was 11)
- Issues:
  - **MEDIUM** [`PEAK_HOUR_DRIFT`]: Predicted peak 11:00, observed 17:00 across 4 qualifying days (drift 6h)

### Sandy Beach (`utah-lake-sandy`) — Grade: **A**
- Coords: 40.17049661378955, -111.74571902175627
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=145°, prob=8%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Vineyard (`utah-lake-vineyard`) — Grade: **A**
- Coords: 40.31765814163484, -111.76473863107265
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=12, optDir=225°, prob=8%
- Hone: peakDrift=nullh (DRIFT), dirDrift=null° (DRIFT)
- Issues:
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 1/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Zig Zag (`utah-lake-zigzag`) — Grade: **A**
- Coords: 40.30268164473557, -111.8799503518146
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=2, lakeshore=3, thermal=OK
- Log: observed peak null:00 @ null mph @ null°
- Predict: peakHr=11, optDir=150°, prob=8%
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
  - **INFO** [`INSUFFICIENT_THERMAL_DAYS`]: Only 0/16 days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.

### Yuba Reservoir (`yuba`) — Grade: **A**
- Coords: 39.405, -111.928
- Read: Open-Meteo OK (360h)
- Analyze: pressureHL=OK, ridge=1, lakeshore=2, thermal=OK
- Log: observed peak 14:00 @ 11.5 mph @ 193°
- Predict: peakHr=13, optDir=200°, prob=null%
- Hone: peakDrift=1h (OK), dirDrift=7.37996526131883° (OK)
