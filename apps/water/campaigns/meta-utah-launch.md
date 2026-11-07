# NotWindy — Meta Ads Manager kit (Utah anglers launch)

Paste this into Facebook / Instagram Ads Manager. The site funnel is already in the app.

- Destination (always): `https://notwindy.com/?utm_source=facebook&utm_medium=paid&utm_campaign=utah_anglers_launch#go`
- Instagram / Reels destination: same URL
- Offer: 14-day Pro trial, then $5.99/month, cancel anytime
- Page name: NotWindy
- Creatives in this repo: `apps/water/public/campaign/`
- Link preview image: `https://notwindy.com/og-image.png`

Before spend: add `VITE_META_PIXEL_ID` on the **notwindy / water** Vercel project, Redeploy, then confirm PageView in Events Manager.

---

## Account setup

1. Meta Business Suite — create or use a **NotWindy** Facebook Page and Instagram account.
2. Ads Manager — ad account billed to you, timezone America/Denver.
3. Events Manager — create a Pixel named NotWindy. Copy the ID into Vercel as `VITE_META_PIXEL_ID` (water project, Production + Preview). Redeploy notwindy.com.
4. Install Meta Pixel Helper. Open `https://notwindy.com/#go` — you want PageView + ViewContent.
5. Claim 14-day trial — StartTrial. Start Stripe checkout — InitiateCheckout. Finish Stripe — Purchase ($5.99 USD) on `/?subscription=success`.

---

## Campaign structure

### Campaign A — Prospecting (turn on first)

- Objective: Sales (Conversions) → Purchase. If Purchase has no data yet, optimize for InitiateCheckout for 7 days, then switch to Purchase.
- Budget: **$20/day** Advantage+ or CBO.
- Placements: Advantage+ (Facebook Feed, Instagram Feed, Stories, Reels). Do not force Audience Network.
- Age: 25–65. Gender: All.
- Location: United States → **Utah** (state). Include people living in this location.
- Detailed targeting (OR, not AND):
  - Fly fishing
  - Fishing (sport)
  - Bass fishing
  - Recreational fishing
  - Outdoor recreation
  - Camping
  - Utah Division of Wildlife Resources (if available as interest)
  - Fly shop / Orvis / Simms / Patagonia (outdoor) if the interest exists
  - Boating
  - Kayaking
- Exclude: existing purchasers (Pixel Purchase, 180 days) once that audience has size.
- Ads: all four creatives below in one ad set. Let Meta pick winners.

Optional split (same $20, two ad sets at $10 if you want control):

1. **Wasatch Front + Utah County** — cities listed under those regions below.
2. **Destination water** — Heber / Park City / Kamas, Dutch John / Manila / Vernal, Cedar City / Hurricane / St. George, Roosevelt / Duchesne.

### Campaign B — Retargeting (turn on day 2)

- Objective: Sales → Purchase.
- Budget: **$10/day**.
- Audience: Pixel PageView last 30 days, exclude Purchase last 180 days.
- Same creatives. Prefer the retargeting primary text below.
- Placements: Feed + Stories + Reels.

### Campaign C — Lookalike (later)

- Wait until Pixel has about **50 Purchase** events.
- 1% lookalike of purchasers, United States, then layer Utah only if the lookalike is large enough.
- Budget: start $15/day. Do not start this campaign on day one.

---

## Kill rules

- After **50 clicks** on an ad, kill it if cost per InitiateCheckout is above **$18**.
- After **$60** spend on an ad with zero InitiateCheckout, kill it.
- Keep the winner. Do not add new copy until a winner has 3 days of data.
- Frequency on Campaign B over 4 in 7 days: refresh creative, do not raise budget.

---

## Creatives to upload

| File | Placement | Angle |
|------|-----------|--------|
| `apps/water/public/campaign/feed-provo.png` | Feed / square | Afternoon Thermal Pull, Lower Provo |
| `apps/water/public/campaign/feed-green.png` | Feed / square | Canyon Winds, Green River A / Dutch John |
| `apps/water/public/campaign/feed-strawberry.png` | Feed / square | Pre-Frontal Bite, Strawberry |
| `apps/water/public/campaign/story-dawn.png` | Stories / Reels | Don't drive into Canyon Winds |

Website URL on every ad: `https://notwindy.com/?utm_source=facebook&utm_medium=paid&utm_campaign=utah_anglers_launch#go`

Optional `utm_content` per ad: `provo`, `green_a`, `strawberry`, `story_dawn`.

CTA button: **Learn more** on prospecting, **Subscribe** on retargeting.

---

## Ad copy — Campaign A (prospecting)

