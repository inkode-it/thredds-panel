'use strict';

System.register(['moment', './libs/mapbox-gl', './libs/d3', './libs/xml-js', './libs/plotly'], function (_export, _context) {
    "use strict";

    var moment, mapboxgl, d3, XmlConverter, Plotly, _createClass, Thredds;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_moment) {
            moment = _moment.default;
        }, function (_libsMapboxGl) {
            mapboxgl = _libsMapboxGl.default;
        }, function (_libsD) {
            d3 = _libsD;
        }, function (_libsXmlJs) {
            XmlConverter = _libsXmlJs.default;
        }, function (_libsPlotly) {
            Plotly = _libsPlotly.default;
        }],
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

            Thredds = function () {
                function Thredds(ctrl, mapContainer) {
                    _classCallCheck(this, Thredds);

                    // console.log('NEW constructor')
                    this.ctrl = ctrl;
                    this.mapContainer = mapContainer;
                    this.createMap();
                    this.frames = []; // list of timestamps
                    this.currentFrameIndex = 0;
                    this.animation = {};
                    this.time = null;
                }

                _createClass(Thredds, [{
                    key: 'setFrame',
                    value: function setFrame(frameIndex) {
                        if (this.animation) {
                            this.stopAnimation();
                        }
                        this.currentFrameIndex = frameIndex - 1;
                        this.stepFrame();
                    }
                }, {
                    key: 'createMap',
                    value: function createMap() {
                        // console.log('rebuilding map');
                        var mapCenterLonLat = [parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)];
                        mapboxgl.accessToken = this.ctrl.panel.mbApiKey;
                        this.map = new mapboxgl.Map({
                            container: this.mapContainer,
                            style: 'mapbox://styles/mapbox/' + this.ctrl.panel.mapStyle,
                            center: mapCenterLonLat,
                            zoom: parseFloat(this.ctrl.panel.initialZoom),
                            interactive: this.ctrl.panel.userInteractionEnabled
                        });
                        if (this.ctrl.panel.wmsoverlay) {
                            var newLayer = {
                                id: 'wmsoverlay',
                                type: 'raster',
                                source: {
                                    'type': 'raster',
                                    'tiles': [this.ctrl.panel.wmsoverlay]
                                },
                                paint: {
                                    "raster-opacity": 1
                                }
                            };
                            this.map.on('style.load', function (e) {
                                this.addLayer(newLayer);
                            });
                        }

                        var onclick = this.onClick,
                            self = this;
                        this.map.on('click', function (e) {
                            onclick(e, self);
                        });
                    }
                }, {
                    key: 'round',
                    value: function round(n) {
                        return Math.round(n * 1000) / 1000;
                    }
                }, {
                    key: 'onClick',
                    value: function onClick(e, self) {
                        var _this = this;

                        var data = {
                            lat: e.lngLat.lat,
                            lng: e.lngLat.lng,
                            from: self.frames[0],
                            to: self.frames[self.frames.length - 1],
                            ql: self.ctrl.panel.thredds.parameter
                        };
                        var options = {
                            REQUEST: 'GetFeatureInfo',
                            ELEVATION: '0',
                            TRANSPARENT: 'true',
                            STYLES: self.ctrl.panel.thredds.style,
                            COLORSCALERANGE: '-50,50',
                            NUMCOLORBANDS: '20',
                            LOGSCALE: 'false',
                            SERVICE: 'WMS',
                            VERSION: '1.1.1',
                            SRS: 'EPSG:4326',
                            CRS: 'EPSG:4326',
                            FORMAT: 'image/png',
                            INFO_FORMAT: 'text/xml',
                            BBOX: [e.lngLat.lng - 0.002, e.lngLat.lat - 0.002, e.lngLat.lng + 0.002, e.lngLat.lat + 0.002].join(','),
                            X: 1,
                            Y: 1,
                            WIDTH: 2,
                            HEIGHT: 2,
                            TIME: self.frames[0] + '/' + self.frames[self.frames.length - 1],
                            QUERY_LAYERS: self.ctrl.panel.thredds.parameter,
                            LAYERS: self.ctrl.panel.thredds.parameter
                        };
                        var url = new URL(self.ctrl.panel.thredds.url);
                        url.search = new URLSearchParams(options);
                        // console.log(url.toString());

                        window.$.ajax({
                            type: 'GET',
                            url: url,
                            contentType: 'application/xml',
                            dataType: 'text',
                            success: function success(res) {
                                var result = XmlConverter.xml2js(res, { compact: true }).FeatureInfoResponse.FeatureInfo;
                                self.graphData = {
                                    name: self.ctrl.panel.thredds.parameter + ' - lat ' + self.round(e.lngLat.lat) + ' lon ' + self.round(e.lngLat.lng),
                                    x: result.map(function (x) {
                                        return x.time._text;
                                    }),
                                    y: result.map(function (x) {
                                        return x.value._text !== 'none' ? self.round(x.value._text) : null;
                                    }),
                                    type: 'scatter'
                                };
                                document.getElementById("graphcontainer_" + self.ctrl.panel.id).style.display = "block";
                                Plotly.newPlot("graph_" + self.ctrl.panel.id, [self.graphData], { title: { text: self.graphData.name }, margin: { l: 40, r: 10, t: 40, b: 40 } }, { responsive: true, showLink: false, displayLogo: false, displayModeBar: false });
                            }
                        }).fail(function (res) {
                            console.log('error in ajax: ', res);
                            _this.thredds = null;
                            _this.render();
                        });
                        // }
                    }
                }, {
                    key: 'createLegend',
                    value: function createLegend() {
                        this.legend = {};
                    }
                }, {
                    key: 'needToRedrawFrames',
                    value: function needToRedrawFrames() {
                        this.legend = {};
                        return true;
                    }
                }, {
                    key: 'drawLayerFrames',
                    value: function drawLayerFrames() {
                        var data = this.ctrl.data;
                        if (this.needToRedrawFrames(data)) {
                            // console.log('needToRedrawFrames')
                            this.stopAnimation();
                            this.clearFrames();
                            this.createFrames(data);
                            // this.setFrame(0);
                            this.startAnimation();
                        }
                    }
                }, {
                    key: 'clearFrames',
                    value: function clearFrames() {
                        var _this2 = this;

                        this.frames.forEach(function (item) {
                            if (_this2.map.getLayer('f-' + item)) _this2.map.removeLayer('f-' + item);
                        });
                        this.frames = [];
                    }
                }, {
                    key: 'createFrames',
                    value: function createFrames() {
                        var _this3 = this;

                        // console.log('createFrames')
                        if (!this.ctrl.dataCharacteristics.timeValues) {
                            // console.log('no series to display');
                            return;
                        }

                        if (!this.ctrl.thredds) {
                            // console.log('no thredds data');
                            return;
                        }

                        if (this.map.loaded()) {
                            this.createFramesSafely();
                        } else {
                            // console.log('no geo source in map. maybe not loaded?');
                            // this is stupid to use setInterval.
                            // but mapbox doesn't seem to have a on-source-loaded event that reliably works
                            // for this purpose.
                            var attemptsLeft = 10;
                            var interval = setInterval(function () {
                                // console.log('waited for layer to load.');
                                if (_this3.map.loaded()) {
                                    _this3.createFramesSafely();
                                    clearInterval(interval);
                                } else {
                                    // console.log('still no geo source. try refresh manually?');
                                    if (--attemptsLeft <= 0) {
                                        clearInterval(interval);
                                    }
                                }
                            }, 500);
                        }
                    }
                }, {
                    key: 'createFramesSafely',
                    value: function createFramesSafely() {
                        var _this4 = this;

                        // console.log('createFramesSafely')
                        // console.log('createFramesSafely',this.ctrl.dataCharacteristics.timeValues)
                        this.ctrl.dataCharacteristics.timeValues.forEach(function (time) {
                            // console.log(time)
                            // console.log(this.ctrl.panel.thredds)
                            var frameName = 'f-' + time;
                            var wmsUrl = _this4.ctrl.panel.thredds.url + '?LAYERS=' + _this4.ctrl.panel.thredds.parameter + '&ELEVATION=0&TIME=' + time + '&TRANSPARENT=true&STYLES=' + _this4.ctrl.panel.thredds.style + '&COLORSCALERANGE=' + _this4.ctrl.panel.thredds.scale_min + ',' + _this4.ctrl.panel.thredds.scale_max + '&NUMCOLORBANDS=80&LOGSCALE=false&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
                            // console.log('wmsUrl', wmsUrl);
                            if (_this4.map) {
                                if (!_this4.map.getSource('f-' + time)) _this4.map.addSource('f-' + time, {
                                    type: 'raster',
                                    tiles: [wmsUrl],
                                    width: 256,
                                    height: 256
                                });
                            }

                            if (!_this4.frames.includes(time)) _this4.frames.push(time);
                        });

                        // get slider component, set min/max/value
                        var slider = d3.select('#map_' + this.ctrl.panel.id + '_slider').attr('min', 0).attr('max', this.frames.length - 1);

                        var self = this;

                        var start = d3.select("#start_" + this.ctrl.panel.id).on("click", function () {
                            // console.log('PASSO start')
                            self.startAnimation();
                        });

                        var stop = d3.select("#stop_" + this.ctrl.panel.id).on("click", function () {
                            // console.log('PASSO stop')
                            self.stopAnimation();
                        });
                    }
                }, {
                    key: 'startAnimation',
                    value: function startAnimation() {
                        var _this5 = this;

                        if (this.animation) {
                            this.stopAnimationsync();
                        }

                        this.animation = setInterval(function () {
                            _this5.stepFrame();
                        }, 3000);
                        d3.select("#stop_" + this.ctrl.panel.id).style('display', '');
                        d3.select("#start_" + this.ctrl.panel.id).style('display', 'none');
                    }
                }, {
                    key: 'stopAnimation',
                    value: function stopAnimation() {
                        clearInterval(this.animation);
                        this.animation = null;
                        d3.select("#start_" + this.ctrl.panel.id).style('display', '');
                        d3.select("#stop_" + this.ctrl.panel.id).style('display', 'none');
                    }
                }, {
                    key: 'pauseAnimation',
                    value: function pauseAnimation() {
                        clearInterval(this.animation);
                        // this.animation = null;
                    }
                }, {
                    key: 'stepFrame',
                    value: function stepFrame(goToIndex) {
                        // console.log('stepFrame', this.frames.length, this.currentFrameIndex)
                        if (!this.map) {
                            return;
                        }
                        if (this.frames.length === 0) {
                            // console.log('skipping animation: no frames');
                            return;
                        }
                        var oldFrame = 'f-' + this.frames[this.currentFrameIndex];

                        if (!goToIndex && goToIndex !== 0) {
                            this.currentFrameIndex += 1;
                        } else {
                            this.currentFrameIndex = goToIndex;
                        }
                        if (this.currentFrameIndex >= this.frames.length) {
                            this.currentFrameIndex = 0;
                        }
                        var newFrame = 'f-' + this.frames[this.currentFrameIndex];

                        // console.log(newFrame, oldFrame)
                        if (this.map.getLayer(oldFrame)) {
                            this.map.removeLayer(oldFrame);
                        }
                        var newLayer = {
                            id: newFrame,
                            type: 'raster',
                            source: newFrame,
                            paint: {
                                "raster-opacity": 1
                            }
                        };
                        this.map.addLayer(newLayer);
                        this.time = this.frames[this.currentFrameIndex];
                        // this.map.setPaintProperty(newFrame, 'raster-opacity', 1);
                        // this.map.setPaintProperty(oldFrame, 'raster-opacity', 0);

                        // set time string in legend
                        d3.select('#map_' + this.ctrl.panel.id + '_date').text(moment(this.frames[this.currentFrameIndex]).format('DD-MM-YYYY HH:mm'));
                        // set slider position to indicate time-location
                        d3.select('#map_' + this.ctrl.panel.id + '_slider').property('value', this.currentFrameIndex);
                    }
                }, {
                    key: 'resize',
                    value: function resize() {
                        this.map.resize();
                    }
                }, {
                    key: 'panToMapCenter',
                    value: function panToMapCenter() {
                        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)]);
                        this.ctrl.mapCenterMoved = false;
                    }
                }, {
                    key: 'setZoom',
                    value: function setZoom(zoomFactor) {
                        this.map.setZoom(parseInt(zoomFactor, 10));
                    }
                }, {
                    key: 'remove',
                    value: function remove() {
                        if (this.map) {
                            this.map.remove();
                        }
                        this.map = null;
                    }
                }]);

                return Thredds;
            }();

            _export('default', Thredds);
        }
    };
});
//# sourceMappingURL=thredds.js.map
