/* eslint import/no-extraneous-dependencies: 0 */
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import TimeSeries from 'app/core/time_series2';
import kbn from 'app/core/utils/kbn';
import {contextSrv} from 'app/core/core';
import XmlConverter from './libs/xml-js';


import _ from 'lodash';
import * as d3 from './libs/d3';
import csscolorparser from './libs/csscolorparser';
import mapRenderer from './map_renderer';
import DataFormatter from './data_formatter';
import './css/thredds-panel.css!';

const panelDefaults = {
  mbApiKey: 'pk.xxxxx',
  mapStyle: 'streets-v10', // see opts below
  mapCenterLatitude: 42.40314651696761,
  mapCenterLongitude: 15.706181114373521,
  initialZoom: 5,
  userInteractionEnabled: true,
  animationSpeed: 1, // # of seconds animation time per day of data
  animationPause: 500, // millisecond pause at end of animation loop
  hideFeaturesWithNoData: true,
  thredds: {
    url: 'https://iwsproxy.visualfarm.it/thredds/wms/tmes_sea_level_frmc/TMES_sea_level_collection_best.ncd', // one of: url, text
    parameter: 'sea_level-mean', // either the jsonp url or the json text itself
    scale_min: -0.5,
    scale_max: 1,
    location: 'url', // one of: url, text
    contents: 'xxxxxx', // either the jsonp url or the json text itself
    callback: 'data', // named callback in jsonp contents
    style: 'boxfill/sst_36', // named callback in jsonp contents
  },
  wmsoverlay: 'https://iwsproxy.visualfarm.it/istorms/istorms/base/{z}/{x}/{y}.png', // named callback in jsonp contents
};

export default class ThreddsCtrl extends MetricsPanelCtrl {
  constructor($scope, $injector) {
    super($scope, $injector);

    // console.log('initializing thredds control');

    this.dataCharacteristics = {};

    this.opts = {
      mapStyles: {
        'streets': 'streets-v10',
        'outdoors': 'outdoors-v10',
        'light': 'light-v9',
        'dark': 'dark-v9',
        'satellite': 'satellite-v9',
        'satellite-streets': 'satellite-streets-v10',
        'traffic': 'traffic-day-v2',
        'traffic-night': 'traffic-night-v2'
      }
    };
    /* set defaults: */
    _.defaults(this.panel, panelDefaults);

    this.setMapProviderOpts();

    this.dataFormatter = new DataFormatter(this, kbn);

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('panel-teardown', this.onPanelTeardown.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));

    // console.log('control constructor loading geo:');
    this.loadThredds(true);
    this.lonLatStr = this.panel.mapCenterLongitude + ',' + this.panel.mapCenterLatitude;

