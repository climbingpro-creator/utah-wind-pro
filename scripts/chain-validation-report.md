# Propagation Chain Validation Report

Generated: 2026-06-01T16:07:03.374Z
Data range: 30 days
Chains validated: 23

## Summary

| Chain | Hit Rate | Signal Days | Arrived | Worst Lag Error | Status |
|-------|----------|-------------|---------|-----------------|--------|
| zigzag:se_thermal | 70% | 23/31 | 16 | 210 min | ✅ Good |
| zigzag:north_flow | 95% | 20/31 | 19 | 251 min | ✅ Good |
| lincoln:se_thermal | 33% | 15/31 | 5 | 186 min | ❌ Poor |
| lincoln:north_flow | 95% | 19/31 | 18 | 252 min | ✅ Good |
| vineyard:sw_thermal | 72% | 18/31 | 13 | 215 min | ✅ Good |
| mm19:canyon_drainage | 29% | 14/31 | 4 | 165 min | ❌ Poor |
| potm-south:se_thermal | 42% | 19/31 | 8 | 150 min | ❌ Poor |
| potm-north:north_flow | 73% | 11/31 | 8 | 330 min | ✅ Good |
| deer-creek:canyon_thermal | 60% | 25/31 | 15 | 202 min | ⚠️ Needs work |
| deer-creek:north_flow | 71% | 17/31 | 12 | 130 min | ✅ Good |
| willard-bay:south_flow | 65% | 17/31 | 11 | 66 min | ⚠️ Needs work |
| jordanelle:canyon_thermal | 76% | 21/31 | 16 | 83 min | ✅ Good |
| strawberry:ridge_flow | 100% | 26/31 | 26 | 450 min | ✅ Good |
| bear-lake:west_flow | 82% | 11/31 | 9 | 153 min | ✅ Good |
| skyline:ridge_flow | 88% | 24/31 | 21 | 330 min | ✅ Good |
| echo:i80_corridor | 86% | 21/31 | 18 | 150 min | ✅ Good |
| rockport:sw_corridor | 71% | 21/31 | 15 | 255 min | ✅ Good |
| east-canyon:weber_corridor | 61% | 23/31 | 14 | 315 min | ⚠️ Needs work |
| yuba:i15_south | 100% | 13/31 | 13 | 349 min | ✅ Good |
| sand-hollow:desert_thermal | 41% | 29/31 | 12 | 165 min | ❌ Poor |
| pineview:canyon_flow | 81% | 26/31 | 21 | 103 min | ✅ Good |
| sulfur-creek:west_flow | 87% | 23/31 | 20 | 153 min | ✅ Good |
| sulfur-creek:evanston_local | 88% | 24/31 | 21 | 68 min | ✅ Good |

## zigzag:se_thermal: SE Thermal → Zigzag
Flow: S → N

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| QSF  | 15/31 (48%) | 7.1 mph | 7.7h | -120 min | -198 min | 210 | → -198 min |
| KPVU  | 9/31 (29%) | 6.9 mph | 11.8h | -60 min | 113 min | 173 | → 113 min |
| KUTLEHI160 (opt) | 19/31 (61%) | 4.2 mph | 7.7h | -40 min | -200 min | 160 | → -200 min |
| FPS  | 8/31 (26%) | 9.4 mph | 11.1h | -30 min | 83 min | 113 | → 83 min |
| KUTSARAT62 (opt) | 22/31 (71%) | 4.1 mph | 7.9h | -10 min | -188 min | 179 | → -188 min |
| KUTSARAT88 (opt) | 22/31 (71%) | 4.1 mph | 8.1h | -5 min | -176 min | 173 | → -176 min |
| PWS  | 16/31 (52%) | 6.1 mph | 11.2h | 0 min | — min | — | — |

### Speed Ratios

| Station | Config Ratio | Actual Ratio | Samples | Recommendation |
|---------|-------------|--------------|---------|----------------|
| KUTSARAT88 | 1 | 0.75 | 16 | — |
| FPS | 1.7 | 1.46 | 8 | — |

