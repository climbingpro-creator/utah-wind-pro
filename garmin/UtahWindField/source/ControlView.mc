using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.System;
using Toybox.Activity;
using Toybox.Position;

//! Screen 1 — Session Control
//!
//!   ╭──────────────────────────╮
//!   │      KITE SESSION        │
//!   │                          │
//!   │     [ ▶ START ]          │  ← before session
//!   │                          │
//!   │   GPS: 3D Lock  ♥ 72    │
//!   │      12:45 PM            │
//!   ╰──────────────────────────╯
//!
//!   After START:
//!   ╭──────────────────────────╮
//!   │      KITE SESSION        │
//!   │        01:23:45          │  ← running timer
//!   │                          │
//!   │   [ ⏸ PAUSE ]           │  ← or RESUME if paused
//!   │                          │
//!   │     ♥ 156   17.3 kts    │
//!   │   swipe → for speed      │
//!   ╰──────────────────────────╯

class ControlView extends WatchUi.View {

    function initialize() {
        View.initialize();
    }

    function onLayout(dc) {
    }

    function onUpdate(dc) {
        var app = Application.getApp();
        var W = dc.getWidth();
        var H = dc.getHeight();
        var cx = W / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        // Title
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 5 / 100, Graphics.FONT_SMALL,
            "KITE SESSION", Graphics.TEXT_JUSTIFY_CENTER);

        if (!app.isRecording) {
            // ── PRE-SESSION: Show START button + GPS status ──────

            // Big START prompt
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 30 / 100, Graphics.FONT_LARGE,
                "START", Graphics.TEXT_JUSTIFY_CENTER);

            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 50 / 100, Graphics.FONT_XTINY,
                "Press SELECT to begin", Graphics.TEXT_JUSTIFY_CENTER);

            // GPS status
            var gpsStr = _getGpsStatus(app);
            var gpsColor = gpsStr.equals("3D Lock") ? Graphics.COLOR_GREEN : Graphics.COLOR_YELLOW;
            dc.setColor(gpsColor, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 15 / 100, H * 65 / 100, Graphics.FONT_XTINY,
                "GPS: " + gpsStr, Graphics.TEXT_JUSTIFY_CENTER);

            // Heart rate
            var hr = _getHR();
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 20 / 100, H * 65 / 100, Graphics.FONT_XTINY,
                "\u2665 " + hr, Graphics.TEXT_JUSTIFY_CENTER);

            // Clock
            var timeStr = _getClock();
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 80 / 100, Graphics.FONT_XTINY,
                timeStr, Graphics.TEXT_JUSTIFY_CENTER);

        } else {
            // ── IN SESSION: Timer + pause/resume ─────────────────

            // Running timer (big)
            var info = Activity.getActivityInfo();
            var timerMs = (info != null) ? info.timerTime : null;
            var timerStr = _fmtTimer(timerMs);

            if (app.isPaused) {
                dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            } else {
                dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            }
            dc.drawText(cx, H * 18 / 100, Graphics.FONT_NUMBER_MILD,
                timerStr, Graphics.TEXT_JUSTIFY_CENTER);

            // Pause / Resume button
            if (app.isPaused) {
                dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, H * 42 / 100, Graphics.FONT_MEDIUM,
                    "RESUME", Graphics.TEXT_JUSTIFY_CENTER);
                dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, H * 55 / 100, Graphics.FONT_XTINY,
                    "PAUSED", Graphics.TEXT_JUSTIFY_CENTER);
            } else {
                dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, H * 42 / 100, Graphics.FONT_MEDIUM,
                    "PAUSE", Graphics.TEXT_JUSTIFY_CENTER);
            }

            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 62 / 100, Graphics.FONT_XTINY,
                "SELECT: pause/resume", Graphics.TEXT_JUSTIFY_CENTER);

            // Quick stats row
            var hr = _getHR();
            var spdKts = _getSpeedKts();
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 18 / 100, H * 76 / 100, Graphics.FONT_XTINY,
                "\u2665 " + hr, Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 18 / 100, H * 76 / 100, Graphics.FONT_XTINY,
                spdKts.format("%.1f") + " kts", Graphics.TEXT_JUSTIFY_CENTER);

            // Navigation hint
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 90 / 100, Graphics.FONT_XTINY,
                "swipe for more >>", Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    hidden function _getGpsStatus(app) {
        if (app.topoLoop != null && app.topoLoop.speedKnots > 0) {
            return "3D Lock";
        }
        var info = Activity.getActivityInfo();
        if (info != null && info.currentLocation != null) {
            return "3D Lock";
        }
        return "Searching...";
    }

    hidden function _getHR() {
        var info = Activity.getActivityInfo();
        if (info != null && info.currentHeartRate != null) {
            return info.currentHeartRate.format("%d");
        }
        return "--";
    }

    hidden function _getSpeedKts() {
        var info = Activity.getActivityInfo();
        if (info != null && info.currentSpeed != null) {
            return info.currentSpeed.toFloat() * 1.94384;
        }
        return 0.0;
    }

    hidden function _getClock() {
        var clock = System.getClockTime();
        var h12 = clock.hour % 12;
        if (h12 == 0) { h12 = 12; }
        var ampm = (clock.hour >= 12) ? "PM" : "AM";
        return h12 + ":" + clock.min.format("%02d") + " " + ampm;
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
}
