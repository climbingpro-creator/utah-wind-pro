using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.System;
using Toybox.Math;

//! Post-Session Review — pushed after STOP
//!
//! Multi-page scrollable summary with GPS track overlay.
//! Shows all key metrics at a glance before you walk off the beach.
//!
//! Page 0: Stats summary
//! Page 1: GPS track with overlay stats
//!
//! SELECT = toggle between pages
//! BACK = exit app

class ReviewView extends WatchUi.View {

    hidden var _page = 0;

    // Session data (set before pushing this view)
    var durationStr = "00:00";
    var distNM      = 0.0;
    var maxKnots    = 0.0;
    var avgKnots    = 0.0;
    var calories    = 0;
    var avgHR       = 0;
    var maxHR       = 0;
    var jumpCount   = 0;
    var maxJumpFt   = 0.0;
    var avgJumpFt   = 0.0;
    var hangBest    = 0.0;
    var crashesFiltered = 0;
    var tempC       = null;
    var uploadStatus = "...";

    // GPS track data (copied from MapView)
    var trackLats;
    var trackLons;
    var trackCount = 0;

    function initialize() {
        View.initialize();
    }

    function onLayout(dc) {
    }

    function togglePage() {
        _page = (_page + 1) % 2;
        WatchUi.requestUpdate();
    }

    function onUpdate(dc) {
        var W = dc.getWidth();
        var H = dc.getHeight();
        var cx = W / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        if (_page == 0) {
            _drawStats(dc, W, H, cx);
        } else {
            _drawMap(dc, W, H, cx);
        }
    }

    hidden function _drawStats(dc, W, H, cx) {
        // Header
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 2 / 100, Graphics.FONT_SMALL,
            "SESSION COMPLETE", Graphics.TEXT_JUSTIFY_CENTER);

        var y = H * 14 / 100;
        var lineH = H * 9 / 100;

