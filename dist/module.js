'use strict';

System.register(['app/plugins/sdk', './thredds_ctrl'], function (_export, _context) {
  "use strict";

  var loadPluginCss, ThreddsCtrl;
  return {
    setters: [function (_appPluginsSdk) {
      loadPluginCss = _appPluginsSdk.loadPluginCss;
    }, function (_thredds_ctrl) {
      ThreddsCtrl = _thredds_ctrl.default;
    }],
    execute: function () {
      /* eslint import/no-extraneous-dependencies: 0 */
      loadPluginCss({
        dark: 'plugins/thredds-panel/css/thredds.dark.css',
        light: 'plugins/thredds-panel/css/thredds.light.css'
      });

      /* eslint import/prefer-default-export: 0 */

      _export('PanelCtrl', ThreddsCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