### Ad 1 — Lower Provo (use feed-provo.png)

Primary text:

```
Afternoon Thermal Pull on the Lower Provo will wipe a hatch window before you hit the canyon mouth.

NotWindy is Utah fishing intelligence — wind, glass, pressure, and when to go. Not a national weather app with a fish icon.

14-day Pro trial. Then $5.99/mo. Cancel anytime.
```

Headline: `Know the hatch window`
Description: `14-day trial · $5.99/mo`

### Ad 2 — Green A (use feed-green.png)

Primary text:

```
Canyon Winds stack in the A Section. If you are already on the road to Dutch John, it is too late to guess.

Check the glass first. NotWindy is built for Utah tailwaters and reservoirs — Green A, B, and C included.

14-day Pro trial. Then $5.99/mo.
```

Headline: `Check the glass first`
Description: `Green River · 14-day trial`

### Ad 3 — Strawberry (use feed-strawberry.png)

Primary text:

```
Pre-Frontal Bite on Strawberry is real. The window is before the wind event, not after the whitecaps.

NotWindy tells you when the reservoir lays down and when to stay home. Utah water only in the briefing — no filler.

14-day Pro trial. Then $5.99/mo.
```

Headline: `Go before the wind`
Description: `Strawberry · $5.99/mo after trial`

### Ad 4 — Story / Reel (use story-dawn.png)

Primary text (short):

```
Don't drive into Canyon Winds.

NotWindy — Utah fishing intel. 14-day Pro trial, then $5.99/mo.
```

Headline: `Don't drive into Canyon Winds`
Description: `14-day Pro trial`

Reel talking points (15–20 sec, film on your phone):

1. Open on glass water or a windshield at dawn.
2. Say: “If Canyon Winds are up, the Lower Provo is a wasted drive.”
3. Show the NotWindy map on your phone (Lower Provo or Green A).
4. Close: “14-day trial. Five ninety-nine a month. Link in bio.”

---

## Ad copy — Campaign B (retargeting)

Primary text:

```
You already opened the briefing. The 14-day Pro trial unlocks the full window — best action, flies, and when the Afternoon Thermal Pull hits.

$5.99/mo after the trial. Cancel anytime.
```

Headline: `Unlock the full window`
Description: `Finish your 14-day trial`

---

## Organic 7-day Page / Instagram calendar

Post these on the NotWindy Facebook Page and Instagram so the Page is not empty when ads start. Do not boost until Campaign A has a winning ad.

### Day 1 — Static (feed-provo.png)

Caption:

```
Afternoon Thermal Pull on the Lower Provo. If you leave SLC at noon you can miss the whole hatch window.

NotWindy is live. 14-day Pro trial → $5.99/mo.
notwindy.com
```

### Day 2 — Reel script

Talking: “Green A in a Canyon Wind is a long drive for a skunk. Check the glass before Dutch John.” Show the A Section on the map. End on notwindy.com.

### Day 3 — Static (feed-strawberry.png)

Caption:

```
Pre-Frontal Bite at Strawberry. Go before the front, not after.

14-day trial. notwindy.com
```

### Day 4 — Carousel idea (phone screenshots you take)

Three frames: Lower Provo, Green A, Willard Bay. Caption: “Same app. Different water. Utah first.”

### Day 5 — Reel script

Talking: “Willard walleye rules changed. The app should match UDWR, not last year’s card.” No fake limits in the caption — point at the water page.

### Day 6 — Static (story-dawn.png cropped square)

Caption:

```
Don't drive into Canyon Winds.

NotWindy — fishing intelligence for Utah lakes and rivers.
```

### Day 7 — Story series

Three stories: (1) glass at dawn, (2) the #go trial screen, (3) swipe-up / link sticker to `https://notwindy.com/?utm_source=instagram&utm_medium=organic&utm_campaign=utah_anglers_launch#go`

---

## Utah geo targeting (complete)

Meta location type: **City** or **Region (county)** inside Utah. Include people living in this location. Do not use “recently in” for this campaign.

### Statewide (Campaign A default)

- Country: United States
- Region: Utah

### All 29 Utah counties (use if you split by county)

Beaver, Box Elder, Cache, Carbon, Daggett, Davis, Duchesne, Emery, Garfield, Grand, Iron, Juab, Kane, Millard, Morgan, Piute, Rich, Salt Lake, San Juan, Sanpete, Sevier, Summit, Tooele, Uintah, Utah, Wasatch, Washington, Wayne, Weber

### Wasatch Front — Salt Lake County

