using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.System;
using Toybox.Activity;

//! Screen 2 — Speed & Heart Rate
//!
//!   ╭──────────────────────────╮
//!   │         SPEED            │
//!   │                          │
//!   │        18.3              │  ← massive, dead center
//!   │         kts              │
//!   │                          │
//!   │      ♥ 156 bpm           │
//!   │                          │
//!   │    top: 22.1 kts         │
//!   ╰──────────────────────────╯

class SpeedView extends WatchUi.View {

    function initialize() {
        View.initialize();
    }

    function onLayout(dc) {
    }

    function onUpdate(dc) {
        var W = dc.getWidth();
        var H = dc.getHeight();
        var cx = W / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var app = Application.getApp();
        var info = Activity.getActivityInfo();

        // Label
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 4 / 100, Graphics.FONT_XTINY,
            "SPEED", Graphics.TEXT_JUSTIFY_CENTER);

        // Live speed — massive
        var liveSpeedMs = (info != null) ? info.currentSpeed : null;
        var liveKnots = (liveSpeedMs != null) ? (liveSpeedMs * 1.94384) : 0.0;

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 14 / 100, Graphics.FONT_NUMBER_HOT,
            liveKnots.format("%.1f"),
            Graphics.TEXT_JUSTIFY_CENTER);

        // "kts" unit
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 48 / 100, Graphics.FONT_SMALL,
            "kts", Graphics.TEXT_JUSTIFY_CENTER);

        // Heart rate — centered, prominent
        var heartRate = (info != null) ? info.currentHeartRate : null;
        var hrStr = (heartRate != null) ? heartRate.format("%d") : "--";

        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 10 / 100, H * 62 / 100, Graphics.FONT_MEDIUM,
            "\u2665", Graphics.TEXT_JUSTIFY_RIGHT);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 6 / 100, H * 62 / 100, Graphics.FONT_MEDIUM,
            hrStr, Graphics.TEXT_JUSTIFY_LEFT);
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx + W * 20 / 100, H * 65 / 100, Graphics.FONT_XTINY,
            "bpm", Graphics.TEXT_JUSTIFY_LEFT);

        // Top speed — bottom
        var maxSpeedMs = (info != null) ? info.maxSpeed : null;
        var topKnots = (maxSpeedMs != null) ? (maxSpeedMs * 1.94384) : 0.0;

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 80 / 100, Graphics.FONT_XTINY,
            "top", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 87 / 100, Graphics.FONT_SMALL,
            topKnots.format("%.1f") + " kts", Graphics.TEXT_JUSTIFY_CENTER);
    }
}
