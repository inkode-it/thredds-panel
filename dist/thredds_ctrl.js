'use strict';

System.register(['app/plugins/sdk', 'app/core/time_series2', 'app/core/utils/kbn', 'app/core/core', './libs/xml-js', 'lodash', './libs/d3', './libs/csscolorparser', './map_renderer', './data_formatter', './css/thredds-panel.css!'], function (_export, _context) {
  "use strict";

  var MetricsPanelCtrl, TimeSeries, kbn, contextSrv, XmlConverter, _, d3, csscolorparser, mapRenderer, DataFormatter, _createClass, panelDefaults, ThreddsCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_appCoreUtilsKbn) {
      kbn = _appCoreUtilsKbn.default;
    }, function (_appCoreCore) {
      contextSrv = _appCoreCore.contextSrv;
    }, function (_libsXmlJs) {
      XmlConverter = _libsXmlJs.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_libsD) {
      d3 = _libsD;
    }, function (_libsCsscolorparser) {
      csscolorparser = _libsCsscolorparser.default;
    }, function (_map_renderer) {
      mapRenderer = _map_renderer.default;
    }, function (_data_formatter) {
      DataFormatter = _data_formatter.default;
    }, function (_cssThreddsPanelCss) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      panelDefaults = {
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
          style: 'boxfill/sst_36' // named callback in jsonp contents
        },
        wmsoverlay: 'https://iwsproxy.visualfarm.it/istorms/istorms/base/{z}/{x}/{y}.png' // named callback in jsonp contents
      };

      ThreddsCtrl = function (_MetricsPanelCtrl) {
        _inherits(ThreddsCtrl, _MetricsPanelCtrl);

        function ThreddsCtrl($scope, $injector) {
          _classCallCheck(this, ThreddsCtrl);

          var _this = _possibleConstructorReturn(this, (ThreddsCtrl.__proto__ || Object.getPrototypeOf(ThreddsCtrl)).call(this, $scope, $injector));

          // console.log('initializing thredds control');

          _this.dataCharacteristics = {};

          _this.opts = {
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
          _.defaults(_this.panel, panelDefaults);

          _this.setMapProviderOpts();

          _this.dataFormatter = new DataFormatter(_this, kbn);

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataSnapshotLoad.bind(_this));

          // console.log('control constructor loading geo:');
          _this.loadThredds(true);
          _this.lonLatStr = _this.panel.mapCenterLongitude + ',' + _this.panel.mapCenterLatitude;

          // $scope.$root.onAppEvent('show-dash-editor', this.doMapResize());
          // $scope.$root.onAppEvent('hide-dash-editor', this.doMapResize());
          return _this;
        }

        _createClass(ThreddsCtrl, [{
          key: 'getColorScaleImgUrl',
          value: function getColorScaleImgUrl() {
            return '/public/plugins/thredds-panel/images/colorRamps/' + this.panel.colorRamp.scaleName + '.png';
          }
        }, {
          key: 'setLocationFromMap',
          value: function setLocationFromMap() {
            var center = this.map.map.getCenter();
            this.panel.mapCenterLongitude = center.lng;
            this.panel.mapCenterLatitude = center.lat;
            this.lonLatStr = this.panel.mapCenterLongitude + ',' + this.panel.mapCenterLatitude;
          }
        }, {
          key: 'setNewMapCenter',
          value: function setNewMapCenter() {
            var coords = this.lonLatStr.split(',').map(function (strVal) {
              return Number(strVal.trim());
            });
            this.panel.mapCenterLongitude = coords[0];
            this.panel.mapCenterLatitude = coords[1];

            this.mapCenterMoved = true;
            this.render();
          }
        }, {
          key: 'hardResetMap',
          value: function hardResetMap() {
            if (this.map) {
              this.map.remove();
            }
            this.map = null;
            this.render();
            this.hardRefresh();
          }
        }, {
          key: 'hardRefresh',
          value: function hardRefresh() {
            this.loadThredds(true);
          }
        }, {
          key: 'setMapProviderOpts',
          value: function setMapProviderOpts() {
            var _this2 = this;

            if (contextSrv.user.lightTheme) {
              this.saturationClass = '';
            } else {
              this.saturationClass = 'map-darken';
            }

            if (this.map) {
              this.map.stopAnimation();
              this.map.clearFrames();
              this.map.map.setStyle('mapbox://styles/mapbox/' + this.panel.mapStyle).on('style.load', function () {
                _this2.updateGeoDataFeatures();
                _this2.render();
              });
            }
          }
        }, {
          key: 'loadThredds',
          value: function loadThredds(reload) {
            var _this3 = this;

            // console.log('loadThredds', new Date())
            var panel = this.panel;
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
                success: function success(res) {
                  _this3.capabilities = XmlConverter.xml2js(res, { compact: true }).WMS_Capabilities;
                  _this3.layers = _this3.capabilities.Capability.Layer.Layer.Layer;
                  _this3.WmsLayer = _this3.layers.find(function (item) {
                    return item.Name._text === panel.thredds.parameter;
                  });
                  var timeDimensions = _this3.WmsLayer.Dimension._text.replace('\n', '').replace(/[^\w-:,]/gi, '').replace('\t', '').replace(' ', '').split(',');
                  // console.log('timeDimensions', timeDimensions)

                  _this3.thredds = timeDimensions.map(function (i) {
                    return _this3.dataFormatter.formatDate(i.replace('00000Z', '00.000Z'));
                  });
                  // console.log('this.thredds', this.thredds);
                  _this3.setWmsData();
                  _this3.render();
                }
              }).fail(function (res) {
                // console.log('error in ajax: ', res);
                _this3.thredds = null;
                _this3.render();
              });
            }
          }
        }, {
          key: 'setWmsData',
          value: function setWmsData() {
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
        }, {
          key: 'seriesThreddsHandler',
          value: function seriesThreddsHandler(seriesData) {
            // console.log('seriesData', seriesData)
            var series = new TimeSeries({
              datapoints: seriesData.datapoints,
              alias: seriesData.target
            });

            series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
            // console.log('seriesThreddsHandler', series)
            return series;
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            // console.log('DATA RECEIVED')
            if (this.dashboard.snapshot && this.thredds) {
              this.panel.snapshotLocationData = this.thredds;
            }
            this.render();
          }
        }, {
          key: 'onPanelTeardown',
          value: function onPanelTeardown() {
            if (this.map) this.map.remove();
          }
        }, {
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            // console.log('init edit mode');
            this.addEditorTab('Thredds', 'public/plugins/thredds-panel/partials/editor.html');
          }
        }, {
          key: 'onDataSnapshotLoad',
          value: function onDataSnapshotLoad(snapshotData) {
            this.onDataReceived(snapshotData);
          }
        }, {
          key: 'seriesHandler',
          value: function seriesHandler(seriesData) {
            // console.log('seriesData', seriesData)
            var series = new TimeSeries({
              datapoints: seriesData.datapoints,
              alias: seriesData.target
            });

            series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
            // console.log(series)
            return series;
          }
        }, {
          key: 'setZoom',
          value: function setZoom() {
            this.map.setZoom(this.panel.initialZoom || 1);
          }
        }, {
          key: 'toggleLegend',
          value: function toggleLegend() {
            this.render();
          }
        }, {
          key: 'updateGeoDataFeatures',
          value: function updateGeoDataFeatures() {
            var _this4 = this;

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
            this.dataCharacteristics.timeValues.forEach(function (tv) {
              _this4.thredds.features.forEach(function (feature) {
                var fname = 'f-' + tv;
                if (feature.properties && feature.properties[fname]) {
                  delete feature.properties[fname];
                }
              });
            });

            // organize the series data - using the "tag" user has selected for correspondence with feature.id:
            var keyedSeries = {};
            var geoKeySearch = this.panel.geotIdTag + ':';
            var reStr = geoKeySearch + ' ([^,}]+)';
            var reg = new RegExp(reStr);
            this.series.forEach(function (series) {
              // expect series.alias to be of the form --> "measure.aggregator {tagKey: tagVal, tagKey: tagVal}"
              var matches = series.alias.match(reg);
              // console.log('matches: ', matches);
              if (matches && matches.length > 1) {
                keyedSeries[matches[1]] = series;
              }
            });

            // console.log('features: ', this.thredds.features);
            // console.log('keyed series: ', keyedSeries);

            // put data into features.
            var featureIdsWithData = [];
            this.thredds.features.forEach(function (feature) {
              if (!feature.properties) {
                feature.properties = {};
              }
              // this funny business below deserializes the dot-notation path name and resolves the feature id
              // the user has specified.
              var featureId = _this4.panel.geoIdPath.split('.').reduce(function (obj, key) {
                return obj[key];
              }, feature);
              if (featureId in keyedSeries) {
                var series = keyedSeries[featureId];
                series.datapoints.forEach(function (point) {
                  var time = point[1];
                  var val = point[0];
                  feature.properties['f-' + time] = val;
                });
                featureIdsWithData.push(featureId);
              }
            });

            var result = this.thredds;
            if (this.panel.hideFeaturesWithNoData) {
              // Create array of features only containing features with data.
              var filteredFeatures = this.thredds.features.filter(function (feature) {
                var featureId = _this4.panel.geoIdPath.split('.').reduce(function (obj, key) {
                  return obj[key];
                }, feature);
                return featureIdsWithData.findIndex(function (entry) {
                  return entry === featureId;
                }) >= 0;
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
        }, {
          key: 'link',
          value: function link(scope, elem, attrs, ctrl) {
            mapRenderer(scope, elem, attrs, ctrl);
          }
        }]);

        return ThreddsCtrl;
      }(MetricsPanelCtrl);

      _export('default', ThreddsCtrl);

      ThreddsCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=thredds_ctrl.js.map
