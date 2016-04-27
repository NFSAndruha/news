angular.module('starter', ['ionic', 'ui.router', 'ngCordova'])

    .run(function ($ionicPlatform, $rootScope, $cordovaFile) {
      $ionicPlatform.ready(function () {
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
          cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
          StatusBar.styleDefault();
        }
        $rootScope.favorites = [];

        $cordovaFile.checkFile(cordova.file.dataDirectory, "favorites.txt")
            .then(function (success) {
              readFile();
            }, function (error) {
              console.log(error);
              $cordovaFile.createFile(cordova.file.dataDirectory, "favorites.txt", true)
                  .then(function (success) {
                    console.log(success);
                    readFile();
                  }, function (error) {
                    console.log(error);
                  });
            });

        function readFile() {
          $cordovaFile.readAsText(cordova.file.dataDirectory, "favorites.txt")
              .then(function (success) {
                if (!success.length) return;
                $rootScope.favorites = angular.fromJson(success);
              }, function (error) {
                console.log(error);
              });
        }


      });
    })

    .config(function ($stateProvider, $urlRouterProvider) {
      $urlRouterProvider.otherwise("/");

      $stateProvider
          .state('news', {
            url: "/",
            templateUrl: "./template/news.html"
          })
          .state('favorite', {
            cache: false,
            url: "/favorite",
            templateUrl: "./template/favorite.html"
          })
          .state('fullstory', {
            cache: false,
            url: "/:taskUrl",
            templateUrl: "./template/fullstory.html",
            controller: "NewsList"
          });
    })
    .controller('NewsList', [
      '$rootScope', '$scope', '$state', '$stateParams',
      '$ionicLoading', '$ionicPlatform',
      '$cordovaFile', '$cordovaToast', '$cordovaSocialSharing',
      'NewsService',
      function ($rootScope, $scope, $state, $stateParams,
                $ionicLoading, $ionicPlatform,
                $cordovaFile, $cordovaToast, $cordovaSocialSharing,
                NewsService) {
        var taskUrl = $stateParams.taskUrl;
        $scope.fsort = '';

        init();
        function init() {
          if (!taskUrl) return getNews();

          getFullstory(taskUrl);
        }

        function saveFavorite() {
          $cordovaFile.writeFile(cordova.file.dataDirectory, "favorites.txt", $rootScope.favorites, true)
              .then(function (success) {
                console.log(success);
              }, function (error) {
                console.log(error);
              });
        }

        function getNews() {
          $ionicLoading.show({
            template: '<ion-spinner icon="android"></ion-spinner>'
          });

          $scope.news = [];
          NewsService.getNews()
              .then(function (ok) {
                var res = ok[0].news;
                for (var i in res) {
                  if (res[i].url.indexOf('tjournal') === -1) continue;

                  res[i].picture = (!res[i].preview_img)
                      ? 'http://www.thinksamui.com/modules/flexi/images/no-image.jpg'
                      : res[i].preview_img;

                  $scope.news.push(res[i]);
                }

              }, function (err) {
                console.log(err);
              })
              .finally(function () {
                $ionicLoading.hide();

                $scope.$broadcast('scroll.refreshComplete');
              });
        }

        function getFullstory(taskUrl) {
          NewsService.getNewsFull(taskUrl)
              .then(function (ok) {
                $scope.fullStory = ok.data;

                $scope.fullStory.picture = ($scope.fullStory.cover.url.indexOf('.jpg') === -1)
                    ? 'http://www.thinksamui.com/modules/flexi/images/no-image.jpg'
                    : $scope.fullStory.cover.url;

              }, function (err) {
                console.log(err);
              });
        }

        $scope.isNews = function () {
          return $state.is('news');
        };

        $scope.isFavorite = function () {
          return $state.is('favorite');
        };

        $scope.openFullStory = function (news) {
          $state.go('fullstory', {taskUrl: news.url});
        };

        $scope.refresh = function () {
          getNews();
        };

        $scope.deleteFavorite = function (news) {
          for (var i = 0; i < $rootScope.favorites.length; i++) {
            if ($rootScope.favorites[i].url == news.url) {
              $cordovaToast.show('Видалено з обраних!', 'long', 'center');
              saveFavorite();
              return $rootScope.favorites.splice(i, 1);
            }
          }
        };

        $scope.checkFavorite = function (news) {
          for (var i = 0; i < $rootScope.favorites.length; i++) {
            if ($rootScope.favorites[i].url == news.url) {
              return true;
            }
          }
          return false;
        };

        $scope.saveAsFavorite = function (news) {
          if (news.cover)
            news.picture = (news.cover.url.indexOf('.jpg') === -1)
                ? 'http://www.thinksamui.com/modules/flexi/images/no-image.jpg'
                : news.cover.url;
          $rootScope.favorites.unshift(news);
          $cordovaToast.show('Додано в обранi!', 'long', 'center');
          saveFavorite();
        };

        $scope.saveAsFavoriteWithPrepare = function (news) {
          if (news.cover)
            news.picture = (news.cover.url.indexOf('.jpg') === -1)
                ? 'http://www.thinksamui.com/modules/flexi/images/no-image.jpg'
                : news.cover.url;
          $rootScope.favorites.unshift(news);
          $cordovaToast.show('Додано в обранi!', 'long', 'center');
          saveFavorite();
        };

        $scope.showShareOptions = function (news) {
          var message = news.title + ' : ' + news.url;
          $cordovaSocialSharing
              .share(message, 'News', null, null) // Share via native share sheet
              .then(function (result) {
              }, function (err) {
                console.log(err);
              });
        }

      }])

    .service('NewsService', ['$http', '$q', function ($http, $q) {
      var service = {
        getNews: function () {
          var defer = $q.defer();

          $http.get('https://api.tjournal.ru/2.2/news?listId=1')
              .success(defer.resolve)
              .error(defer.reject);

          return defer.promise;
        },
        getNewsFull: function (newsUrl) {
          var defer = $q.defer();

          $http.get("https://api.tjournal.ru/2.2/content/reveal?url=" + newsUrl)
              .success(defer.resolve)
              .error(defer.reject);

          return defer.promise;
        }
      };
      return service;
    }]);
