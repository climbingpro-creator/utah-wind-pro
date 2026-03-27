using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.System;
using Toybox.Activity;
using Toybox.Communications;
using Toybox.Timer;
using Toybox.Lang;

//! Screen 6 — Emergency Location Sender
//!
//! Press SELECT to arm, then SELECT again to confirm and send.
//! Sends GPS coordinates to the UtahWindFinder backend which
//! can alert emergency contacts via SMS/email.
//!
//! NOT a replacement for a PLB or calling 911.
//! Requires phone Bluetooth + cell signal to work.
//!
//!   ╭──────────────────────────╮
//!   │    ⚠ SEND LOCATION      │
//!   │                          │
//!   │    HOLD SELECT           │  ← idle state
//!   │    to arm alert          │
//!   │                          │
//!   │  40.302° N  111.881° W  │
//!   │  GPS: 3D Lock            │
//!   ╰──────────────────────────╯
//!
//!   After armed (3s countdown):
//!   ╭──────────────────────────╮
//!   │    🔴 SENDING IN 3...   │
//!   │                          │
//!   │    SELECT = SEND NOW     │
//!   │    BACK   = CANCEL       │
//!   ╰──────────────────────────╯

class EmergencyView extends WatchUi.View {

    hidden const API_URL = "https://api.utahwindfinder.com/v1/emergency-location";
    hidden const REPEAT_MS = 60000;   // re-send every 60s while active

    // States
    hidden const ST_IDLE     = 0;
    hidden const ST_ARMED    = 1;  // counting down
    hidden const ST_SENDING  = 2;  // actively transmitting
    hidden const ST_SENT     = 3;  // confirmation shown

    hidden var _state = 0;  // ST_IDLE
    hidden var _countdown = 3;
    hidden var _timer;
    hidden var _repeatTimer;
    hidden var _sendCount = 0;
    hidden var _lastLat = 0.0;
    hidden var _lastLon = 0.0;
    hidden var _responseMsg = "";
    hidden var _phoneWarning = false;

    function initialize() {
        View.initialize();
        _timer = new Timer.Timer();
        _repeatTimer = new Timer.Timer();
    }

    function onLayout(dc) {
    }

    function onUpdate(dc) {
        var W = dc.getWidth();
        var H = dc.getHeight();
        var cx = W / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        // Get current position
        var info = Activity.getActivityInfo();
        var hasGps = false;
        if (info != null && info.currentLocation != null) {
            var deg = info.currentLocation.toDegrees();
            _lastLat = deg[0].toFloat();
            _lastLon = deg[1].toFloat();
            hasGps = true;
        }

        if (_state == ST_IDLE) {
            _drawIdle(dc, W, H, cx, hasGps);
        } else if (_state == ST_ARMED) {
            _drawArmed(dc, W, H, cx);
        } else if (_state == ST_SENDING) {
            _drawSending(dc, W, H, cx);
        } else if (_state == ST_SENT) {
            _drawSent(dc, W, H, cx);
        }
    }

    hidden function _drawIdle(dc, W, H, cx, hasGps) {
        // Warning header
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 8 / 100, Graphics.FONT_SMALL,
            "SEND LOCATION", Graphics.TEXT_JUSTIFY_CENTER);

