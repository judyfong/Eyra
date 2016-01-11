'use strict';

angular.module('daApp')
.controller('RegisterDeviceController', RegisterDeviceController);

RegisterDeviceController.$inject = ['$location', 
                                    '$scope', 
                                    'deliveryService', 
                                    'localDbMiscService', 
                                    'logger', 
                                    'utilityService'];

function RegisterDeviceController($location, $scope, deliveryService, localDbMiscService, logger, utilityService) {
  var regdCtrl = this;
  var delService = deliveryService;
  var dbService = localDbMiscService;
  var util = utilityService;
  
  regdCtrl.submit = submit;

  regdCtrl.imei = ''; // device hardcoded ID, btw many phones can display this by dialing *#06#
  $scope.isLoaded = true;

  
  //////////

  function submit() {
    if (regdCtrl.imei.length > 0) {
      // lets not worry about sanitizing userAgent client side even though it can be spoofed. 
      var device =  {
                      'userAgent':navigator.userAgent,
                      'imei':regdCtrl.imei
                    }
      delService.submitDevice(device).then(
        function success(response) {
          dbService.setDevice(device)
            .then(angular.noop, util.stdErrCallback);

          alert('Device info submitted!');

          $location.path('/main');
        },
        function error(response) {
          regdCtrl.msg = 'Error submitting device.';
          logger.error(response);
        }
      );
    } else {
      logger.error('Unexpected error, no imei typed.');
    }
  }
}