    // $scope.$root.onAppEvent('show-dash-editor', this.doMapResize());
    // $scope.$root.onAppEvent('hide-dash-editor', this.doMapResize());
  }

  getColorScaleImgUrl() {
    return '/public/plugins/thredds-panel/images/colorRamps/' + this.panel.colorRamp.scaleName + '.png';
  }
  // getColorNames() {
  //   return Object.keys(this.opts.colorRamps);
  // }

  setLocationFromMap() {
    const center = this.map.map.getCenter();
    this.panel.mapCenterLongitude = center.lng;
    this.panel.mapCenterLatitude = center.lat;
    this.lonLatStr = this.panel.mapCenterLongitude + ',' + this.panel.mapCenterLatitude;
  }

  setNewMapCenter() {
    const coords = this.lonLatStr.split(',').map((strVal) => {
      return Number(strVal.trim());
    });
    this.panel.mapCenterLongitude = coords[0];
    this.panel.mapCenterLatitude = coords[1];

    this.mapCenterMoved = true;
    this.render();
  }

  hardResetMap() {
    if (this.map) {
      this.map.remove();
    }
    this.map = null;
    this.render();
    this.hardRefresh();
  }

  hardRefresh() {
    this.loadThredds(true);
  }

  setMapProviderOpts() {
    if (contextSrv.user.lightTheme) {
      this.saturationClass = '';
    } else {
      this.saturationClass = 'map-darken';
    }

    if (this.map) {
      this.map.stopAnimation();
      this.map.clearFrames();
      this.map.map.setStyle('mapbox://styles/mapbox/' + this.panel.mapStyle).on('style.load', () => {
        this.updateGeoDataFeatures();
        this.render();
      });
    }
  }

  loadThredds(reload) {
    // console.log('loadThredds', new Date())
    const panel = this.panel;
    if (this.map && !reload) {
      return;
    }

    if (this.panel.snapshotLocationData) {
      this.thredds = this.panel.snapshotLocationData;
      return;
    }

    if (this.panel.thredds.location === 'url') {
      if (!this.panel.thredds.url || !this.panel.thredds.parameter) {
        return;
      }
        window.$.ajax({
          type: 'GET',
          url: this.panel.thredds.url + '?service=WMS&version=1.3.0&request=GetCapabilities',
          contentType: 'application/xml',
          dataType: 'text',
          success: (res) => {
            this.capabilities = XmlConverter.xml2js(res, { compact : true }).WMS_Capabilities;
            this.layers = this.capabilities.Capability.Layer.Layer.Layer;
            this.WmsLayer = this.layers.find(function(item){
              return item.Name._text === panel.thredds.parameter;
            });
            const timeDimensions = this.WmsLayer.Dimension._text
              .replace('\n', '')
              .replace(/[^\w-:,]/gi, '')
              .replace('\t', '')
              .replace(' ', '')
              .split(',')
            // console.log('timeDimensions', timeDimensions)

            this.thredds = timeDimensions.map((i)=>this.dataFormatter.formatDate(i.replace('00000Z', '00.000Z')));
            // console.log('this.thredds', this.thredds);
            this.setWmsData();
            this.render();
          }
        }).fail((res) => {
          // console.log('error in ajax: ', res);
          this.thredds = null;
          this.render();
        });
    }
  }

  setWmsData() {
    if (!this.thredds) return;

    if (this.dashboard.snapshot && this.thredds) {
      this.panel.snapshotLocationData = this.thredds;
    }
    this.series = this.thredds;
    // console.log('series: ', this.series);
    this.dataCharacteristics = this.dataFormatter.getCharacteristics();

    // console.log(this.dataCharacteristics);
    this.render();
  }


  seriesThreddsHandler(seriesData) {
    // console.log('seriesData', seriesData)
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    // console.log('seriesThreddsHandler', series)
    return series;
  }

  onDataReceived(dataList) {
    // console.log('DATA RECEIVED')
    if (this.dashboard.snapshot && this.thredds) {
      this.panel.snapshotLocationData = this.thredds;
    }
    this.render();
  }

  onPanelTeardown() {
    if (this.map) this.map.remove();
  }

  onInitEditMode() {
    // console.log('init edit mode');
    this.addEditorTab('Thredds', 'public/plugins/thredds-panel/partials/editor.html');
  }

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }

  seriesHandler(seriesData) {
    // console.log('seriesData', seriesData)
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    // console.log(series)
    return series;
  }

  setZoom() {
    this.map.setZoom(this.panel.initialZoom || 1);
  }

  toggleLegend() {
    this.render();
  }

  updateGeoDataFeatures() {
    // console.log('updateGeoDataFeatures')
    // console.log('updating geo features');
    if (!this.thredds || !this.thredds.features) {
      // console.log('no geo or no features');
      return;
    }
    if (this.map) {
      // console.log('geojson source found. removing...');
      // this.map.map.removeSource('thredds');
    }
    if (!this.dataCharacteristics || !this.dataCharacteristics.timeValues) {
      // console.log('no data yet...');
      return;
    }
    // clear timeseries data from geojson data
    this.dataCharacteristics.timeValues.forEach((tv) => {
      this.thredds.features.forEach((feature) => {
        const fname = 'f-' + tv;
        if (feature.properties && feature.properties[fname]) {
          delete feature.properties[fname];
        }
      });
    });


    // organize the series data - using the "tag" user has selected for correspondence with feature.id:
    const keyedSeries = {};
    const geoKeySearch = this.panel.geotIdTag + ':';
    const reStr = geoKeySearch + ' ([^,}]+)';
    const reg = new RegExp(reStr);
    this.series.forEach((series) => {
      // expect series.alias to be of the form --> "measure.aggregator {tagKey: tagVal, tagKey: tagVal}"
      const matches = series.alias.match(reg);
      // console.log('matches: ', matches);
      if (matches && matches.length > 1) {
        keyedSeries[matches[1]] = series;
      }
    });

    // console.log('features: ', this.thredds.features);
    // console.log('keyed series: ', keyedSeries);

    // put data into features.
    const featureIdsWithData = [];
    this.thredds.features.forEach((feature) => {
      if (!feature.properties) {
        feature.properties = {};
      }
      // this funny business below deserializes the dot-notation path name and resolves the feature id
      // the user has specified.
      const featureId = this.panel.geoIdPath.split('.').reduce((obj, key) => obj[key], feature);
      if (featureId in keyedSeries) {
        const series = keyedSeries[featureId];
        series.datapoints.forEach((point) => {
          const time = point[1];
          const val = point[0];
          feature.properties['f-' + time] = val;
        });
        featureIdsWithData.push(featureId);
      }
    });


    let result = this.thredds;
    if (this.panel.hideFeaturesWithNoData) {
      // Create array of features only containing features with data.
      const filteredFeatures = this.thredds.features.filter((feature) => {
        const featureId = this.panel.geoIdPath.split('.').reduce((obj, key) => obj[key], feature);
        return featureIdsWithData.findIndex(entry => entry === featureId) >= 0;
      });

      // Create copy of geo object but with the filtered subset of features.
      result = Object.assign({}, this.thredds);
      result.features = filteredFeatures;
    }

    // if (result && this.map) {
    //   console.log('adding geojson source...');
    //   // this.map.map.addSource('thredds', {
    //   //   type: 'geojson',
    //   //   data: result
    //   // });
    // } else {
    //   console.log('not adding source because no map');
    // }
  }

/* eslint class-methods-use-this: 0 */
  link(scope, elem, attrs, ctrl) {
    mapRenderer(scope, elem, attrs, ctrl);
  }

}

ThreddsCtrl.templateUrl = 'module.html';
