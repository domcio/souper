var unifier = angular.module('unifier', []);

unifier.controller("mainController", function ($scope, $http) {
    $scope.formData = {};

    $http.get('/api/soups')
        .success(function(data) {
            $scope.soups = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    $http.get('/api/images')
        .success(function(data) {
            $scope.images = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    $scope.createSoup = function() {
        $http.post('/api/soups', $scope.formData)
            .success(function(data) {
                $scope.formData = {};
                $scope.soups = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.clearSoups = function() {
	$http.get('/soups/clear')
	   .success(function(data) { 
		$scope.images = []; 
		console.log("Success clearing the soups");
	 }).error(function(error) { console.log("Success clearing the soups"); });
    }

    $scope.deleteSoup = function (id) {
        var sid = $scope.soups[id]._id;
        $scope.soups.splice(id, 1);
        $http.delete('api/soups/' + sid).success(function(data) {
            console.log("Succesfully deleted soup: " + sid);
        }).error(function(data) { console.log ('Error: ' + data); })
    }

    $scope.deleteImage = function(id) {
        $http.delete('api/images/' + id).success(function(data) {
            console.log("Succesfully deleted image: " + id);
        }).error(function(data) { console.log ('Error: ' + data); })
    }
});

