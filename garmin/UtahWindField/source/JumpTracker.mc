using Toybox.Sensor;
using Toybox.Math;
using Toybox.Activity;
using Toybox.System;
using Toybox.WatchUi;
using Toybox.Lang;

enum {
    JS_IDLE,
    JS_TAKEOFF_POP,
    JS_AIRBORNE,
    JS_COOLDOWN
}

class JumpTracker {

    // ── Tuning constants (milli-G; 1000 = 1 G) ───────────────────
    // Lowered POP_G from 2500 → 1800 to catch softer kite pops
    hidden const POP_G          = 1800;
    // Raised WEIGHTLESS_G from 400 → 650 to be more forgiving
    hidden const WEIGHTLESS_G   = 650;
    hidden const LAND_G         = 1800;
    hidden const MIN_AIR_SAMP   = 5;     // ~200ms at 25Hz
    hidden const MAX_AIR_SAMP   = 250;   // 10s safety timeout
    hidden const COOLDOWN_SAMP  = 50;    // 2s lockout (doubled to avoid crash re-triggers)
    hidden const POP_WINDOW     = 12;    // ~480ms to reach weightless (was 8)

    // ── Crash / submersion filter constants ────────────────────────
    // Max credible jump height — world record is ~35m / 115ft
    hidden const MAX_JUMP_FT    = 80.0;
    // Altitude must go UP during a jump. If peak < takeoff, it's a
    // submersion event (barometer flooded by water pressure).
    // Min height in meters to even consider recording
    hidden const MIN_HEIGHT_M   = 0.5;
    // Min GPS speed (knots) at takeoff to qualify as a jump.
    // Filters out crashes where rider is swimming / stationary.
    hidden const MIN_SPEED_KTS  = 4.0;
    // Altitude rate limiter: if baro changes more than this many
    // meters between consecutive reads, clamp it (submersion spike)
    hidden const ALT_RATE_MAX_M = 8.0;

    // ── Altitude smoothing (rolling 2-second baseline) ────────────
    hidden const ALT_BUF_SIZE   = 50;    // ~2s at 25Hz
    hidden var _altBuf;
    hidden var _altBufIdx       = 0;
    hidden var _altBufFull      = false;
    hidden var _lastRawAlt      = 0.0;
    hidden var _altInited       = false;

    // ── State machine ─────────────────────────────────────────────
    hidden var _state       = JS_IDLE;
    hidden var _counter     = 0;
    hidden var _takeoffAlt  = 0.0;
    hidden var _peakAlt     = 0.0;
    hidden var _takeoffMs   = 0;
    hidden var _takeoffSpd  = 0.0;

    // ── Session stats (read by the View) ──────────────────────────
    var jumpCount   = 0;
    var maxHeight   = 0.0;
    var lastHeight  = 0.0;
    var lastHang    = 0.0;
    var totalHeight = 0.0;

    // ── Crash counter (diagnostic) ────────────────────────────────
    var crashesFiltered = 0;

    var logger;

    function initialize() {
        logger = new DiagnosticLogger();
        _altBuf = new [ALT_BUF_SIZE];
        for (var i = 0; i < ALT_BUF_SIZE; i++) {
            _altBuf[i] = 0.0;
        }
    }

    function startListening() {
        var opts = {
            :period       => 1,
            :accelerometer => {
                :enabled    => true,
                :sampleRate => 25
            }
        };
        Sensor.registerSensorDataListener(method(:onSensorBatch) as Lang.Method, opts);
    }

    function stopListening() {
        Sensor.unregisterSensorDataListener();
        if (logger != null) {
            logger.flush();
        }
    }

    // ── Smoothed altitude read ────────────────────────────────────
    // Returns a rate-limited, smoothed altitude that rejects
    // submersion pressure spikes.
    hidden function _readSmoothedAltitude() {
        var raw = _readRawAltitude();

        // Rate limiter: clamp sudden jumps (submersion / surfacing)
        if (_altInited) {
            var delta = raw - _lastRawAlt;
            if (delta > ALT_RATE_MAX_M) {
                raw = _lastRawAlt + ALT_RATE_MAX_M;
            } else if (delta < -ALT_RATE_MAX_M) {
                raw = _lastRawAlt - ALT_RATE_MAX_M;
            }
        }
        _lastRawAlt = raw;
        _altInited = true;

        // Push into rolling buffer
        _altBuf[_altBufIdx] = raw;
        _altBufIdx++;
        if (_altBufIdx >= ALT_BUF_SIZE) {
            _altBufIdx = 0;
            _altBufFull = true;
        }

        return raw;
    }

    // Returns the 2-second rolling average altitude (pre-pop baseline)
    hidden function _getBaselineAltitude() {
        var count = _altBufFull ? ALT_BUF_SIZE : _altBufIdx;
        if (count == 0) { return _lastRawAlt; }

        var sum = 0.0;
        for (var i = 0; i < count; i++) {
            sum += _altBuf[i];
        }
        return sum / count;
    }

