using Toybox.Application;
using Toybox.WatchUi;
using Toybox.Position;
using Toybox.Sensor;
using Toybox.System;
using Toybox.Activity;
using Toybox.ActivityRecording;
using Toybox.Lang;
using Toybox.Graphics;
using Toybox.Time;

class KiteSessionApp extends Application.AppBase {

    var jumpTracker;
    var topoLoop;
    var session = null;
    var isRecording = false;
    var isPaused    = false;
    var uploader    = null;

    // ── App-level GPS track (shared by MapView + ReviewView) ────
    // Reduced from 600 to 300 to save ~2.4KB of memory
    // At 2s sampling, 300 points = 10 minutes before simplification kicks in
    hidden const MAX_TRACK = 300;
    var trackLats;
    var trackLons;
    var trackCount = 0;

    // ── Battery throttle state ──────────────────────────────────
    hidden const THROTTLE_SPEED_KTS = 4.0;
    hidden const THROTTLE_DELAY_MS  = 15000;
    hidden var _lowSpeedSince = 0;
    hidden var _isThrottled   = false;

    // ── Crash recovery: periodic session checkpoint ───────────────
    hidden const CHECKPOINT_MS = 60000;  // Save every 60 seconds
    hidden var _lastCheckpointMs = 0;
    hidden var _sessionStartMs = 0;
    var hasCrashedSession = false;  // True if we found a recoverable session on startup

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        trackLats = new [MAX_TRACK];
        trackLons = new [MAX_TRACK];

