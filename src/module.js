/* eslint import/no-extraneous-dependencies: 0 */
import {loadPluginCss} from 'app/plugins/sdk';
import ThreddsCtrl from './thredds_ctrl';

loadPluginCss({
  dark: 'plugins/thredds-panel/css/thredds.dark.css',
  light: 'plugins/thredds-panel/css/thredds.light.css'
});

/* eslint import/prefer-default-export: 0 */
export {
  ThreddsCtrl as PanelCtrl
};
