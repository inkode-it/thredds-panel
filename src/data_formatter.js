import moment from './libs/moment-with-locales';

export default class DataFormatter {
  constructor(ctrl, kbn) {
    this.ctrl = ctrl;
    this.kbn = kbn;
  }

  formatDate(date) {
    return moment(date).minutes(0).seconds(0).milliseconds(0).toISOString();
  }

  getCharacteristics() {
    const from = this.formatDate(this.ctrl.range.from)
    const to = this.formatDate(this.ctrl.range.to)
    if(this.ctrl.thredds) {
      this.ctrl.series = this.ctrl.thredds.filter(function(i){return i<=to && i>=from});
    }
    const valueList = this.ctrl.series
    const dc = {
      timeValues: valueList,
      min: valueList.shift(),
      max: valueList.pop(),
    };
    // console.log('data characteristics: ', dc);
    return dc;
  }

}
