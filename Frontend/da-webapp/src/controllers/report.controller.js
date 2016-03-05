(function () {
'use strict';

angular.module('daApp')
.controller('ReportController', ReportController);

ReportController.$inject = ['$location', '$rootScope', '$scope', 'dataService'];

function ReportController($location, $rootScope, $scope, dataService) {
  var reportCtrl = this;

  $scope.msg = '';
  $scope.QCReport = dataService.get('QCReport') || 'Nothing to report.';

  $rootScope.isLoaded = true;

  //////////

  
}
}());
