import Thredds from './thredds';

export default function link(scope, elem, attrs, ctrl) {
  const mapContainer = elem.find('.mapcontainer');
  const mapSlider = elem.find('.mapslider');
  // console.log('mapSlider',mapSlider);
  // console.log('initialized map renderer');

  ctrl.events.on('render', () => {
    render();
    if (ctrl.map) {
      setTimeout(() => {
        ctrl.map.resize();
      }, 500);
    }
    ctrl.renderingCompleted();
  });

  function render() {
    // console.log('called into RENDER');
    if (!ctrl.map) {
      // console.log('creating new map');
      ctrl.map = new Thredds(ctrl, mapContainer[0]);
      // mapSlider[0].setAttribute('onchange', ctrl.map.setFrame);
      mapSlider[0].onchange = function(e){ctrl.map.setFrame(e.target.value);};
      // console.log(mapSlider);
    }

    ctrl.map.resize();

    if (ctrl.mapCenterMoved) ctrl.map.panToMapCenter();


    // if (!ctrl.map.legend && ctrl.panel.showLegend) ctrl.map.createLegend();

    // ctrl.updateRamp();
    ctrl.map.drawLayerFrames();
    // console.log(ctrl);
  }
}
