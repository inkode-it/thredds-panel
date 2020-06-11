'use strict';

System.register(['./libs/moment-with-locales'], function (_export, _context) {
  "use strict";

  var moment, _createClass, DataFormatter;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_libsMomentWithLocales) {
      moment = _libsMomentWithLocales.default;
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

      DataFormatter = function () {
        function DataFormatter(ctrl, kbn) {
          _classCallCheck(this, DataFormatter);

          this.ctrl = ctrl;
          this.kbn = kbn;
        }

        _createClass(DataFormatter, [{
          key: 'formatDate',
          value: function formatDate(date) {
            return moment(date).minutes(0).seconds(0).milliseconds(0).toISOString();
          }
        }, {
          key: 'getCharacteristics',
          value: function getCharacteristics() {
            var from = this.formatDate(this.ctrl.range.from);
            var to = this.formatDate(this.ctrl.range.to);
            if (this.ctrl.thredds) {
              this.ctrl.series = this.ctrl.thredds.filter(function (i) {
                return i <= to && i >= from;
              });
            }
            var valueList = this.ctrl.series;
            var dc = {
              timeValues: valueList,
              min: valueList.shift(),
              max: valueList.pop()
            };
            // console.log('data characteristics: ', dc);
            return dc;
          }
        }]);

        return DataFormatter;
      }();

      _export('default', DataFormatter);
    }
  };
});
//# sourceMappingURL=data_formatter.js.map