### Recommendations
- **QSF**: Lag drift -78 min — update to -198 min
- **KPVU**: Lag drift +173 min — update to 113 min
- **KUTLEHI160**: Lag drift -160 min — update to -200 min
- **FPS**: Lag drift +113 min — update to 83 min
- **KUTSARAT62**: Lag drift -178 min — update to -188 min
- **KUTSARAT88**: Lag drift -171 min — update to -176 min

## zigzag:north_flow: North Flow → Zigzag
Flow: N → S

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 11/31 (35%) | 9.4 mph | 14.3h | -60 min | 191 min | 251 | → 191 min |
| KUTSANDY188 (opt) | 17/31 (55%) | 6.2 mph | 12.7h | -50 min | 30 min | 103 | → 30 min |
| KUTDRAPE132 (opt) | 17/31 (55%) | 6.2 mph | 12.7h | -40 min | 30 min | 100 | → 30 min |
| UTALP  | 16/31 (52%) | 9 mph | 12.2h | -30 min | 23 min | 83 | → 23 min |
| FPS  | 12/31 (39%) | 10.1 mph | 12.5h | -15 min | 85 min | 108 | → 85 min |
| PWS  | 20/31 (65%) | 8 mph | 12.7h | 0 min | — min | — | — |

### Speed Ratios

| Station | Config Ratio | Actual Ratio | Samples | Recommendation |
|---------|-------------|--------------|---------|----------------|
| FPS | 1.5 | 1.36 | 12 | — |

### Recommendations
- **KSLC**: Lag drift +251 min — update to 191 min
- **KUTSANDY188**: Lag drift +80 min — update to 30 min
- **KUTDRAPE132**: Lag drift +70 min — update to 30 min
- **UTALP**: Lag drift +53 min — update to 23 min
- **FPS**: Lag drift +100 min — update to 85 min

## lincoln:se_thermal: SE Thermal → Lincoln Beach
Flow: S → N

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| QSF  | 15/31 (48%) | 7.1 mph | 7.7h | -90 min | -96 min | 186 | — |
| KPVU  | 9/31 (29%) | 6.9 mph | 11.8h | 0 min | — min | — | — |

### Recommendations
- Low hit rate — direction thresholds or speed triggers may be too restrictive

## lincoln:north_flow: North Flow → Lincoln Beach
Flow: N → S

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 11/31 (35%) | 9.4 mph | 14.3h | -90 min | 162 min | 252 | → 162 min |
| UTALP  | 16/31 (52%) | 9 mph | 12.2h | -60 min | -12 min | 64 | → -12 min |
| FPS  | 12/31 (39%) | 10.1 mph | 12.5h | -30 min | 60 min | 95 | → 60 min |
| KPVU  | 18/31 (58%) | 8.5 mph | 13h | 0 min | — min | — | — |

### Recommendations
- **KSLC**: Lag drift +252 min — update to 162 min
- **UTALP**: Lag drift +48 min — update to -12 min
- **FPS**: Lag drift +90 min — update to 60 min

## vineyard:sw_thermal: S/SW Onshore → Vineyard
Flow: S → N

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| QSF  | 16/31 (52%) | 7.3 mph | 7.8h | -90 min | -138 min | 159 | → -138 min |
| KPVU  | 8/31 (26%) | 8 mph | 12.3h | -45 min | 170 min | 215 | → 170 min |
| FPS  | 14/31 (45%) | 8 mph | 10.4h | 0 min | — min | — | — |

### Speed Ratios

| Station | Config Ratio | Actual Ratio | Samples | Recommendation |
|---------|-------------|--------------|---------|----------------|
| FPS | 1.3 | 1 | 14 | → 1 |

### Recommendations
- **QSF**: Lag drift -48 min — update to -138 min
- **KPVU**: Lag drift +215 min — update to 170 min

## mm19:canyon_drainage: Canyon Drainage → MM19
Flow: SE → NW

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| QSF  | 14/31 (45%) | 7 mph | 7h | -30 min | -195 min | 165 | → -195 min |
| KPVU  | 9/31 (29%) | 7.4 mph | 11.6h | 0 min | — min | — | — |

### Recommendations
- Low hit rate — direction thresholds or speed triggers may be too restrictive
- **QSF**: Lag drift -165 min — update to -195 min