        // Fix 4: Phone connection warning — blocks arming
        if (_phoneWarning) {
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_RED);
            dc.fillRectangle(0, H * 25 / 100, W, H * 30 / 100);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_RED);
            dc.drawText(cx, H * 30 / 100, Graphics.FONT_SMALL,
                "NO PHONE", Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx, H * 42 / 100, Graphics.FONT_XTINY,
                "CONNECTION", Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 62 / 100, Graphics.FONT_XTINY,
                "CANNOT SEND.", Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx, H * 72 / 100, Graphics.FONT_XTINY,
                "Connect phone via BT", Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx, H * 80 / 100, Graphics.FONT_XTINY,
                "and try again.", Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 91 / 100, Graphics.FONT_XTINY,
                "Not a PLB replacement", Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }

        // Instructions
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 30 / 100, Graphics.FONT_MEDIUM,
            "HOLD SELECT", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 44 / 100, Graphics.FONT_XTINY,
            "to arm location alert", Graphics.TEXT_JUSTIFY_CENTER);

        // Current coordinates
        if (hasGps) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 60 / 100, Graphics.FONT_XTINY,
                _lastLat.format("%.3f") + " N",
                Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx, H * 68 / 100, Graphics.FONT_XTINY,
                (0.0 - _lastLon).format("%.3f") + " W",
                Graphics.TEXT_JUSTIFY_CENTER);

            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 80 / 100, Graphics.FONT_XTINY,
                "GPS: 3D Lock", Graphics.TEXT_JUSTIFY_CENTER);
        } else {
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 65 / 100, Graphics.FONT_XTINY,
                "NO GPS - Cannot send", Graphics.TEXT_JUSTIFY_CENTER);
        }

        // Disclaimer
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 91 / 100, Graphics.FONT_XTINY,
            "Not a PLB replacement", Graphics.TEXT_JUSTIFY_CENTER);
    }

    hidden function _drawArmed(dc, W, H, cx) {
        // Flashing red background strip
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_RED);
        dc.fillRectangle(0, H * 15 / 100, W, H * 20 / 100);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 8 / 100, Graphics.FONT_SMALL,
            "ARMED", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_RED);
        dc.drawText(cx, H * 19 / 100, Graphics.FONT_NUMBER_MILD,
            _countdown.format("%d"), Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 45 / 100, Graphics.FONT_XTINY,
            "SELECT = SEND NOW", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 55 / 100, Graphics.FONT_XTINY,
            "BACK = CANCEL", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 75 / 100, Graphics.FONT_XTINY,
            _lastLat.format("%.4f") + ", " + _lastLon.format("%.4f"),
            Graphics.TEXT_JUSTIFY_CENTER);
    }

    hidden function _drawSending(dc, W, H, cx) {
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 10 / 100, Graphics.FONT_SMALL,
            "SENDING...", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 35 / 100, Graphics.FONT_MEDIUM,
            "TRANSMITTING", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 55 / 100, Graphics.FONT_XTINY,
            _lastLat.format("%.5f") + ", " + _lastLon.format("%.5f"),
            Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 70 / 100, Graphics.FONT_XTINY,
            "Sent " + _sendCount + "x", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 85 / 100, Graphics.FONT_XTINY,
            "BACK = stop sending", Graphics.TEXT_JUSTIFY_CENTER);
    }

    hidden function _drawSent(dc, W, H, cx) {
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 15 / 100, Graphics.FONT_MEDIUM,
            "LOCATION SENT", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 40 / 100, Graphics.FONT_XTINY,
            _lastLat.format("%.5f") + ", " + _lastLon.format("%.5f"),
            Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 55 / 100, Graphics.FONT_XTINY,
            "Sent " + _sendCount + " times", Graphics.TEXT_JUSTIFY_CENTER);

        if (_responseMsg.length() > 0) {
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 70 / 100, Graphics.FONT_XTINY,
                _responseMsg, Graphics.TEXT_JUSTIFY_CENTER);
        }

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 85 / 100, Graphics.FONT_XTINY,
            "Re-sending every 60s", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 92 / 100, Graphics.FONT_XTINY,
            "BACK = stop", Graphics.TEXT_JUSTIFY_CENTER);
    }

    // ── Called by EmergencyDelegate ────────────────────────────────

    function armAlert() {
        if (_state != ST_IDLE) { return; }

        // Fix 4: Block arming if phone is not connected via Bluetooth
        var ds = System.getDeviceSettings();
        if (ds == null || !ds.phoneConnected) {
            _phoneWarning = true;
            WatchUi.requestUpdate();
            return;
        }

        _phoneWarning = false;
        _state = ST_ARMED;
        _countdown = 3;
        _timer.start(method(:onCountdown), 1000, true);
        WatchUi.requestUpdate();
    }

    function cancelAlert() {
        _timer.stop();
        _repeatTimer.stop();
        _state = ST_IDLE;
        _sendCount = 0;
        _responseMsg = "";
        _phoneWarning = false;
        WatchUi.requestUpdate();
    }

    function sendNow() {
        _timer.stop();
        _doSend();
    }

    function onCountdown() {
        _countdown--;
        if (_countdown <= 0) {
            _timer.stop();
            _doSend();
        }
        WatchUi.requestUpdate();
    }

    hidden function _doSend() {
        _state = ST_SENDING;
        _sendCount++;

        var payload = {
            "lat"  => _lastLat,
            "lon"  => _lastLon,
            "ts"   => System.getTimer(),
            "type" => "KITE_EMERGENCY",
            "msg"  => "Rider needs assistance"
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
            method(:onEmergencyResponse) as Lang.Method
        );

        // Start repeat timer
        _repeatTimer.start(method(:onRepeatSend), REPEAT_MS, true);

        WatchUi.requestUpdate();
    }

    function onRepeatSend() {
        _sendCount++;

        var info = Activity.getActivityInfo();
        if (info != null && info.currentLocation != null) {
            var deg = info.currentLocation.toDegrees();
            _lastLat = deg[0].toFloat();
            _lastLon = deg[1].toFloat();
        }

        var payload = {
            "lat"  => _lastLat,
            "lon"  => _lastLon,
            "ts"   => System.getTimer(),
            "type" => "KITE_EMERGENCY_UPDATE",
            "msg"  => "Still needs assistance (update " + _sendCount + ")"
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
            method(:onEmergencyResponse) as Lang.Method
        );

        WatchUi.requestUpdate();
    }

    function onEmergencyResponse(responseCode, data) {
        if (responseCode == 200) {
            _state = ST_SENT;
            if (data != null && data.hasKey("msg")) {
                _responseMsg = data["msg"];
            } else {
                _responseMsg = "Delivered";
            }
        } else {
            _responseMsg = "HTTP " + responseCode + " - retrying";
            _state = ST_SENT;
        }
        WatchUi.requestUpdate();
    }

    function getState() {
        return _state;
    }
}
