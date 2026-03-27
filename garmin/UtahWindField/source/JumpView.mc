using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Application;

//! Screen 3 — Jump Stats
//!
//!   ╭──────────────────────────╮
//!   │         JUMPS            │
//!   │                          │
//!   │           7              │  ← big jump count
//!   │                          │
//!   │   12.4 ft     1.6s      │  ← last height / hangtime
//!   │   ─────────────────      │
//!   │   MAX 18.1    AVG 10.3  │
//!   │                          │
//!   │   filtered: 3            │  ← crashes caught
//!   ╰──────────────────────────╯

class JumpView extends WatchUi.View {

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
        var jt = app.jumpTracker;

        // Label
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 4 / 100, Graphics.FONT_XTINY,
            "JUMPS", Graphics.TEXT_JUSTIFY_CENTER);

        if (jt == null) { return; }

        var count = jt.jumpCount;

        // Big jump count — center
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, H * 12 / 100, Graphics.FONT_NUMBER_HOT,
            count.format("%d"), Graphics.TEXT_JUSTIFY_CENTER);

        if (count > 0) {
            // Last jump: height (left green) + hangtime (right cyan)
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 18 / 100, H * 48 / 100, Graphics.FONT_MEDIUM,
                jt.lastHeight.format("%.1f"),
                Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 18 / 100, H * 56 / 100, Graphics.FONT_XTINY,
                "ft", Graphics.TEXT_JUSTIFY_CENTER);

            dc.setColor(0x00FFFF, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 18 / 100, H * 48 / 100, Graphics.FONT_MEDIUM,
                jt.lastHang.format("%.1f"),
                Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 18 / 100, H * 56 / 100, Graphics.FONT_XTINY,
                "sec", Graphics.TEXT_JUSTIFY_CENTER);

            // Divider
            dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
            dc.drawLine(W * 12 / 100, H * 64 / 100, W * 88 / 100, H * 64 / 100);

            // MAX + AVG row
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 18 / 100, H * 67 / 100, Graphics.FONT_SMALL,
                "MAX", Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx - W * 18 / 100, H * 75 / 100, Graphics.FONT_SMALL,
                jt.maxHeight.format("%.1f"), Graphics.TEXT_JUSTIFY_CENTER);

            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 18 / 100, H * 67 / 100, Graphics.FONT_SMALL,
                "AVG", Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx + W * 18 / 100, H * 75 / 100, Graphics.FONT_SMALL,
                jt.avgHeight().format("%.1f"), Graphics.TEXT_JUSTIFY_CENTER);
        } else {
            // No jumps yet
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 52 / 100, Graphics.FONT_XTINY,
                "Waiting for jumps...", Graphics.TEXT_JUSTIFY_CENTER);
        }

        // Crashes filtered (diagnostic, bottom)
        if (jt.crashesFiltered > 0) {
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 88 / 100, Graphics.FONT_XTINY,
                "filtered: " + jt.crashesFiltered, Graphics.TEXT_JUSTIFY_CENTER);
        }

        // Peak G diagnostic
        if (jt.logger != null && jt.logger.peakMag > 0) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, H * 94 / 100, Graphics.FONT_XTINY,
                "pk " + (jt.logger.peakMag / 1000.0).format("%.1f") + "G",
                Graphics.TEXT_JUSTIFY_CENTER);
        }
    }
}