## potm-south:se_thermal: SE Thermal → Flight Park South
Flow: S → N

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| QSF  | 15/31 (48%) | 7.1 mph | 7.7h | -120 min | -70 min | 150 | → -70 min |
| KPVU  | 9/31 (29%) | 6.9 mph | 11.7h | -60 min | 51 min | 129 | → 51 min |
| FPS  | 8/31 (26%) | 9.5 mph | 11h | 0 min | — min | — | — |

### Recommendations
- Low hit rate — direction thresholds or speed triggers may be too restrictive
- **QSF**: Lag drift +50 min — update to -70 min
- **KPVU**: Lag drift +111 min — update to 51 min

## potm-north:north_flow: North Flow → Flight Park North
Flow: N → S

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 11/31 (35%) | 9.4 mph | 14.3h | -60 min | 270 min | 330 | → 270 min |
| UTALP  | 16/31 (52%) | 9 mph | 12.2h | 0 min | — min | — | — |

### Recommendations
- **KSLC**: Lag drift +330 min — update to 270 min

## deer-creek:canyon_thermal: Canyon Thermal → Deer Creek
Flow: Canyon → Dam

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KUTPLEAS11 (opt) | 19/31 (61%) | 4.8 mph | 9.7h | -75 min | -205 min | 178 | → -205 min |
| UTLPC  | 16/31 (52%) | 5.7 mph | 12.9h | -60 min | 23 min | 129 | → 23 min |
| UTPCY  | 20/31 (65%) | 5.3 mph | 12.1h | -45 min | -51 min | 118 | — |
| KUTCEDAR10 (opt) | 19/31 (61%) | 4.8 mph | 9.7h | -35 min | -205 min | 202 | → -205 min |
| UTCHL  | 15/31 (48%) | 5.5 mph | 12.4h | -20 min | 0 min | 20 | — |
| KUTMIDWA37 (opt) | 20/31 (65%) | 4.7 mph | 11.6h | -10 min | -108 min | 103 | → -108 min |
| UTDCD  | 15/31 (48%) | 5.5 mph | 12.4h | 0 min | — min | — | — |

### Speed Ratios

| Station | Config Ratio | Actual Ratio | Samples | Recommendation |
|---------|-------------|--------------|---------|----------------|
| UTLPC | 1.2 | 1.12 | 13 | — |
| UTPCY | 1.1 | 1.06 | 14 | — |
| UTCHL | 0.9 | 1 | 15 | — |
| KUTMIDWA37 | 0.85 | 0.83 | 15 | — |

### Recommendations
- **KUTPLEAS11**: Lag drift -130 min — update to -205 min
- **UTLPC**: Lag drift +83 min — update to 23 min
- **KUTCEDAR10**: Lag drift -170 min — update to -205 min
- **KUTMIDWA37**: Lag drift -98 min — update to -108 min

## deer-creek:north_flow: North Flow → Deer Creek
Flow: SLC → Heber → Dam

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 11/31 (35%) | 9.4 mph | 14.3h | -90 min | -40 min | 130 | → -40 min |
| KUTHEBER105 (opt) | 12/31 (39%) | 5.5 mph | 14.7h | -45 min | 0 min | 45 | → 0 min |
| KHCR  | 10/31 (32%) | 6.2 mph | 14.4h | -30 min | 24 min | 54 | → 24 min |
| UTDCD  | 12/31 (39%) | 5.5 mph | 14.7h | 0 min | — min | — | — |

### Recommendations
- **KSLC**: Lag drift +50 min — update to -40 min
- **KUTHEBER105**: Lag drift +45 min — update to 0 min
- **KHCR**: Lag drift +54 min — update to 24 min

## willard-bay:south_flow: South Flow → Willard Bay
Flow: S → N

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 15/31 (48%) | 9.4 mph | 10.3h | -90 min | -120 min | 66 | — |
| KHIF  | 14/31 (45%) | 6.9 mph | 11.2h | -60 min | -55 min | 60 | — |
| KOGD  | 10/31 (32%) | 7.5 mph | 11.3h | -30 min | 0 min | 66 | — |
| UR328  | 14/31 (45%) | 8 mph | 12.9h | 0 min | — min | — | — |

