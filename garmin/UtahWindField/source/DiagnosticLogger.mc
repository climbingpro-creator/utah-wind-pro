using Toybox.Application;
using Toybox.System;

class DiagnosticLogger {

    // In-memory buffers — flushed to Application.Storage periodically
    hidden var _accelBuf;       // rolling array of [mag, timestamp] (last 500)
    hidden var _stateBuf;       // state transitions [{ts, from, to, mag, alt}]
    hidden var _gpsBuf;         // GPS fixes [{ts, lat, lon, spd}]

    hidden const MAX_ACCEL  = 500;
    hidden const MAX_STATE  = 100;
    hidden const MAX_GPS    = 720;
    hidden const FLUSH_MS   = 10000;  // flush to storage every 10s

    hidden var _lastFlushMs = 0;
    hidden var _sampleCount = 0;

    // Running stats for accel (cheaper than storing all samples)
    var peakMag   = 0;
    var minMag    = 9999;
    var accelSamples = 0;
    var stateEvents  = 0;
    var gpsFixes     = 0;

    function initialize() {
        _accelBuf = [];
        _stateBuf = [];
        _gpsBuf   = [];
        _lastFlushMs = System.getTimer();
    }

    function logAccelSample(mag, ts) {
        accelSamples++;

        if (mag > peakMag) { peakMag = mag; }
        if (mag < minMag)  { minMag = mag; }

        // Only store every 5th sample to keep buffer manageable
        // (25Hz / 5 = 5Hz effective diagnostic rate — plenty)
        _sampleCount++;
        if (_sampleCount % 5 != 0) {
            return;
        }

        _accelBuf.add([mag, ts]);

        // Trim oldest if over limit
        while (_accelBuf.size() > MAX_ACCEL) {
            _accelBuf = _accelBuf.slice(1, null);
        }

        // Auto-flush to storage on interval
        if (ts - _lastFlushMs > FLUSH_MS) {
            flush();
            _lastFlushMs = ts;
        }
    }

    function logStateTransition(fromState, toState, mag, alt) {
        stateEvents++;
        var entry = {
            "ts"   => System.getTimer(),
            "from" => fromState,
            "to"   => toState,
            "mag"  => mag,
            "alt"  => alt
        };
        _stateBuf.add(entry);

        while (_stateBuf.size() > MAX_STATE) {
            _stateBuf = _stateBuf.slice(1, null);
        }
    }

    function logGpsFix(lat, lon, speedKts, ts) {
        gpsFixes++;
        var entry = {
            "ts"  => ts,
            "lat" => lat,
            "lon" => lon,
            "spd" => speedKts
        };
        _gpsBuf.add(entry);

        while (_gpsBuf.size() > MAX_GPS) {
            _gpsBuf = _gpsBuf.slice(1, null);
        }
    }

    function flush() {
        Application.Storage.setValue("diag_accel", _accelBuf);
        Application.Storage.setValue("diag_state", _stateBuf);
        Application.Storage.setValue("diag_gps",   _gpsBuf);
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
        return {
            "accelBufSize" => _accelBuf.size(),
            "stateBufSize" => _stateBuf.size(),
            "gpsBufSize"   => _gpsBuf.size(),
            "peakMag"      => peakMag,
            "minMag"       => minMag
        };
    }
}
