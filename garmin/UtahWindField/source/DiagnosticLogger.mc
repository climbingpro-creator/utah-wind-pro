using Toybox.Application;
using Toybox.System;

//! Lightweight diagnostic logger using fixed-size circular buffers
//! to prevent memory fragmentation and OOM crashes on long sessions.
//!
//! Memory budget (approximate):
//!   - _accelBuf: 100 entries × 8 bytes = 800 bytes
//!   - _stateBuf: 50 entries × 20 bytes = 1000 bytes
//!   - _gpsBuf: 120 entries × 24 bytes = 2880 bytes
//!   - Total: ~5KB (safe for most Garmin watches)

class DiagnosticLogger {

    // Fixed-size circular buffers (no dynamic allocation!)
    hidden const MAX_ACCEL  = 100;   // Reduced from 500
    hidden const MAX_STATE  = 50;    // Reduced from 100
    hidden const MAX_GPS    = 120;   // Reduced from 720
    hidden const FLUSH_MS   = 30000; // Flush every 30s (was 10s)

    // Pre-allocated circular buffers
    hidden var _accelMag;      // [MAX_ACCEL] - just magnitude
    hidden var _accelTs;       // [MAX_ACCEL] - timestamp
    hidden var _accelIdx = 0;
    hidden var _accelFull = false;

    hidden var _stateFrom;     // [MAX_STATE]
    hidden var _stateTo;       // [MAX_STATE]
    hidden var _stateMag;      // [MAX_STATE]
    hidden var _stateAlt;      // [MAX_STATE]
    hidden var _stateTs;       // [MAX_STATE]
    hidden var _stateIdx = 0;
    hidden var _stateFull = false;

    hidden var _gpsLat;        // [MAX_GPS]
    hidden var _gpsLon;        // [MAX_GPS]
    hidden var _gpsSpd;        // [MAX_GPS]
    hidden var _gpsTs;         // [MAX_GPS]
    hidden var _gpsIdx = 0;
    hidden var _gpsFull = false;

    hidden var _lastFlushMs = 0;
    hidden var _sampleCount = 0;

    // Running stats (no storage overhead)
    var peakMag   = 0;
    var minMag    = 9999;
    var accelSamples = 0;
    var stateEvents  = 0;
    var gpsFixes     = 0;

    function initialize() {
        // Pre-allocate all buffers at startup
        _accelMag = new [MAX_ACCEL];
        _accelTs  = new [MAX_ACCEL];

        _stateFrom = new [MAX_STATE];
        _stateTo   = new [MAX_STATE];
        _stateMag  = new [MAX_STATE];
        _stateAlt  = new [MAX_STATE];
        _stateTs   = new [MAX_STATE];

        _gpsLat = new [MAX_GPS];
        _gpsLon = new [MAX_GPS];
        _gpsSpd = new [MAX_GPS];
        _gpsTs  = new [MAX_GPS];

        _lastFlushMs = System.getTimer();
    }

    function logAccelSample(mag, ts) {
        accelSamples++;

        if (mag > peakMag) { peakMag = mag; }
        if (mag < minMag)  { minMag = mag; }

        // Only store every 10th sample (25Hz / 10 = 2.5Hz diagnostic rate)
        _sampleCount++;
        if (_sampleCount % 10 != 0) {
            return;
        }

        // Circular buffer write
        _accelMag[_accelIdx] = mag;
        _accelTs[_accelIdx]  = ts;
        _accelIdx++;
        if (_accelIdx >= MAX_ACCEL) {
            _accelIdx = 0;
            _accelFull = true;
        }

        // Auto-flush on interval
        if (ts - _lastFlushMs > FLUSH_MS) {
            flush();
            _lastFlushMs = ts;
        }
    }

    function logStateTransition(fromState, toState, mag, alt) {
        stateEvents++;

        _stateFrom[_stateIdx] = fromState;
        _stateTo[_stateIdx]   = toState;
        _stateMag[_stateIdx]  = mag;
        _stateAlt[_stateIdx]  = alt;
        _stateTs[_stateIdx]   = System.getTimer();
        _stateIdx++;
        if (_stateIdx >= MAX_STATE) {
            _stateIdx = 0;
            _stateFull = true;
        }
    }

    function logGpsFix(lat, lon, speedKts, ts) {
        gpsFixes++;

        _gpsLat[_gpsIdx] = lat;
        _gpsLon[_gpsIdx] = lon;
        _gpsSpd[_gpsIdx] = speedKts;
        _gpsTs[_gpsIdx]  = ts;
        _gpsIdx++;
        if (_gpsIdx >= MAX_GPS) {
            _gpsIdx = 0;
            _gpsFull = true;
        }
    }

    function flush() {
        // Only save summary stats to storage (not full buffers)
        // This dramatically reduces storage writes and memory churn
        Application.Storage.setValue("diag_stats", {
            "peakMag"  => peakMag,
            "minMag"   => minMag,
            "samples"  => accelSamples,
            "states"   => stateEvents,
            "fixes"    => gpsFixes,
            "flushTs"  => System.getTimer()
        });
    }

    function getSummary() {
        var accelCount = _accelFull ? MAX_ACCEL : _accelIdx;
        var stateCount = _stateFull ? MAX_STATE : _stateIdx;
        var gpsCount   = _gpsFull ? MAX_GPS : _gpsIdx;

        return {
            "accelBufSize" => accelCount,
            "stateBufSize" => stateCount,
            "gpsBufSize"   => gpsCount,
            "peakMag"      => peakMag,
            "minMag"       => minMag
        };
    }
}