## jordanelle:canyon_thermal: Canyon Thermal → Jordanelle
Flow: Canyon → Valley

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| UTLPC  | 16/31 (52%) | 5.7 mph | 12.9h | -60 min | -5 min | 83 | → -5 min |
| UTCHL  | 19/31 (61%) | 5.3 mph | 12.4h | -30 min | -52 min | 60 | — |
| KHCR  | 16/31 (52%) | 6.3 mph | 13h | 0 min | — min | — | — |

### Recommendations
- **UTLPC**: Lag drift +55 min — update to -5 min

## strawberry:ridge_flow: Ridge Flow → Strawberry
Flow: W → E

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 6/31 (19%) | 7.4 mph | 14.8h | -120 min | 120 min | 260 | → 120 min |
| KPVU  | 1/31 (3%) | 11.3 mph | 16h | -90 min | 360 min | 450 | — |
| CCPUT  | 24/31 (77%) | 7.1 mph | 11.2h | -45 min | 5 min | 105 | → 5 min |
| UTCOP  | 28/31 (90%) | 6.8 mph | 11.6h | 0 min | — min | — | — |

### Recommendations
- **KSLC**: Lag drift +240 min — update to 120 min
- **CCPUT**: Lag drift +50 min — update to 5 min

## bear-lake:west_flow: West Wind → Bear Lake
Flow: W → E

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KLGU  | 11/31 (35%) | 6.2 mph | 13.1h | -60 min | 80 min | 153 | → 80 min |
| BERU1  | 18/31 (58%) | 9.5 mph | 13.4h | 0 min | — min | — | — |

### Recommendations
- **KLGU**: Lag drift +140 min — update to 80 min

## skyline:ridge_flow: Ridge Flow → Skyline
Flow: W → E

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 3/31 (10%) | 9.6 mph | 15h | -120 min | 210 min | 330 | — |
| UTESU  | 23/31 (74%) | 9 mph | 10.8h | -30 min | -69 min | 50 | → -69 min |
| SKY  | 21/31 (68%) | 10.8 mph | 11.4h | 0 min | — min | — | — |

### Recommendations
- **UTESU**: Lag drift -39 min — update to -69 min

## echo:i80_corridor: I-80 Corridor → Echo Reservoir
Flow: W → E (I-80)

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 3/31 (10%) | 9.6 mph | 15h | -90 min | -30 min | 150 | — |
| UTALP  | 2/31 (6%) | 6.3 mph | 10.5h | -75 min | -120 min | 45 | — |
| KUTPARKCITY4 (opt) | 15/31 (48%) | 6.3 mph | 13.3h | -45 min | 73 min | 131 | → 73 min |
| KUTWANSH1 (opt) | 16/31 (52%) | 6 mph | 12.3h | -20 min | -28 min | 85 | — |
| KUTCOALV2  | 19/31 (61%) | 6.7 mph | 12.6h | 0 min | — min | — | — |

### Recommendations
- **KUTPARKCITY4**: Lag drift +118 min — update to 73 min

## rockport:sw_corridor: SW Corridor → Rockport
Flow: SW → NE

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 1/31 (3%) | 13.8 mph | 18h | -75 min | 180 min | 255 | — |
| KUTPARKCITY4 (opt) | 13/31 (42%) | 6.1 mph | 13.4h | -45 min | 72 min | 135 | → 72 min |
| KUTWANSH1 (opt) | 18/31 (58%) | 5 mph | 11.7h | -20 min | -23 min | 129 | — |
| KUTCOALV2  | 18/31 (58%) | 6.8 mph | 12.8h | 0 min | — min | — | — |

### Recommendations
- **KUTPARKCITY4**: Lag drift +117 min — update to 72 min

## east-canyon:weber_corridor: Weber Canyon → East Canyon
Flow: SW → NE

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 1/31 (3%) | 13.8 mph | 18h | -75 min | 240 min | 315 | — |
| KUTHENEF1 (opt) | 23/31 (74%) | 5.3 mph | 12.2h | -30 min | -73 min | 129 | → -73 min |
| KUTMORGA4  | 17/31 (55%) | 6.4 mph | 13.8h | 0 min | — min | — | — |

