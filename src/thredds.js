/* eslint-disable id-length, no-unused-vars */
import moment from 'moment';
import mapboxgl from './libs/mapbox-gl';
import * as d3 from './libs/d3';
import XmlConverter from "./libs/xml-js";
import Plotly from './libs/plotly';

/* eslint-disable id-length, no-unused-vars */

export default class Thredds {
    constructor(ctrl, mapContainer) {
        // console.log('NEW constructor')
        this.ctrl = ctrl;
        this.mapContainer = mapContainer;
        this.createMap();
        this.frames = []; // list of timestamps
        this.currentFrameIndex = 0;
        this.animation = {};
        this.time = null;
    }

    setFrame(frameIndex)
    {
        if (this.animation) {
            this.stopAnimation();
        }
        this.currentFrameIndex = frameIndex - 1;
        this.stepFrame();
    }

    createMap() {
        // console.log('rebuilding map');
        const mapCenterLonLat = [parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)];
        mapboxgl.accessToken = this.ctrl.panel.mbApiKey;
        this.map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/' + this.ctrl.panel.mapStyle,
            center: mapCenterLonLat,
            zoom: parseFloat(this.ctrl.panel.initialZoom),
            interactive: this.ctrl.panel.userInteractionEnabled
        });
        if(this.ctrl.panel.wmsoverlay)
        {
            const newLayer = {
                id: 'wmsoverlay',
                type: 'raster',
                source: {
                    'type': 'raster',
                    'tiles': [
                    this.ctrl.panel.wmsoverlay
                    ]
                },
                paint: {
                    "raster-opacity": 1,
                },
            }
            this.map.on('style.load', function (e) {
                this.addLayer(newLayer);
            });
        }

        const onclick = this.onClick,
        self = this;
        this.map.on('click', function (e) {
            onclick(e,self);
        });

    }

    round(n) {
        return Math.round(n*1000)/1000
    }

    onClick(e,self) {
        const data = {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            from: self.frames[0],
            to: self.frames[self.frames.length-1],
            ql: self.ctrl.panel.thredds.parameter
        }
        const options = {
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
            BBOX: [
                e.lngLat.lng - 0.002,
                e.lngLat.lat - 0.002,
                e.lngLat.lng + 0.002,
                e.lngLat.lat + 0.002,
            ].join(','),
            X: 1,
            Y: 1,
            WIDTH: 2,
            HEIGHT: 2,
            TIME: `${self.frames[0]}/${self.frames[self.frames.length-1]}`,
            QUERY_LAYERS: self.ctrl.panel.thredds.parameter,
            LAYERS: self.ctrl.panel.thredds.parameter,
        }
        const url = new URL(self.ctrl.panel.thredds.url)
        url.search = new URLSearchParams(options)
        // console.log(url.toString());

        window.$.ajax({
          type: 'GET',
          url: url,
          contentType: 'application/xml',
          dataType: 'text',
          success: (res) => {
             const result = XmlConverter.xml2js(res, { compact : true }).FeatureInfoResponse.FeatureInfo;
             self.graphData = {
                 name: `${self.ctrl.panel.thredds.parameter} - lat ${self.round(e.lngLat.lat)} lon ${self.round(e.lngLat.lng)}`,
                 x: result.map(function (x) {
                    return x.time._text
                 }),
                 y: result.map(function (x) {
                    return x.value._text !== 'none' ? self.round(x.value._text) : null
                 }),
                type: 'scatter',
             }
             document.getElementById("graphcontainer_"+self.ctrl.panel.id).style.display = "block";
              Plotly.newPlot(
                  "graph_"+self.ctrl.panel.id,
                  [self.graphData],
                  {title: {text: self.graphData.name}, margin: {l:40,r:10,t:40,b:40}},
                  {responsive: true,showLink: false,displayLogo: false,displayModeBar: false}
              );
          }
        }).fail((res) => {
          console.log('error in ajax: ', res);
          this.thredds = null;
          this.render();
        });
    // }

    }

    createLegend() {
        this.legend = {};
    }

    needToRedrawFrames() {
        this.legend = {};
        return true;
    }

    drawLayerFrames() {
        const data = this.ctrl.data;
        if (this.needToRedrawFrames(data)) {
            // console.log('needToRedrawFrames')
            this.stopAnimation();
            this.clearFrames();
            this.createFrames(data);
            // this.setFrame(0);
            this.startAnimation();
        }
    }

    clearFrames() {
        this.frames.forEach((item) => {
            if (this.map.getLayer('f-' + item))
                this.map.removeLayer('f-' + item);
        });
        this.frames = [];
    }

    createFrames() {
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
            let attemptsLeft = 10;
            const interval = setInterval(() => {
                // console.log('waited for layer to load.');
                if (this.map.loaded()) {
                    this.createFramesSafely();
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

    createFramesSafely() {
        // console.log('createFramesSafely')
        // console.log('createFramesSafely',this.ctrl.dataCharacteristics.timeValues)
        this.ctrl.dataCharacteristics.timeValues.forEach((time) => {
            // console.log(time)
            // console.log(this.ctrl.panel.thredds)
            const frameName = 'f-' + time;
            const wmsUrl = `${this.ctrl.panel.thredds.url}?LAYERS=${this.ctrl.panel.thredds.parameter}&ELEVATION=0&TIME=${time}&TRANSPARENT=true&STYLES=${this.ctrl.panel.thredds.style}&COLORSCALERANGE=${this.ctrl.panel.thredds.scale_min},${this.ctrl.panel.thredds.scale_max}&NUMCOLORBANDS=80&LOGSCALE=false&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`;
            // console.log('wmsUrl', wmsUrl);
            if (this.map) {
                if (!this.map.getSource('f-' + time))
                    this.map.addSource('f-' + time, {
                        type: 'raster',
                        tiles: [wmsUrl],
                        width: 256,
                        height: 256
                    });
            }

            if(!this.frames.includes(time))
                this.frames.push(time);
        });

        // get slider component, set min/max/value
        const slider = d3.select('#map_' + this.ctrl.panel.id + '_slider')
            .attr('min', 0)
            .attr('max', (this.frames.length -1));


        const self = this;

        const start = d3.select("#start_"+this.ctrl.panel.id).on("click", function() {
            // console.log('PASSO start')
            self.startAnimation();
        });

        const stop = d3.select("#stop_"+this.ctrl.panel.id).on("click", function() {
            // console.log('PASSO stop')
            self.stopAnimation();
        });
    }


    startAnimation() {
        if (this.animation) {
            this.stopAnimationsync();
        }

        this.animation = setInterval(() => {
            this.stepFrame();
        }, 3000);
        d3.select("#stop_"+this.ctrl.panel.id).style('display', '');
        d3.select("#start_"+this.ctrl.panel.id).style('display', 'none');
    }

    stopAnimation() {
        clearInterval(this.animation);
        this.animation = null;
        d3.select("#start_"+this.ctrl.panel.id).style('display', '');
        d3.select("#stop_"+this.ctrl.panel.id).style('display', 'none');
    }

    pauseAnimation() {
        clearInterval(this.animation);
        // this.animation = null;
    }

    stepFrame(goToIndex) {
        // console.log('stepFrame', this.frames.length, this.currentFrameIndex)
        if (!this.map) {
            return;
        }
        if (this.frames.length === 0) {
            // console.log('skipping animation: no frames');
            return;
        }
        const oldFrame = 'f-' + this.frames[this.currentFrameIndex];

        if(!goToIndex && goToIndex !== 0) {
            this.currentFrameIndex += 1;
        } else {
            this.currentFrameIndex = goToIndex;
        }
        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = 0;
        }
        const newFrame = 'f-' + this.frames[this.currentFrameIndex];

        // console.log(newFrame, oldFrame)
        if(this.map.getLayer(oldFrame)) {
            this.map.removeLayer(oldFrame);
        }
        const newLayer = {
            id: newFrame,
            type: 'raster',
            source: newFrame,
            paint: {
                "raster-opacity": 1,
            },
        }
        this.map.addLayer(newLayer);
        this.time = this.frames[this.currentFrameIndex]
        // this.map.setPaintProperty(newFrame, 'raster-opacity', 1);
        // this.map.setPaintProperty(oldFrame, 'raster-opacity', 0);

        // set time string in legend
        d3.select('#map_' + this.ctrl.panel.id + '_date').text(moment(this.frames[this.currentFrameIndex]).format('DD-MM-YYYY HH:mm'));
        // set slider position to indicate time-location
        d3.select('#map_' + this.ctrl.panel.id + '_slider').property('value', this.currentFrameIndex);
    }

    resize() {
        this.map.resize();
    }

    panToMapCenter() {
        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)]);
        this.ctrl.mapCenterMoved = false;
    }

    setZoom(zoomFactor) {
        this.map.setZoom(parseInt(zoomFactor, 10));
    }

    remove() {
        if (this.map) {
            this.map.remove();
        }
        this.map = null;
    }
}
