/*
* psychedelizer.0x80.ru
* app.js (c) Mikhail Mezyakov <mihail265@gmail.com>
* 
* Angular application init file
*/

var app = angular.module('Psychedelizer', ['angularFileUpload']);

app.controller('HomeCtrl', function($scope, $http, $upload) {
    function get_latest(sort_by) {
        $http({
            url: '/api/get_latest',
            method: 'get'
        }).success(function(data) {
            var images = []
            
            if (!sort_by || (sort_by && sort_by == data.sort_by)) {
                if ($scope.latest_images) {
                    $scope.latest_images.map(function(item) {
                        images.push(item.src);
                    });
                }
                else {
                    $scope.latest_images = [];
                }
            
                var new_items = [];

                data.images.map(function(item) {
                    if (images.indexOf(item.src) == -1) {
                        if (images.length) {
                            $scope.insert_image(item);
                        }
                        else {
                            $scope.latest_images.push(item);
                        }
                    }
                });
            }
            else {
                $scope.latest_images = data.images;
            }
            
            if (data.client_ip != $scope.client_ip) {
                $scope.client_ip = data.client_ip;
            }
            
            if (data.sort_criterias != $scope.sort_criterias) {
                $scope.sort_criterias = data.sort_criterias;
            }
        })
    }
    
    function get_filters() {
        $http({
            url: '/api/get_filters',
            method: 'get'
        }).success(function(data) {
            $scope.image_filters = data.filters;
        })
    }
    
    function init_websocket() {
        var ws_addr = 'ws://'+location.hostname+':'+location.port+'/updates';
        $scope.ws = new WebSocket(ws_addr);
        
        $scope.ws.onmessage = function (evt) {
            var data = angular.fromJson(evt.data);
            
            if (data.new_image) {
                $scope.insert_image(data.new_image);
            }
        };
    }
    
    function init_ajaxupdater() {
        $scope.get_latest_descriptor = setInterval(get_latest, 1500);
    }
    
    $scope.sort_by = 'new';
    
    get_latest();
    get_filters();
    //init_websocket();
    init_ajaxupdater();
    
    $scope.clean = function() {
        $scope.original = false;
        $scope.preview = false;
        $scope.selected = [];
    }
    
    $scope.file_selected = function($files) {
        var file = $files[0];
        
        $scope.loading_image = true;
        
        $scope.upload = $upload.upload({
            url: '/api/upload',
            method: 'post',
            file: file
          
        }).success(function(data) {
            $scope.original = data.original;
            $scope.preview = data.preview;
            
            $scope.internet_input = false;
            $scope.url = '';
            
            $scope.loading_image = false;
        });
      
    }

    $scope.loading_image = false;
    $scope.$watch('url', function() {
        $scope.enable_upload_button = $scope.url && $scope.url.match(/^http(.*)\.(jpg|jpeg|png)$/i)
    });
    
    $scope.internet_upload = function() {
        if ($scope.enable_upload_button && !$scope.loading_image) {
            $scope.loading_image = true;
            
            $http({
                url: '/api/upload',
                method: 'post',
                data: {url: $scope.url}
            }).success(function(data) {
                $scope.original = data.original;
                $scope.preview = data.preview;
                
                $scope.internet_input = false;
                $scope.url = '';
                
                $scope.loading_image = false;
            })
        }
        else {
            // show some message
        }
    }
    
    $scope.internet_input_toggle = function() {
        if ($scope.internet_input) {
            $scope.internet_input = false;
        }
        else {
            $scope.internet_input = true;
        }
    }
    
    $scope.selected = [];
    
    $scope.select_filter = function(filter) {
        $scope.loading = true;
      
        if (!$scope.filter_in_selected(filter)) {
            $scope.selected.push(filter);
        }
        else {
            $scope.selected.splice($scope.selected.indexOf(filter), 1);
        }
        
        $http({
            url: '/api/preview',
            method: 'post',
            data: {
                preview: $scope.preview, 
                original: $scope.original,
                filters: $scope.selected,
                combine: $scope.use_pattern,
            }
        }).success(function(data) {
            $scope.preview = data.preview;
            $scope.loading = false;
        })
    }
    
    $scope.filter_in_selected = function(filter) {
        if ($scope.selected.indexOf(filter) == -1) {
            return false;
        }
        else {
            return true;
        }
    }
    
    $scope.save = function() {
        if ($scope.selected.length) {
            $http({
                url: '/api/save',
                method: 'post',
                data: {image: $scope.preview}
            }).success(function(data) {
                $scope.saved_image = data.new_image;
                $scope.clean();
            })
        }
    }
    
    $scope.insert_image = function(image) {
        image.created = true;
        
        $scope.latest_images.unshift(image);
        
        setTimeout(
            function() {
                var index = $scope.latest_images.indexOf(image);
                $scope.latest_images[index].created = false;
                $scope.$apply();
            },
            400
        );
    }
    
    $scope.use_pattern = false;
    
    $scope.like = function(image) {
        $http({
            url: '/api/like',
            method: 'post',
            data: {image: image}
        }).success(function(data) {
            var index = $scope.latest_images.indexOf(image);
            $scope.latest_images[index].likes = data.likes;
        })
    }
    
    $scope.show_likes = false;
    
    $scope.set_sort_by = function(criteria) {
        switch (criteria) {
            case 'new':
                if ($scope.sort_by != criteria) {
                    $scope.show_likes = false;
                  
                    get_latest($scope.sort_by);
                    $scope.sort_by = criteria;
                    init_ajaxupdater();
                }
                break;
            case 'best':
            default:
                if ($scope.sort_by != criteria) {
                    $scope.sort_by = criteria;
                    clearInterval($scope.get_latest_descriptor);
                    
                    $http({
                        url: '/api/get_latest',
                        method: 'post',
                        data: {sort_by: criteria}
                    }).success(function(data) {
                        $scope.latest_images = data.images;
                        $scope.show_likes = true;
                    })
                }
        }
    }
    
});