### Recommendations
- **KUTHENEF1**: Lag drift -43 min — update to -73 min

## yuba:i15_south: I-15 South → Yuba
Flow: S → N (I-15)

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KPVU  | 5/31 (16%) | 10.3 mph | 13.2h | -90 min | 180 min | 270 | → 180 min |
| QSF  | 7/31 (23%) | 8.8 mph | 14.7h | -75 min | 274 min | 349 | → 274 min |
| UTRKY  | 13/31 (42%) | 6.9 mph | 11h | -30 min | 69 min | 99 | → 69 min |
| UTLMP  | 15/31 (48%) | 6.9 mph | 10h | 0 min | — min | — | — |

### Recommendations
- **KPVU**: Lag drift +270 min — update to 180 min
- **QSF**: Lag drift +349 min — update to 274 min
- **UTRKY**: Lag drift +99 min — update to 69 min

## sand-hollow:desert_thermal: Desert Thermal → Sand Hollow
Flow: SW → NE

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KCDC  | 19/31 (61%) | 9.5 mph | 12.3h | -75 min | -93 min | 165 | — |
| KUTHURRIC3 (opt) | 29/31 (94%) | 7.3 mph | 12.4h | -30 min | -175 min | 165 | → -175 min |
| KSGU  | 13/31 (42%) | 8.5 mph | 13.5h | 0 min | — min | — | — |

### Recommendations
- Low hit rate — direction thresholds or speed triggers may be too restrictive
- **KUTHURRIC3**: Lag drift -145 min — update to -175 min

## pineview:canyon_flow: Ogden Canyon → Pineview
Flow: W → E

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KOGD  | 22/31 (71%) | 6.9 mph | 13.6h | -60 min | -10 min | 103 | → -10 min |
| UTHUN  | 25/31 (81%) | 5.7 mph | 13.4h | -20 min | -34 min | 56 | — |
| UTPVD  | 21/31 (68%) | 6.8 mph | 13.6h | 0 min | — min | — | — |

### Recommendations
- **KOGD**: Lag drift +50 min — update to -10 min

## sulfur-creek:west_flow: West Jet Stream → Sulphur Creek
Flow: W → E (I-80 corridor)

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KSLC  | 4/31 (13%) | 9 mph | 14h | -90 min | 0 min | 90 | — |
| UT1  | 18/31 (58%) | 11.5 mph | 13.2h | -30 min | 120 min | 153 | → 120 min |
| KEVW  | 21/31 (68%) | 10.6 mph | 13.3h | -15 min | 78 min | 116 | → 78 min |
| KFIR  | 22/31 (71%) | 11.2 mph | 12h | 0 min | — min | — | — |

### Speed Ratios

| Station | Config Ratio | Actual Ratio | Samples | Recommendation |
|---------|-------------|--------------|---------|----------------|
| UT1 | 1.1 | 1.05 | 18 | — |
| KEVW | 0.85 | 0.98 | 20 | — |

### Recommendations
- **UT1**: Lag drift +150 min — update to 120 min
- **KEVW**: Lag drift +93 min — update to 78 min

## sulfur-creek:evanston_local: Evanston Local → Sulphur Creek
Flow: N → S (Evanston corridor)

### Station Performance

| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |
|---------|-------|-----------|-----------|------------|------------|-----|----------------|
| KEVW  | 24/31 (77%) | 9.4 mph | 12.3h | -20 min | 29 min | 68 | → 29 min |
| KFIR  | 23/31 (74%) | 10.5 mph | 11.2h | 0 min | — min | — | — |

### Recommendations
- **KEVW**: Lag drift +49 min — update to 29 min

## Global Recommendations

- **Well-calibrated chains (≥70% hit rate):** 16
- **Chains needing work (<50% hit rate):** 4
- **Chains with lag drift (>30 min MAE):** 21

### Poor chains to investigate:
- **lincoln:se_thermal** — 33% hit rate (5/15 signal days)
- **mm19:canyon_drainage** — 29% hit rate (4/14 signal days)
- **potm-south:se_thermal** — 42% hit rate (8/19 signal days)
- **sand-hollow:desert_thermal** — 41% hit rate (12/29 signal days)