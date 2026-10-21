'use strict';
// LG source is read and transformed on the owner's TV, never redistributed.
function insert(source){
 if(source.indexOf('glassFrameOverlay')>=0||source.split('UIController {').length!==2||source.indexOf('id: rootWindow')<0||source.indexOf('id: uiController')<0)throw Error('Unsupported LG screensaver layout.');
 var loader='\n    // LGGlassUI photo layer. LG retains idle, input, PIG and window lifecycle.\n    Loader {\n        id: glassFrameOverlay\n        anchors.fill: parent\n        z: 9999\n        source: "file:///media/internal/glass-home/integration/FramePhotographs.qml"\n        visible: rootWindow.visible && !!uiController.mainView && uiController.mainView.state === "Mode_ScreenSaver"\n        onVisibleChanged: if (item) item.active = visible\n        onLoaded: item.active = visible\n    }\n';
 return source.replace('UIController {','UIController {\n        opacity: glassFrameOverlay.visible && glassFrameOverlay.item && glassFrameOverlay.item.ready ? 0 : 1').replace(/}\s*$/,loader+'}\n');
}
function decide(mode,supported,mounted,owned){if(mounted&&!owned)return 'conflict';if(mode!=='frame')return owned?'unmount':'keep';if(!supported)return owned?'unmount':'unsupported';return owned?'keep':'mount';}
module.exports={insert:insert,decide:decide};