    hidden function _readRawAltitude() {
        var ai = Activity.getActivityInfo();
        if (ai != null && ai.altitude != null) {
            return ai.altitude.toFloat();
        }
        var si = Sensor.getInfo();
        if (si != null && si.altitude != null) {
            return si.altitude.toFloat();
        }
        return 0.0;
    }

    // ── Get current GPS speed from Activity (firmware-smoothed) ───
    hidden function _getCurrentSpeedKts() {
        var ai = Activity.getActivityInfo();
        if (ai != null && ai.currentSpeed != null) {
            return ai.currentSpeed.toFloat() * 1.94384;
        }
        return 0.0;
    }

    // ── Sensor batch callback ─────────────────────────────────────
    function onSensorBatch(sensorData) {
        var ad = sensorData.accelerometerData;
        if (ad == null) { return; }

        var xArr = ad.x;
        var yArr = ad.y;
        var zArr = ad.z;
        if (xArr == null || yArr == null || zArr == null) { return; }

        var ts = System.getTimer();
        var n = xArr.size();
        for (var i = 0; i < n; i++) {
            var x = xArr[i].toFloat();
            var y = yArr[i].toFloat();
            var z = zArr[i].toFloat();
            var mag = Math.sqrt(x * x + y * y + z * z).toNumber();

            // Feed the altitude smoother on every sample
            _readSmoothedAltitude();

            if (logger != null) {
                logger.logAccelSample(mag, ts);
            }

            _processSample(mag);
        }
    }

    // ── State machine ─────────────────────────────────────────────
    hidden function _processSample(mag) {
        var oldState = _state;

        switch (_state) {

            case JS_IDLE:
                if (mag > POP_G) {
                    // Speed gate: must be moving to consider a jump
                    var spdKts = _getCurrentSpeedKts();
                    if (spdKts < MIN_SPEED_KTS) {
                        break;
                    }

                    _state       = JS_TAKEOFF_POP;
                    _counter     = 0;
                    // Use the smoothed 2-second baseline, not a single snapshot
                    _takeoffAlt  = _getBaselineAltitude();
                    _peakAlt     = _takeoffAlt;
                    _takeoffMs   = System.getTimer();
                    _takeoffSpd  = spdKts;
                }
                break;

            case JS_TAKEOFF_POP:
                _counter++;
                if (mag < WEIGHTLESS_G) {
                    _state   = JS_AIRBORNE;
                    _counter = 1;
                } else if (_counter > POP_WINDOW) {
                    _state = JS_IDLE;
                }
                break;

            case JS_AIRBORNE:
                _counter++;

                var alt = _readSmoothedAltitude();
                if (alt > _peakAlt) {
                    _peakAlt = alt;
                }

                if (mag > LAND_G) {
                    if (_counter >= MIN_AIR_SAMP) {
                        _recordJump();
                    }
                    _state   = JS_COOLDOWN;
                    _counter = 0;
                } else if (_counter > MAX_AIR_SAMP) {
                    _state = JS_IDLE;
                }
                break;

            case JS_COOLDOWN:
                _counter++;
                if (_counter >= COOLDOWN_SAMP) {
                    _state = JS_IDLE;
                }
                break;
        }

        if (_state != oldState && logger != null) {
            logger.logStateTransition(oldState, _state, mag, _lastRawAlt);
        }
    }

    // ── Jump recording with crash filter ──────────────────────────
    hidden function _recordJump() {
        var heightM = _peakAlt - _takeoffAlt;

        // CRASH FILTER 1: Altitude must go UP during a jump.
        // If peak <= takeoff, rider went underwater (baro spike down).
        if (heightM < MIN_HEIGHT_M) {
            crashesFiltered++;
            return;
        }

        var heightFt = heightM * 3.28084;

        // CRASH FILTER 2: Max credible height cap.
        // Anything beyond 80ft is barometric noise, not a real jump.
        if (heightFt > MAX_JUMP_FT) {
            crashesFiltered++;
            return;
        }

        var hangMs  = System.getTimer() - _takeoffMs;
        var hangSec = hangMs / 1000.0;

        // CRASH FILTER 3: Hangtime sanity check.
        // A real kite jump hangs 0.5-8 seconds. Anything outside = noise.
        if (hangSec < 0.3 || hangSec > 10.0) {
            crashesFiltered++;
            return;
        }

        jumpCount++;
        lastHeight  = heightFt;
        lastHang    = hangSec;
        totalHeight += heightFt;

        if (heightFt > maxHeight) {
            maxHeight = heightFt;
        }

        WatchUi.requestUpdate();
    }

    function avgHeight() {
        return (jumpCount > 0) ? (totalHeight / jumpCount) : 0.0;
    }
}