Salt Lake City, West Valley City, West Jordan, Sandy, South Jordan, Taylorsville, Murray, Midvale, Cottonwood Heights, Holladay, Draper, Riverton, Herriman, South Salt Lake, Millcreek, Magna, Kearns, Bluffdale, White City, Copperton, Emigration Canyon, Brighton, Alta

### Wasatch Front — Davis County

Bountiful, Layton, Clearfield, Kaysville, Farmington, Centerville, North Salt Lake, Woods Cross, Syracuse, Clinton, West Point, Fruit Heights, Sunset, West Bountiful

### Wasatch Front — Weber County

Ogden, Roy, South Ogden, North Ogden, Washington Terrace, Riverdale, Pleasant View, Harrisville, Hooper, West Haven, Farr West, Plain City, Uintah, South Weber, Marriott-Slaterville, Huntsville

### Utah County (Provo / Utah Lake / Lower Provo drive market)

Provo, Orem, Lehi, Spanish Fork, Pleasant Grove, American Fork, Springville, Saratoga Springs, Eagle Mountain, Payson, Highland, Lindon, Mapleton, Salem, Santaquin, Alpine, Cedar Hills, Vineyard, Genola, Goshen, Elk Ridge, Woodland Hills, Fairfield, Cedar Fort, Benjamin, Lake Shore, Palmyra, Spring Lake, West Mountain

### Heber / Park City / Kamas (Jordanelle, Deer Creek, Strawberry drive)

Heber City, Midway, Charleston, Daniel, Independence, Wallsburg, Park City, Coalville, Kamas, Francis, Oakley, Henefer, Hideout, Morgan, Mountain Green

### Box Elder / Willard / Bear River

Brigham City, Tremonton, Garland, Willard, Perry, Honeyville, Fielding, Deweyville, Elwood, Howell, Portage, Snowville, Corinne, Bear River City, Mantua

### Cache / Bear Lake drive

Logan, North Logan, Hyde Park, Smithfield, Richmond, Hyrum, Providence, Nibley, Wellsville, Mendon, Millville, River Heights, Lewiston, Clarkston, Newton, Trenton, Amalga, Cornish, Paradise, Garden City, Randolph, Laketown, Woodruff

### Uinta Basin / Strawberry / Green headwaters

Roosevelt, Duchesne, Myton, Altamont, Tabiona, Vernal, Naples, Ballard, Fort Duchesne

### Green River / Flaming Gorge / Dutch John

Dutch John, Manila, Green River (Utah), Moab, Castle Valley, East Carbon, Helper, Price, Wellington, Scofield

### Sanpete / Sevier / Central Utah (Yuba, Fish Lake drive)

Ephraim, Manti, Mount Pleasant, Gunnison, Fairview, Moroni, Spring City, Fountain Green, Centerfield, Mayfield, Sterling, Wales, Fayette, Nephi, Mona, Levan, Eureka, Richfield, Salina, Monroe, Aurora, Elsinore, Glenwood, Joseph, Koosharem, Redmond, Sigurd, Annabella, Central Valley, Delta, Fillmore, Hinckley, Oak City, Lynndyl, Holden, Kanosh, Meadow, Scipio

### Southern Utah (Sand Hollow, Quail Creek, Lake Powell, Pine Valley)

St. George, Washington, Hurricane, Santa Clara, Ivins, La Verkin, Toquerville, Leeds, Virgin, Springdale, Rockville, Hildale, Apple Valley, New Harmony, Enterprise, Cedar City, Enoch, Parowan, Brian Head, Kanarraville, Paragonah, Kanab, Orderville, Glendale, Alton, Big Water, Panguitch, Escalante, Boulder, Tropic, Cannonville, Hatch, Antimony, Bryce Canyon City, Henrieville, Loa, Bicknell, Torrey, Lyman, Hanksville, Circleville, Junction, Kingston, Marysvale, Beaver, Milford, Minersville, Blanding, Monticello, Bluff

### Tooele / West desert

Tooele, Grantsville, Wendover, Stockton, Vernon, Rush Valley, Ophir, Dugway

---

## Tracking checklist after first live ad

1. Click your own ad from a phone that is not logged into Ads Manager (or use Preview).
2. Land on `#go` — paywall should open. Pixel Helper: PageView, ViewContent.
3. Claim trial — StartTrial.
4. Sign in and Subscribe — InitiateCheckout, then Purchase after Stripe.
5. In Command Center analytics, `campaign_view`, `start_trial`, `initiate_checkout`, and `purchase` should carry `utm_source=facebook`.

---

## What this kit does not do

I cannot turn the campaigns on inside your Meta account. You create the Pixel, paste `VITE_META_PIXEL_ID` on the water Vercel project, upload the four images, and set Campaign A to $20/day.
