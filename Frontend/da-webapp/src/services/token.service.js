/*
Copyright 2016 The Eyra Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

File author/s:
    Matthias Petursson <oldschool01123@gmail.com>
*/

(function () {
// service to query and process tokens from server

'use strict';

angular.module('daApp')
  .factory('tokenService', tokenService);

tokenService.$inject = ['$q',
                        'deliveryService',
                        'logger',
                        'myLocalForageService',
                        'utilityService'];

function tokenService($q, deliveryService, logger, myLocalForageService, utilityService) {
  var tokenHandler = {};
  var delService = deliveryService;
  var lfService = myLocalForageService;
  var util = utilityService;

  tokenHandler.clearTokens = clearTokens;
  tokenHandler.countAvailableTokens = countAvailableTokens;
  tokenHandler.getTokens = getTokens;
  tokenHandler.nextToken = nextToken;

  return tokenHandler;

  //////////

  // dev function, delete all non-read tokens from local forage database.
  function clearTokens() {
    return lfService.getItem('minFreeTokenIdx').then(
      function success(idx){
        var promises = [];
        if (idx){
          for (var i = 0; i <= idx; i++) {
            promises.push(
              lfService.removeItem('tokens/'+i)
                .then(angular.noop, util.stdErrCallback)
            );
          }
        }
        promises.push(
          lfService.setItem('minFreeTokenIdx', 0)
            .then(angular.noop, util.stdErrCallback)
        );
        return $q.all(promises);
      },
      util.stdErrCallback
    );
  }

  // returns promise, number of tokens in local db, 0 if no tokens
  function countAvailableTokens() {
    var isAvail = $q.defer();
    lfService.getItem('minFreeTokenIdx').then(
      function success(idx){
        if (idx && idx >= 0) {
          isAvail.resolve(idx + 1);
        } else {
          isAvail.resolve(0);
        }
      },
      function error(response){
        isAvail.reject(response);
      }
    );
    return isAvail.promise;
  }

  // returns promise, 
  function getTokens(numTokens) {
    var tokensPromise = $q.defer();
    // query server for tokens
    delService.getTokens(numTokens)
    .then(
      function success(response) {
        // seems like response is automatically parsed as JSON for us

        // some validation of 'data'
        var tokens = response.data;
        if (tokens && tokens.length > 0) {
          saveTokens(tokens, tokensPromise); // save to local forage
        } else {
          tokensPromise.reject('Tokens from server not on right format or empty.');
        }
      },
      function error(data) {
        tokensPromise.reject(data);
      }
    );
    return tokensPromise.promise;
  }

  function nextToken() {
    var next = $q.defer();
    lfService.getItem('minFreeTokenIdx').then(function(value) {
      logger.log('Local db index: ' + value);

      var minFreeIdx = value === -1 ? 0 : (value || 0);
      lfService.getItem('tokens/' + minFreeIdx).then(function(value){
        if (value) {
          next.resolve(value);
        } else {
          next.resolve({'id':0, 'token':'No more tokens. Restart app with internet connection for more.'});
        }

        // update our minFreeIdx
        if (minFreeIdx > -1) minFreeIdx--;
        lfService.setItem('minFreeTokenIdx', minFreeIdx).then(function(value){
          // don't delete token until we have updated the index, then if
          // user exits browser after get but before update of index,
          // at least it will still show the last token.
          lfService.removeItem('tokens/' + (minFreeIdx+1))
            .then(angular.noop, util.stdErrCallback);
        },
        util.stdErrCallback);
      },
      util.stdErrCallback);
    },
    util.stdErrCallback);
    return next.promise;
  }

  // save tokens locally. tokens should be on format depicted in getTokens in client-server API
  // should not be called with tokens.length===0
  // tokensPromise is an angular q.defer(), resolved with tokens on completion of save
  function saveTokens(tokens, tokensPromise) {
    lfService.getItem('minFreeTokenIdx').then(function(value) {
      var minFreeIdx = value === -1 ? 0 : (value || 0);
      var oldMinFreeIdx = minFreeIdx;

      var finishedPromises = []; // promises to wait for until we can say this saveTokens is finished
      for (var i = 0; i < tokens.length; i++) {
        finishedPromises.push(
          lfService.setItem('tokens/' + minFreeIdx, tokens[i])
        );
        minFreeIdx++;
      }

      // update our minFreeIdx to reflect newly input tokens, 0 counts as 1, so only add length-1
      finishedPromises.push(
        lfService.setItem('minFreeTokenIdx', oldMinFreeIdx + (tokens.length - 1))
      );

      $q.all(finishedPromises).then(function(val){
        tokensPromise.resolve(tokens);
      },
      function error(data){
        tokensPromise.reject(data);
      });
    },
    function error(data){
        tokensPromise.reject(data);
    });
  }
}
}());
