using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;
using Toybox.System;
using Toybox.Activity;

//! Screen 4 — Session Totals
//!
//!   ╭──────────────────────────╮
//!   │        SESSION           │
//!   │                          │
//!   │       01:23:45           │  ← timer big
//!   │                          │
//!   │   3.6 NM     496 cal    │
//!   │   ─────────────────      │
//!   │   avg 8.2 kts           │
//!   │                          │
//!   │   GPS fixes: 1154       │
//!   ╰──────────────────────────╯

class SessionView extends WatchUi.View {

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
            "SESSION", Graphics.TEXT_JUSTIFY_CENTER);

        // Timer — big center
        var timerMs = (info != null) ? info.timerTime : null;
        var timerStr = _fmtTimer(timerMs);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 14 / 100, Graphics.FONT_NUMBER_MILD,
            timerStr, Graphics.TEXT_JUSTIFY_CENTER);

        // Distance (left) + Calories (right)
        var distM = (info != null) ? info.elapsedDistance : null;
        var distNM = (distM != null) ? (distM * 0.000539957) : 0.0;
        var calories = (info != null) ? info.calories : null;
        var calStr = (calories != null) ? calories.format("%d") : "--";

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, H * 42 / 100, Graphics.FONT_XTINY,
            "DIST", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, H * 49 / 100, Graphics.FONT_MEDIUM,
            distNM.format("%.1f"), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - W * 20 / 100, H * 58 / 100, Graphics.FONT_XTINY,
            "NM", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx + W * 20 / 100, H * 42 / 100, Graphics.FONT_XTINY,
            "CAL", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx + W * 20 / 100, H * 49 / 100, Graphics.FONT_MEDIUM,
            calStr, Graphics.TEXT_JUSTIFY_CENTER);

        // Divider
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(W * 12 / 100, H * 66 / 100, W * 88 / 100, H * 66 / 100);

        // Avg speed
        var avgSpd = 0.0;
        if (distM != null && timerMs != null && timerMs > 0) {
            var distNMval = distM * 0.000539957;
            var hrs = timerMs / 3600000.0;
            if (hrs > 0) { avgSpd = distNMval / hrs; }
        }
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 69 / 100, Graphics.FONT_XTINY,
            "avg speed", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 76 / 100, Graphics.FONT_SMALL,
            avgSpd.format("%.1f") + " kts", Graphics.TEXT_JUSTIFY_CENTER);

        // GPS diagnostic
        if (app.jumpTracker != null && app.jumpTracker.logger != null) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 89 / 100, Graphics.FONT_XTINY,
                "GPS: " + app.jumpTracker.logger.gpsFixes + " fixes",
                Graphics.TEXT_JUSTIFY_CENTER);
        }
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