        // Duration + Distance
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, y, Graphics.FONT_MEDIUM,
            durationStr, Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx + W * 20 / 100, y, Graphics.FONT_MEDIUM,
            distNM.format("%.1f") + "nm", Graphics.TEXT_JUSTIFY_CENTER);
        y += lineH + 2;

        // Max Speed + Avg Speed
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, y, Graphics.FONT_XTINY,
            "MAX SPD", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx + W * 20 / 100, y, Graphics.FONT_XTINY,
            "AVG SPD", Graphics.TEXT_JUSTIFY_CENTER);
        y += lineH - 4;
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, y, Graphics.FONT_SMALL,
            maxKnots.format("%.1f") + " kts", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx + W * 20 / 100, y, Graphics.FONT_SMALL,
            avgKnots.format("%.1f") + " kts", Graphics.TEXT_JUSTIFY_CENTER);
        y += lineH;

        // Jumps
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, y, Graphics.FONT_SMALL,
            "JUMPS: " + jumpCount, Graphics.TEXT_JUSTIFY_CENTER);
        y += lineH - 2;

        if (jumpCount > 0) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 22 / 100, y, Graphics.FONT_XTINY,
                "MAX " + maxJumpFt.format("%.1f") + "ft",
                Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx + W * 22 / 100, y, Graphics.FONT_XTINY,
                "AVG " + avgJumpFt.format("%.1f") + "ft",
                Graphics.TEXT_JUSTIFY_CENTER);
            y += lineH - 2;
        }

        // HR + Cal
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, y, Graphics.FONT_XTINY,
            "\u2665 " + avgHR + " avg / " + maxHR + " max",
            Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx + W * 25 / 100, y, Graphics.FONT_XTINY,
            calories + " cal", Graphics.TEXT_JUSTIFY_CENTER);
        y += lineH;

        // Temperature
        if (tempC != null) {
            var tempF = tempC * 9.0 / 5.0 + 32.0;
            dc.setColor(0x00FFFF, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, y, Graphics.FONT_XTINY,
                "Temp: " + tempF.format("%.0f") + "F / " + tempC.format("%.0f") + "C",
                Graphics.TEXT_JUSTIFY_CENTER);
            y += lineH;
        }

        // Upload status
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 88 / 100, Graphics.FONT_XTINY,
            "Upload: " + uploadStatus, Graphics.TEXT_JUSTIFY_CENTER);

        // Navigation hint
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 94 / 100, Graphics.FONT_XTINY,
            "SELECT = map  |  BACK = exit", Graphics.TEXT_JUSTIFY_CENTER);
    }

    hidden function _drawMap(dc, W, H, cx) {
        // Header
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 2 / 100, Graphics.FONT_XTINY,
            "GPS TRACK", Graphics.TEXT_JUSTIFY_CENTER);

        if (trackLats == null || trackCount < 2) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H / 2, Graphics.FONT_XTINY,
                "No GPS track recorded", Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }

        // Bounding box
        var minLat = trackLats[0];
        var maxLat = trackLats[0];
        var minLon = trackLons[0];
        var maxLon = trackLons[0];
        for (var i = 1; i < trackCount; i++) {
            if (trackLats[i] < minLat) { minLat = trackLats[i]; }
            if (trackLats[i] > maxLat) { maxLat = trackLats[i]; }
            if (trackLons[i] < minLon) { minLon = trackLons[i]; }
            if (trackLons[i] > maxLon) { maxLon = trackLons[i]; }
        }

        var latRange = maxLat - minLat;
        var lonRange = maxLon - minLon;
        if (latRange < 0.0001) { latRange = 0.0001; }
        if (lonRange < 0.0001) { lonRange = 0.0001; }
        latRange *= 1.2;
        lonRange *= 1.2;
        var cLat = (minLat + maxLat) / 2.0;
        var cLon = (minLon + maxLon) / 2.0;
        minLat = cLat - latRange / 2.0;
        maxLat = cLat + latRange / 2.0;
        minLon = cLon - lonRange / 2.0;
        maxLon = cLon + lonRange / 2.0;

        var margin = W * 10 / 100;
        var drawW = W - margin * 2;
        var drawH = H - margin * 2 - H * 8 / 100;
        var drawTop = margin + H * 8 / 100;

        // Draw track
        var prevPx = 0;
        var prevPy = 0;
        for (var i = 0; i < trackCount; i++) {
            var px = margin + (((trackLons[i] - minLon) / lonRange) * drawW).toNumber();
            var py = drawTop + (((maxLat - trackLats[i]) / latRange) * drawH).toNumber();

            if (i > 0) {
                var age = trackCount - i;
                if (age > trackCount * 2 / 3) {
                    dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                } else if (age > trackCount / 3) {
                    dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
                } else {
                    dc.setColor(0x4488FF, Graphics.COLOR_TRANSPARENT);
                }
                dc.drawLine(prevPx, prevPy, px, py);
            }
            prevPx = px;
            prevPy = py;
        }

        // Start marker (green)
        var sx = margin + (((trackLons[0] - minLon) / lonRange) * drawW).toNumber();
        var sy = drawTop + (((maxLat - trackLats[0]) / latRange) * drawH).toNumber();
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(sx, sy, 4);

        // End marker (red)
        var ex = margin + (((trackLons[trackCount - 1] - minLon) / lonRange) * drawW).toNumber();
        var ey = drawTop + (((maxLat - trackLats[trackCount - 1]) / latRange) * drawH).toNumber();
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(ex, ey, 4);

        // Overlay stats
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 86 / 100, Graphics.FONT_XTINY,
            distNM.format("%.1f") + "nm  " + maxKnots.format("%.0f") + "kts  " + jumpCount + "j",
            Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 93 / 100, Graphics.FONT_XTINY,
            "SELECT = stats  |  BACK = exit", Graphics.TEXT_JUSTIFY_CENTER);
    }
}

class ReviewDelegate extends WatchUi.BehaviorDelegate {

    hidden var _view;

    function initialize(view) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onSelect() {
        if (_view != null) {
            _view.togglePage();
        }
        return true;
    }

    function onBack() {
        System.exit();
        return true;
    }
}
