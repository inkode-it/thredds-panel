## Thredds Panel Plugin for Grafana

This is a **preliminary working version**, plugin is based on Grafana [geoloop plugin](https://grafana.com/grafana/plugins/citilogics-geoloop-panel) and  [worldmap plugin](https://grafana.com/grafana/plugins/grafana-worldmap-panel/installation).

#### Before use:
- **THREDDS**
    - make sure your THREDDS server accept CORS request from your grafana domain, or create a proxy service to avoid errors.
    - merge multiple time-related NetCDF files using [NcML ggregation functions](https://www.unidata.ucar.edu/software/tds/current/tutorial/NcML.htm)
- **MAPBOX KEY** create an API key from [Mapbox](https://docs.mapbox.com/help/how-mapbox-works/access-tokens/)

#### Map view
![MAP](https://raw.githubusercontent.com/inkode-it/thredds-panel/master/dist/images/MAP.png)

#### Timeserie
![TIMESERIE](https://raw.githubusercontent.com/inkode-it/thredds-panel/master/dist/images/TIMESERIE.png)

#### Option panel
![OPTIONS](https://raw.githubusercontent.com/inkode-it/thredds-panel/master/dist/images/OPTIONS.png)

###### Map Options
- MapBox API Key: your own [MapBox API Key]((https://docs.mapbox.com/help/how-mapbox-works/access-tokens/)
- Map Style: select default map style
- Allow Pan/Zoom: permits user to change default zoom
- Center: default center coordinates, move the map and click on "Use Current" to change it
- Initial Zoom: default map zoom
- WMS overlay: an optional wms overlay layer

###### Thredds Options
- WMS Thredds URL: WMS url to your Thredds collection
- Thredds WMS Parameter: parameter name
- Color Scale MIN: minimun color value
- Color Scale MAX: maximun color value
- Style: WMS style


### Credits
![ADRION](https://raw.githubusercontent.com/inkode-it/thredds-panel/master/dist/images/ADRION.png)

Developed by [INKODE](https://inkode.it) for [ISMAR-CNR Venice](http://www.ismar.cnr.it/) under [Interreg ADRION I-STORMS Project](https://iws.seastorms.eu/)
