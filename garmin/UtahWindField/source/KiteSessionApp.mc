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

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        // Enable GPS immediately so it can lock while rigging
        Position.enableLocationEvents(
            Position.LOCATION_CONTINUOUS,
            method(:onPosition) as Lang.Method
        );
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);

        // Topo loop for GPS position tracking (no HTTP until session starts)
        topoLoop = new TopographyLoop();

        // Jump tracker initialized but not listening until START
        jumpTracker = new JumpTracker();
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

        topoLoop.start();
        jumpTracker.startListening();
        isRecording = true;
        isPaused = false;
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

        // Get map track from the ViewLoop's MapView
        // (MapView stores track in its instance — grab via factory)
        var mapLats = null;
        var mapLons = null;
        var mapCount = 0;

        // Build review screen
        var review = new ReviewView();
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
    }

    var viewFactory = null;

    function getInitialView() {
        viewFactory = new KiteViewFactory();
        var viewLoop = new WatchUi.ViewLoop(viewFactory, {:wrap => true, :color => Graphics.COLOR_BLACK});
        var delegate = new WatchUi.ViewLoopDelegate(viewLoop);
        return [viewLoop, delegate];
    }
}
