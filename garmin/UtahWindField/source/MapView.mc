using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.Activity;
using Toybox.Math;
using Toybox.System;

//! Screen 5 — Live GPS Breadcrumb Map
//!
//! Draws the rider's GPS track as a trail on a black canvas.
//! Auto-zooms to fit the track. Current position shown as a
//! bright dot with heading arrow. North is always up.
//!
//!   ╭──────────────────────────╮
//!   │  N                  MAP  │
//!   │  ↑     · · · · ·        │
//!   │       ·         ·       │
//!   │      ·    ◉→     ·      │  ← you are here
//!   │       ·         ·       │
//!   │        · · · · ·        │
//!   │                          │
//!   │  zoom: 0.3 NM            │
//!   ╰──────────────────────────╯

class MapView extends WatchUi.View {

    hidden const SAMPLE_MS  = 2000;
    hidden var _lastSampleMs = 0;

    function initialize() {
        View.initialize();
    }

    function onLayout(dc) {
    }

    function onUpdate(dc) {
        var W = dc.getWidth();
        var H = dc.getHeight();
        var cx = W / 2;
        var cy = H / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        // Label
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(W - 4, H * 3 / 100, Graphics.FONT_XTINY,
            "MAP", Graphics.TEXT_JUSTIFY_RIGHT);

        // North indicator
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(8, H * 3 / 100, Graphics.FONT_XTINY,
            "N", Graphics.TEXT_JUSTIFY_LEFT);
        dc.drawLine(12, H * 11 / 100, 12, H * 16 / 100);
        dc.drawLine(12, H * 11 / 100, 9, H * 14 / 100);
        dc.drawLine(12, H * 11 / 100, 15, H * 14 / 100);

        // Sample current position → push to app-level track
        var app = Application.getApp();
        var info = Activity.getActivityInfo();
        var curLat = null;
        var curLon = null;
        if (info != null && info.currentLocation != null) {
            var deg = info.currentLocation.toDegrees();
            curLat = deg[0].toFloat();
            curLon = deg[1].toFloat();

            var now = System.getTimer();
            if (now - _lastSampleMs >= SAMPLE_MS) {
                _lastSampleMs = now;
                app.addTrackPoint(curLat, curLon);
            }
        }

        var _count = app.trackCount;
        var _lats  = app.trackLats;
        var _lons  = app.trackLons;

        if (_count < 2) {
            // Not enough points yet
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            if (curLat != null) {
                dc.drawText(cx, cy - 10, Graphics.FONT_XTINY,
                    "GPS locked", Graphics.TEXT_JUSTIFY_CENTER);
                dc.drawText(cx, cy + 5, Graphics.FONT_XTINY,
                    "Building track...", Graphics.TEXT_JUSTIFY_CENTER);
            } else {
                dc.drawText(cx, cy, Graphics.FONT_XTINY,
                    "Waiting for GPS...", Graphics.TEXT_JUSTIFY_CENTER);
            }
            return;
        }

        // Compute bounding box
        var minLat = _lats[0];
        var maxLat = _lats[0];
        var minLon = _lons[0];
        var maxLon = _lons[0];
        for (var i = 1; i < _count; i++) {
            if (_lats[i] < minLat) { minLat = _lats[i]; }
            if (_lats[i] > maxLat) { maxLat = _lats[i]; }
            if (_lons[i] < minLon) { minLon = _lons[i]; }
            if (_lons[i] > maxLon) { maxLon = _lons[i]; }
        }

        // Add 15% padding
        var latRange = maxLat - minLat;
        var lonRange = maxLon - minLon;
        if (latRange < 0.0001) { latRange = 0.0001; }
        if (lonRange < 0.0001) { lonRange = 0.0001; }
        var padLat = latRange * 0.15;
        var padLon = lonRange * 0.15;
        minLat -= padLat;
        maxLat += padLat;
        minLon -= padLon;
        maxLon += padLon;
        latRange = maxLat - minLat;
        lonRange = maxLon - minLon;

        // Usable drawing area (inset from round edges)
        var margin = W * 12 / 100;
        var drawW = W - margin * 2;
        var drawH = H - margin * 2 - H * 10 / 100;
        var drawTop = margin + H * 10 / 100;

        // Draw breadcrumb trail
        var prevPx = 0;
        var prevPy = 0;
        for (var i = 0; i < _count; i++) {
            var px = margin + (((_lons[i] - minLon) / lonRange) * drawW).toNumber();
            var py = drawTop + (((maxLat - _lats[i]) / latRange) * drawH).toNumber();

            if (i > 0) {
                // Trail color: older = darker, newer = brighter
                var age = _count - i;
                if (age > 100) {
                    dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                } else if (age > 30) {
                    dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
                } else {
                    dc.setColor(0x4488FF, Graphics.COLOR_TRANSPARENT);
                }
                dc.drawLine(prevPx, prevPy, px, py);
            }
            prevPx = px;
            prevPy = py;
        }

        // Current position dot (bright white with green halo)
        if (curLat != null) {
            var curPx = margin + (((curLon - minLon) / lonRange) * drawW).toNumber();
            var curPy = drawTop + (((maxLat - curLat) / latRange) * drawH).toNumber();

            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(curPx, curPy, 6);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(curPx, curPy, 3);

            // Heading arrow
            var heading = 0.0;
            if (info != null && info.currentHeading != null) {
                heading = info.currentHeading.toFloat();
            }
            var arrowLen = 14;
            var ax = curPx + (Math.sin(heading) * arrowLen).toNumber();
            var ay = curPy - (Math.cos(heading) * arrowLen).toNumber();
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawLine(curPx, curPy, ax, ay);
        }

        // Zoom indicator (approximate NM across the screen)
        var midLat = (minLat + maxLat) / 2.0;
        var latNM = latRange * 60.0;
        var lonNM = lonRange * 60.0 * Math.cos(midLat * Math.PI / 180.0);
        var spanNM = (latNM > lonNM) ? latNM : lonNM;

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 91 / 100, Graphics.FONT_XTINY,
            spanNM.format("%.2f") + " NM span",
            Graphics.TEXT_JUSTIFY_CENTER);
    }

}
