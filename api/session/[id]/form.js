/**
 * GET /session/:id/edit
 *
 * Server-rendered post-session form for uploading photos, logging
 * fish catches, editing rider info, and ride counts.
 */
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  const { id: sessionId } = req.query;
  if (!sessionId || sessionId.length < 10)
    return res.status(400).send('Invalid session ID');

  try {
    const supabase = getSupabase();
    const { data: session } = await supabase
      .from('kite_sessions').select('id, rider_name, gear_setup, activity_type, ride_count, foil_ride_count, spot_id')
      .eq('id', sessionId).single();

    if (!session) return res.status(404).send(errorPage('Session not found'));

    const activity = session.activity_type || 'kiting';
    const isFishing = activity === 'fishing';
    const isWindsurf = activity === 'windsurfing';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(renderForm(session, activity, isFishing, isWindsurf));
  } catch (err) {
    console.error('[form]', err.message);
    return res.status(500).send('Server error');
  }
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function errorPage(msg) {
  return `<!DOCTYPE html><html><head><title>Error</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#ef4444}a{color:#3b82f6}</style></head>
<body><div class="box"><h1>${msg}</h1><a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

function renderForm(session, activity, isFishing, isWindsurf) {
  const LABELS = {kiting:'Kite',snowkiting:'Snowkite',windsurfing:'Windsurf',sailing:'Sail',boating:'Boat',paddling:'Paddle',paragliding:'Paragliding',fishing:'Fishing'};
  const label = LABELS[activity] || 'Session';

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Edit ${esc(label)} Session | UtahWindFinder</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#050510;color:#e5e5e5;line-height:1.5;min-height:100vh}
    .hero{text-align:center;padding:2rem 1rem;background:linear-gradient(135deg,#0f172a,#1e1b4b);border-bottom:2px solid rgba(56,189,248,0.2)}
    .hero h1{font-size:1.6rem;font-weight:900;color:#f1f5f9}.hero p{font-size:0.8rem;color:#64748b;margin-top:0.3rem}
    .wrap{max-width:600px;margin:0 auto;padding:1.5rem 1rem 3rem}
    .section{margin-bottom:2rem}
    .section-title{font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
    .section-title::after{content:'';flex:1;height:1px;background:rgba(148,163,184,0.2)}
    label{display:block;font-size:0.7rem;font-weight:700;color:#94a3b8;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.05em}
    input[type=text],input[type=number]{width:100%;padding:0.6rem 0.8rem;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:#111827;color:#f1f5f9;font-size:0.85rem;font-family:inherit;outline:none;transition:border-color 0.2s}
    input:focus{border-color:#38bdf8}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:0.8rem}
    .field{margin-bottom:0.8rem}
    .drop{border:2px dashed rgba(255,255,255,0.1);border-radius:14px;padding:2rem;text-align:center;cursor:pointer;transition:border-color 0.2s;position:relative}
    .drop:hover,.drop.over{border-color:#38bdf8}
    .drop p{font-size:0.8rem;color:#64748b}.drop .ico{font-size:2rem;margin-bottom:0.5rem;opacity:0.3}
    .drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
    .previews{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.8rem}
    .preview{width:80px;height:80px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.1)}
    .btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.7rem 1.5rem;border-radius:12px;font-size:0.8rem;font-weight:800;border:none;cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.05em}
    .btn:hover{transform:scale(1.03);filter:brightness(1.1)}
    .btn-primary{background:linear-gradient(135deg,#0c4a6e,#0ea5e9);color:#fff}
    .btn-green{background:linear-gradient(135deg,#065f46,#10b981);color:#fff}
    .btn-amber{background:linear-gradient(135deg,#854d0e,#eab308);color:#000}
    .btn-sm{padding:0.5rem 1rem;font-size:0.7rem}
    .catch-item{background:#111827;border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:1rem;margin-bottom:0.8rem}
    .catch-item .row{margin-bottom:0.5rem}
    .status{font-size:0.75rem;font-weight:600;padding:0.5rem 0;display:none}
    .status.ok{color:#22c55e;display:block}.status.err{color:#ef4444;display:block}
    .back{display:inline-block;color:#38bdf8;font-size:0.75rem;font-weight:600;text-decoration:none;margin-top:1rem}
    .back:hover{text-decoration:underline}
  </style>
</head><body>
<div class="hero">
  <h1>Edit ${esc(label)} Session</h1>
  <p>Add photos, update info, and log details</p>
</div>
<div class="wrap">

  <div class="section">
    <div class="section-title">Rider Info</div>
    <div class="row">
      <div class="field"><label>Rider Name</label><input type="text" id="rider_name" value="${esc(session.rider_name||'')}"/></div>
      <div class="field"><label>Gear Setup</label><input type="text" id="gear_setup" value="${esc(session.gear_setup||'')}"/></div>
    </div>
    ${isWindsurf ? `<div class="row">
      <div class="field"><label>Ride Count</label><input type="number" id="ride_count" value="${session.ride_count||0}" min="0"/></div>
      <div class="field"><label>Foil Ride Count</label><input type="number" id="foil_ride_count" value="${session.foil_ride_count||0}" min="0"/></div>
    </div>` : ''}
    <button class="btn btn-primary btn-sm" onclick="saveInfo()">Save Info</button>
    <div id="info-status" class="status"></div>
  </div>

  <div class="section">
    <div class="section-title">Photos</div>
    <div class="drop" id="drop-zone" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="handleDrop(event)">
      <div class="ico">&#128247;</div>
      <p>Drag &amp; drop photos or tap to select</p>
      <input type="file" accept="image/*" multiple onchange="handleFiles(this.files)"/>
    </div>
    <div class="previews" id="previews"></div>
    <div style="margin-top:0.8rem">
      <div class="field"><label>Caption (optional)</label><input type="text" id="photo_caption" placeholder="Describe the moment..."/></div>
      <button class="btn btn-primary btn-sm" onclick="uploadPhotos()">Upload Photos</button>
    </div>
    <div id="photo-status" class="status"></div>
  </div>

  ${isFishing ? `<div class="section">
    <div class="section-title">Log Catches</div>
    <div id="catches"></div>
    <button class="btn btn-green btn-sm" onclick="addCatch()" style="margin-bottom:0.8rem">+ Add Catch</button>
    <button class="btn btn-amber btn-sm" onclick="submitCatches()">Save All Catches</button>
    <div id="catch-status" class="status"></div>
  </div>` : ''}

  <a class="back" href="/session/${session.id}">&larr; Back to Session Review</a>
</div>

<script>
var SID = '${session.id}';
var pendingFiles = [];

function handleDrop(e) {
  e.preventDefault(); e.currentTarget.classList.remove('over');
  handleFiles(e.dataTransfer.files);
}

function handleFiles(files) {
  Array.from(files).forEach(function(f) {
    if (!f.type.startsWith('image/')) return;
    pendingFiles.push(f);
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = document.createElement('img');
      img.src = ev.target.result; img.className = 'preview';
      document.getElementById('previews').appendChild(img);
    };
    reader.readAsDataURL(f);
  });
}

function saveInfo() {
  var body = { rider_name: document.getElementById('rider_name').value, gear_setup: document.getElementById('gear_setup').value };
  var rc = document.getElementById('ride_count');
  var fc = document.getElementById('foil_ride_count');
  if (rc) body.ride_count = parseInt(rc.value) || 0;
  if (fc) body.foil_ride_count = parseInt(fc.value) || 0;
  fetch('/api/session/' + SID + '/edit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    .then(function(r){ return r.json() })
    .then(function(d) {
      var el = document.getElementById('info-status');
      if (d.success) { el.className = 'status ok'; el.textContent = 'Saved!'; }
      else { el.className = 'status err'; el.textContent = d.error || 'Error'; }
    });
}

function uploadPhotos() {
  if (pendingFiles.length === 0) return;
  var cap = document.getElementById('photo_caption').value;
  var st = document.getElementById('photo-status');
  st.className = 'status ok'; st.textContent = 'Uploading ' + pendingFiles.length + ' photos...';
  var done = 0;
  pendingFiles.forEach(function(f) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      fetch('/api/session/' + SID + '/photo', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: ev.target.result, caption: cap })
      }).then(function(r){ return r.json() }).then(function() {
        done++;
        if (done >= pendingFiles.length) {
          st.textContent = done + ' photos uploaded!';
          pendingFiles = [];
        }
      });
    };
    reader.readAsDataURL(f);
  });
}

${isFishing ? `
var catchCount = 0;
function addCatch() {
  var idx = catchCount++;
  var div = document.createElement('div'); div.className = 'catch-item'; div.id = 'catch-' + idx;
  div.innerHTML = '<div class="row"><div class="field"><label>Species</label><input type="text" id="sp-'+idx+'"/></div><div class="field"><label>Weight (lbs)</label><input type="number" id="wt-'+idx+'" step="0.1" min="0"/></div></div><div class="row"><div class="field"><label>Length (in)</label><input type="number" id="ln-'+idx+'" step="0.1" min="0"/></div><div class="field"><label>Photo</label><div style="position:relative"><input type="file" accept="image/*" onchange="catchPhoto('+idx+',this.files[0])" style="font-size:0.75rem;color:#94a3b8"/></div></div></div>';
  document.getElementById('catches').appendChild(div);
}

var catchPhotos = {};
function catchPhoto(idx, file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) { catchPhotos[idx] = ev.target.result; };
  reader.readAsDataURL(file);
}

function submitCatches() {
  var st = document.getElementById('catch-status');
  if (catchCount === 0) { st.className='status err'; st.textContent='Add at least one catch first'; return; }
  st.className='status ok'; st.textContent='Saving catches...';
  var done=0;
  for(var i=0;i<catchCount;i++){
    var body = {
      species: document.getElementById('sp-'+i).value,
      weight_lbs: parseFloat(document.getElementById('wt-'+i).value)||null,
      length_in: parseFloat(document.getElementById('ln-'+i).value)||null,
    };
    if(catchPhotos[i]) body.image = catchPhotos[i];
    fetch('/api/session/'+SID+'/catch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json()}).then(function(){done++;if(done>=catchCount){st.textContent=done+' catches saved!'}});
  }
}
addCatch();
` : ''}
</script>
</body></html>`;
}
