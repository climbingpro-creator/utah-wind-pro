using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.System;
using Toybox.Application;

//! Quick-count screen: tap SELECT to increment the active counter.
//! Swipe up/down cycles through counters (Fish, Rides, Foil Rides).

class CounterView extends WatchUi.View {

    var fishCount = 0;
    var rideCount = 0;
    var foilRideCount = 0;

    hidden var _activeIdx = 0;
    hidden const LABELS = ["Fish Caught", "Rides", "Foil Rides"];

    function initialize() {
        View.initialize();
    }

    function onLayout(dc) {
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;

        var counts = [fishCount, rideCount, foilRideCount];
        var colors = [Graphics.COLOR_GREEN, Graphics.COLOR_BLUE, Graphics.COLOR_PURPLE];

        // Title
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 20, Graphics.FONT_XTINY, "COUNTERS", Graphics.TEXT_JUSTIFY_CENTER);

        // Active counter label
        dc.setColor(colors[_activeIdx], Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h / 2 - 40, Graphics.FONT_SMALL, LABELS[_activeIdx], Graphics.TEXT_JUSTIFY_CENTER);

        // Big count number
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h / 2 - 15, Graphics.FONT_NUMBER_HOT, counts[_activeIdx].format("%d"), Graphics.TEXT_JUSTIFY_CENTER);

        // Instruction
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h - 55, Graphics.FONT_XTINY, "TAP: +1  |  HOLD: -1", Graphics.TEXT_JUSTIFY_CENTER);

        // Counter dots
        for (var i = 0; i < 3; i++) {
            var dotX = cx - 16 + (i * 16);
            var dotY = h - 30;
            if (i == _activeIdx) {
                dc.setColor(colors[i], Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(dotX, dotY, 4);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(dotX, dotY, 3);
            }
        }
    }

    function cycleNext() {
        _activeIdx = (_activeIdx + 1) % 3;
        WatchUi.requestUpdate();
    }

    function cyclePrev() {
        _activeIdx = (_activeIdx + 2) % 3;
        WatchUi.requestUpdate();
    }

    function increment() {
        switch (_activeIdx) {
            case 0: fishCount++; break;
            case 1: rideCount++; break;
            case 2: foilRideCount++; break;
        }
        WatchUi.requestUpdate();
    }

    function decrement() {
        switch (_activeIdx) {
            case 0: if (fishCount > 0) { fishCount--; } break;
            case 1: if (rideCount > 0) { rideCount--; } break;
            case 2: if (foilRideCount > 0) { foilRideCount--; } break;
        }
        WatchUi.requestUpdate();
    }
}