        Position.enableLocationEvents(
            Position.LOCATION_CONTINUOUS,
            method(:onPosition) as Lang.Method
        );
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);

        topoLoop = new TopographyLoop();
        jumpTracker = new JumpTracker();
        
        // Check for crashed session data from previous run
        _checkForCrashedSession();
    }
    
    //! Check if there's recoverable session data from a crash
    hidden function _checkForCrashedSession() {
        try {
            var crashed = Application.Storage.getValue("crashed_session");
            if (crashed != null && crashed.hasKey("active") && crashed["active"] == true) {
                hasCrashedSession = true;
                System.println("[KiteSession] Found crashed session data!");
            }
        } catch (e) {
            // No crashed session
        }
    }
    
    //! Get the crashed session data for display/recovery
    function getCrashedSessionData() {
        try {
            return Application.Storage.getValue("crashed_session");
        } catch (e) {
            return null;
        }
    }
    
    //! Clear the crashed session data (after user reviews it)
    function clearCrashedSession() {
        try {
            Application.Storage.deleteValue("crashed_session");
            hasCrashedSession = false;
        } catch (e) {}
    }
    
    //! Save a checkpoint of the current session to storage
    //! This runs every 60 seconds during recording
    hidden function _saveSessionCheckpoint() {
        if (!isRecording || isPaused) { return; }
        
        var info = Activity.getActivityInfo();
        if (info == null) { return; }
        
        var timerMs    = (info.timerTime != null) ? info.timerTime : 0;
        var distM      = (info.elapsedDistance != null) ? info.elapsedDistance : 0.0;
        var maxSpeedMs = (info.maxSpeed != null) ? info.maxSpeed : 0.0;
        var cal        = (info.calories != null) ? info.calories : 0;
        var avgHR      = (info.averageHeartRate != null) ? info.averageHeartRate : 0;
        var maxHR      = (info.maxHeartRate != null) ? info.maxHeartRate : 0;
        
        var checkpoint = {
            "active"        => true,
            "timestamp"     => Time.now().value(),
            "start_time"    => _sessionStartMs,
            "timer_ms"      => timerMs,
            "distance_m"    => distM,
            "max_speed_ms"  => maxSpeedMs,
            "calories"      => cal,
            "avg_hr"        => avgHR,
            "max_hr"        => maxHR,
            "jumps"         => (jumpTracker != null) ? jumpTracker.jumpCount : 0,
            "max_jump_ft"   => (jumpTracker != null) ? jumpTracker.maxHeight : 0.0,
            "total_jump_ft" => (jumpTracker != null) ? jumpTracker.totalHeight : 0.0,
            "crashes_filtered" => (jumpTracker != null) ? jumpTracker.crashesFiltered : 0,
            "track_count"   => trackCount
        };
        
        try {
            Application.Storage.setValue("crashed_session", checkpoint);
        } catch (e) {
            // Storage full or other error - not critical
        }
    }
    
    //! Mark the session as cleanly stopped (not a crash)
    hidden function _clearSessionCheckpoint() {
        try {
            // Mark as inactive so we don't recover it
            var checkpoint = Application.Storage.getValue("crashed_session");
            if (checkpoint != null) {
                checkpoint["active"] = false;
                Application.Storage.setValue("crashed_session", checkpoint);
            }
        } catch (e) {}
    }

    function addTrackPoint(lat, lon) {
        if (trackCount >= MAX_TRACK) {
            _simplifyTrack();
        }
        trackLats[trackCount] = lat;
        trackLons[trackCount] = lon;
        trackCount++;
    }

    //! Perpendicular-distance decimation (simplified Douglas-Peucker).
    //! Computes each internal point's significance as the squared area of
    //! the triangle formed with its two neighbors. Points contributing
    //! least to the track's shape are discarded until ~half remain,
    //! preserving the full session geometry while freeing buffer space.
    hidden function _simplifyTrack() {
        if (trackCount < 6) { return; }

        var target = MAX_TRACK / 2;
        var n = trackCount;

        // Allocate significance scores — first and last are always kept
        var sig = new [n];
        sig[0]     = 1.0e12;
        sig[n - 1] = 1.0e12;

        var minSig = 1.0e12;
        var maxSig = 0.0;

        for (var i = 1; i < n - 1; i++) {
            // Signed cross product = 2x triangle area formed by (i-1, i, i+1)
            var dx1 = trackLons[i]   - trackLons[i - 1];
            var dy1 = trackLats[i]   - trackLats[i - 1];
            var dx2 = trackLons[i + 1] - trackLons[i - 1];
            var dy2 = trackLats[i + 1] - trackLats[i - 1];

            var cross = dx1 * dy2 - dy1 * dx2;
            var s = cross * cross;
            sig[i] = s;

            if (s < minSig) { minSig = s; }
            if (s > maxSig) { maxSig = s; }
        }

        // Binary search for the threshold that keeps approximately `target` points
        var lo = minSig;
        var hi = maxSig;
        var threshold = lo;

        for (var iter = 0; iter < 20; iter++) {
            var mid = (lo + hi) / 2.0;
            var kept = 0;
            for (var k = 0; k < n; k++) {
                if (sig[k] >= mid) { kept++; }
            }
            if (kept > target) {
                lo = mid;
                threshold = mid;
            } else {
                hi = mid;
            }
        }

        // Compact in-place: keep only points above the threshold
        var w = 0;
        for (var i = 0; i < n; i++) {
            if (sig[i] >= threshold) {
                if (w != i) {
                    trackLats[w] = trackLats[i];
                    trackLons[w] = trackLons[i];
                }
                w++;
            }
        }
        trackCount = w;

        // Null out freed slots so MapView can guard against stale data
        for (var i = w; i < MAX_TRACK; i++) {
            trackLats[i] = null;
            trackLons[i] = null;
        }
    }

    function startSession() {
        if (isRecording) { return; }

        if (ActivityRecording has :createSession) {
            session = ActivityRecording.createSession({
                :name    => "Kite Session",
                :sport   => Activity.SPORT_GENERIC,
                :subSport => Activity.SUB_SPORT_GENERIC
            });
            session.start();
        }

        trackCount = 0;
        _lowSpeedSince = 0;
        _isThrottled = false;
        _sessionStartMs = System.getTimer();
        _lastCheckpointMs = _sessionStartMs;

        topoLoop.start();
        jumpTracker.startListening();
        isRecording = true;
        isPaused = false;
        
        // Clear any old crashed session since we're starting fresh
        clearCrashedSession();
    }

    function pauseSession() {
        if (!isRecording || isPaused) { return; }
        if (session != null) { session.stop(); }
        isPaused = true;
    }

    function resumeSession() {
        if (!isRecording || !isPaused) { return; }
        if (session != null) { session.start(); }
        isPaused = false;
    }

    function stopSession() {
        if (!isRecording) { return; }

        jumpTracker.stopListening();
        topoLoop.stop();

        // Grab Activity info before stopping the session
        var info = Activity.getActivityInfo();
        var timerMs    = (info != null && info.timerTime != null) ? info.timerTime : 0;
        var distM      = (info != null && info.elapsedDistance != null) ? info.elapsedDistance : 0.0;
        var maxSpeedMs = (info != null && info.maxSpeed != null) ? info.maxSpeed : 0.0;
        var cal        = (info != null && info.calories != null) ? info.calories : 0;
        var avgHR      = (info != null && info.averageHeartRate != null) ? info.averageHeartRate : 0;
        var maxHR      = (info != null && info.maxHeartRate != null) ? info.maxHeartRate : 0;

        if (session != null && session.isRecording()) {
            session.stop();
        }
        if (session != null) {
            session.save();
        }

        isRecording = false;
        isPaused = false;
        
        // Mark session as cleanly stopped (not a crash)
        _clearSessionCheckpoint();

        // Build and upload session data
        _uploadAndReview(timerMs, distM, maxSpeedMs, cal, avgHR, maxHR);
    }

    hidden function _uploadAndReview(timerMs, distM, maxSpeedMs, cal, avgHR, maxHR) {
        var distNM   = distM * 0.000539957;
        var maxKnots = maxSpeedMs * 1.94384;
        var durationS = timerMs / 1000;
        var avgKnots = 0.0;
        if (timerMs > 0) {
            avgKnots = distNM / (timerMs / 3600000.0);
        }

        // Temperature
        var tempC = null;
        var si = Sensor.getInfo();
        if (si != null && si.temperature != null) {
            tempC = si.temperature.toFloat();
        }

        // Build review screen
        var review = new ReviewView();
        review.trackLats  = trackLats;
        review.trackLons  = trackLons;
        review.trackCount = trackCount;
        review.durationStr = _fmtTimer(timerMs);
        review.distNM      = distNM;
        review.maxKnots    = maxKnots;
        review.avgKnots    = avgKnots;
        review.calories    = cal;
        review.avgHR       = avgHR;
        review.maxHR       = maxHR;
        review.tempC       = tempC;

        if (jumpTracker != null) {
            review.jumpCount   = jumpTracker.jumpCount;
            review.maxJumpFt   = jumpTracker.maxHeight;
            review.avgJumpFt   = jumpTracker.avgHeight();
            review.hangBest    = jumpTracker.lastHang;
            review.crashesFiltered = jumpTracker.crashesFiltered;
        }

        // Read rider settings from Application.Storage (set via Garmin Connect Mobile)
        var riderName = null;
        var gearSetup = null;
        try {
            riderName = Application.Storage.getValue("rider_name");
        } catch (e) {}
        try {
            gearSetup = Application.Storage.getValue("gear_setup");
        } catch (e) {}

        // Grab quick counts from the counter screen
        var fishC = 0;
        var rideC = 0;
        var foilC = 0;
        if (viewFactory != null && viewFactory.counterView != null) {
            fishC = viewFactory.counterView.fishCount;
            rideC = viewFactory.counterView.rideCount;
            foilC = viewFactory.counterView.foilRideCount;
        }

        // Upload to utahwindfinder.com
        uploader = new SessionUploader();
        var payload = {
            "type"          => "kite_session",
            "duration_s"    => durationS,
            "distance_nm"   => distNM,
            "max_speed_kts" => maxKnots,
            "avg_speed_kts" => avgKnots,
            "calories"      => cal,
            "avg_hr"        => avgHR,
            "max_hr"        => maxHR,
            "jumps"         => (jumpTracker != null) ? jumpTracker.jumpCount : 0,
            "max_jump_ft"   => (jumpTracker != null) ? jumpTracker.maxHeight : 0.0,
            "avg_jump_ft"   => (jumpTracker != null) ? jumpTracker.avgHeight() : 0.0,
            "crashes_filtered" => (jumpTracker != null) ? jumpTracker.crashesFiltered : 0,
            "ride_count"    => rideC,
            "foil_ride_count" => foilC,
            "fish_count"    => fishC,
            "device"        => System.getDeviceSettings().uniqueIdentifier,
            "timestamp"     => Time.now().value()
        };
        if (tempC != null) {
            payload.put("water_temp_c", tempC);
        }
        if (riderName != null) {
            payload.put("rider_name", riderName);
        }
        if (gearSetup != null) {
            payload.put("gear_setup", gearSetup);
        }
        uploader.upload(payload);
        review.uploadStatus = "Uploading...";

        // Push the review screen (replaces the ViewLoop)
        WatchUi.switchToView(review, new ReviewDelegate(review), WatchUi.SLIDE_UP);
    }

    hidden function _fmtTimer(ms) {
        if (ms == null || ms <= 0) { return "00:00"; }
        var totalSec = (ms / 1000).toNumber();
        var hrs  = totalSec / 3600;
        var mins = (totalSec % 3600) / 60;
        var secs = totalSec % 60;
        if (hrs > 0) {
            return hrs.format("%d") + ":" + mins.format("%02d") + ":" + secs.format("%02d");
        }
        return mins.format("%02d") + ":" + secs.format("%02d");
    }

    function onStop(state) {
        Position.enableLocationEvents(Position.LOCATION_DISABLE, null);
        if (isRecording) {
            stopSession();
        }
    }

    function onPosition(info) {
        if (topoLoop != null) {
            topoLoop.updatePosition(info);
        }

        // Fix 3: Smart battery throttling — disable 25Hz accel when resting
        if (isRecording && !isPaused && jumpTracker != null && info != null && info.speed != null) {
            var speedKts = info.speed.toFloat() * 1.94384;
            if (speedKts < THROTTLE_SPEED_KTS) {
                if (_lowSpeedSince == 0) {
                    _lowSpeedSince = System.getTimer();
                } else if (!_isThrottled && (System.getTimer() - _lowSpeedSince) > THROTTLE_DELAY_MS) {
                    jumpTracker.setThrottled(true);
                    _isThrottled = true;
                }
            } else {
                _lowSpeedSince = 0;
                if (_isThrottled) {
                    jumpTracker.setThrottled(false);
                    _isThrottled = false;
                }
            }
            
            // Periodic session checkpoint for crash recovery
            var now = System.getTimer();
            if (now - _lastCheckpointMs >= CHECKPOINT_MS) {
                _lastCheckpointMs = now;
                _saveSessionCheckpoint();
            }
        }
    }

    var viewFactory = null;

    function getInitialView() {
        viewFactory = new KiteViewFactory();
        var viewLoop = new WatchUi.ViewLoop(viewFactory, {:wrap => true, :color => Graphics.COLOR_BLACK});
        var delegate = new WatchUi.ViewLoopDelegate(viewLoop);
        return [viewLoop, delegate];
    }
}
