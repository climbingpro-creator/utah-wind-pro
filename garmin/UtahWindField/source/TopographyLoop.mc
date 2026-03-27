using Toybox.Communications;
using Toybox.Position;
using Toybox.System;
using Toybox.Timer;
using Toybox.Math;
using Toybox.WatchUi;
using Toybox.Application;
using Toybox.Lang;

class TopographyLoop {

    hidden const API_URL = "https://api.utahwindfinder.com/v1/topo-warning";
    hidden const LOOP_MS = 30000;
    hidden const GPS_LOG_MS = 5000;

    hidden var _timer;
    hidden var _posInfo = null;
    hidden var _lastGpsLogMs = 0;

    var warningStatus  = "INIT";
    var warningMessage = "Acquiring GPS...";
    var speedKnots     = 0.0;
    var headingDeg     = 0.0;

    function initialize() {
        _timer = new Timer.Timer();
    }

    function start() {
        _timer.start(method(:onTick), LOOP_MS, true);
    }

    function stop() {
        _timer.stop();
    }

    function updatePosition(info) {
        _posInfo = info;

        // Log GPS fix every 5 seconds for diagnostics
        if (_posInfo != null && _posInfo.position != null) {
            var now = System.getTimer();
            if (now - _lastGpsLogMs >= GPS_LOG_MS) {
                _lastGpsLogMs = now;
                var coords = _posInfo.position.toDegrees();
                var mps = (_posInfo.speed != null) ? _posInfo.speed : 0.0;
                var spdKts = mps * 1.94384;

                var app = Application.getApp();
                if (app.jumpTracker != null && app.jumpTracker.logger != null) {
                    app.jumpTracker.logger.logGpsFix(
                        coords[0], coords[1], spdKts, now
                    );
                }
            }
        }
    }

    function onTick() {
        if (_posInfo == null || _posInfo.position == null) {
            return;
        }

        var coords = _posInfo.position.toDegrees();
        var lat = coords[0];
        var lon = coords[1];

        var mps = (_posInfo.speed != null) ? _posInfo.speed : 0.0;
        speedKnots = mps * 1.94384;

        headingDeg = 0.0;
        if (_posInfo.heading != null) {
            headingDeg = Math.toDegrees(_posInfo.heading);
            if (headingDeg < 0) {
                headingDeg += 360.0;
            }
        }

        var payload = {
            "lat"     => lat,
            "lon"     => lon,
            "speed"   => speedKnots,
            "heading" => headingDeg,
            "ts"      => System.getTimer()
        };

        var options = {
            :method       => Communications.HTTP_REQUEST_METHOD_POST,
            :headers      => {
                "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };

        Communications.makeWebRequest(
            API_URL,
            payload,
            options,
            method(:onApiResponse) as Lang.Method
        );
    }

    function onApiResponse(responseCode, data) {
        if (responseCode == 200 && data != null) {
            warningStatus  = data.hasKey("status") ? data["status"] : "OK";
            warningMessage = data.hasKey("msg")    ? data["msg"]    : "";
        } else {
            warningStatus  = "OFFLINE";
            warningMessage = "No signal (" + responseCode + ")";
        }

        WatchUi.requestUpdate();
    }
}
