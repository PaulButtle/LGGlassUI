// Original LGGlassUI artwork layer. Loaded inside LG's existing screensaver.
import QtQuick 2.6

Item {
    id: frame
    property bool active: false
    property bool ready: active && photograph.status === Image.Ready
    property var photographs: []
    property int photoIndex: -1
    property int failedCount: 0
    property int intervalSeconds: 60
    property string fit: "contain"
    property string directory: "file:///media/internal/glass-home/photos/"
    property string fallbackImage: "file:///media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/assets/loch.jpg"
    clip: true

    function readJSON(file, callback) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === XMLHttpRequest.DONE) {
                try { callback(JSON.parse(request.responseText)); } catch (e) { callback(null); }
            }
        };
        request.open("GET", directory + file);
        request.send();
    }
    function refresh() {
        readJSON("screensaver.json", function(value) {
            if (!active || !value) return;
            intervalSeconds = [30, 60, 120, 300].indexOf(value.interval) >= 0 ? value.interval : 60;
            fit = value.fit === "cover" ? "cover" : "contain";
        });
        readJSON("photos.json", function(value) {
            if (!active) return;
            var list = value && value.photos instanceof Array ? value.photos : [];
            photographs = list.filter(function(p) { return p && /^[a-f0-9]{24}$/.test(p.id); }).slice(0, 100);
            if (photograph.source.toString() === "") nextPhoto();
        });
    }
    function nextPhoto() {
        if (!active) return;
        photoIndex = photographs.length ? (photoIndex + 1) % photographs.length : -1;
        photograph.source = photoIndex < 0 ? fallbackImage : directory + photographs[photoIndex].id + ".jpg";
    }
    onActiveChanged: {
        failedCount = 0;
        if (active) refresh();
        else { photograph.source = ""; photoIndex = -1; }
    }
    Rectangle { anchors.fill: parent; color: "black"; visible: frame.ready }
    Image {
        id: photograph
        width: parent.width
        height: parent.height
        sourceSize.width: 1920
        sourceSize.height: 1080
        asynchronous: true
        cache: false
        fillMode: frame.fit === "cover" ? Image.PreserveAspectCrop : Image.PreserveAspectFit
        scale: 1.04
        opacity: status === Image.Ready ? 0.55 : 0
        Behavior on opacity { NumberAnimation { duration: 900 } }
        onStatusChanged: {
            if (status === Image.Error && frame.active) {
                frame.failedCount++;
                if (frame.failedCount <= frame.photographs.length) retry.start();
            } else if (status === Image.Ready) frame.failedCount = 0;
        }
        SequentialAnimation on x {
            running: frame.active
            loops: Animation.Infinite
            NumberAnimation { from: -16; to: 16; duration: 45000; easing.type: Easing.InOutSine }
            NumberAnimation { from: 16; to: -16; duration: 45000; easing.type: Easing.InOutSine }
        }
        SequentialAnimation on y {
            running: frame.active
            loops: Animation.Infinite
            NumberAnimation { from: -10; to: 10; duration: 60000; easing.type: Easing.InOutSine }
            NumberAnimation { from: 10; to: -10; duration: 60000; easing.type: Easing.InOutSine }
        }
    }
    Timer { id: retry; interval: 500; onTriggered: frame.nextPhoto() }
    Timer { interval: frame.intervalSeconds * 1000; running: frame.active; repeat: true; onTriggered: { frame.failedCount = 0; frame.nextPhoto(); } }
    Timer { interval: 30000; running: frame.active; repeat: true; onTriggered: frame.refresh() }
}
