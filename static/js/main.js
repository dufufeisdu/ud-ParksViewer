//if cannot find user location, use this data instead
const fakeData = [];
class User {
	constructor(map, position) {
		this.position = position;
		this.marker = new google.maps.Marker({
			position: position,
			map: map,
			title: "You are here!"
		});
		this.infoWindow = new google.maps.InfoWindow({
			position: this.position
		});

		this.addressDetail = ko.observable("");
		this.address = new Promise((reslove, reject) => {
			let geocoder = new google.maps.Geocoder;
			geocoder.geocode({ 'location': this.position },
				(results, status) => {
					if (status === 'OK') {
						if (results[1]) {
							reslove(results);
						} else {
							reject('No results found');
						}
					} else {
						reject('Geocoder failed due to: ' + status);
					}
				});
		});
		this.address.then((data) => {
			this.infoWindow.setContent(
				`<p>Start From ${data[1].formatted_address}</p>
				 <img class="img-thumbnail img-fluid" style="max-width:50%; height=auto"
					src="static/images/user.jpg">
				`);
			this.addressDetail(data[1].formatted_address);
			this.marker.addListener('click', () => {
				if (this.marker != this.infoWindow.marker) {
					this.infoWindow.open(map, this.marker);
				}
			});
		}).catch((reason) => {
			console.log(reason);
		})
	}
}
class Park {
	constructor(park) {
	}
}
class ViewModel {
	constructor() {

	}
}
function initMap() {
	//add #map's height property before render the map data.
	//This is the way to use bootstrap and google map.
	//Maybe there is another better way?
	//tried resize of google map,css set 100% height...
	//but map size is the same as search div
	$('#map').css("height", window.screen.height)


	//1 get current user position use new html5 feature
	let nav;
	if (navigator.geolocation) {
		nav = new Promise((success, error) => {
			navigator.geolocation.getCurrentPosition(success, error);
		});
		nav.then((data) => {
			let position = new google.maps.LatLng(data.coords.latitude, data.coords.longitude);
			let map = new google.maps.Map(document.getElementById('map'), {
				center: position,
				zoom: 13
			});
			let user = new User(map, position);
			ko.applyBindings(user);
		}).catch((error) => {
			//1 network disconnect
			//2 server return bad result
			console.log(error);
		})
		//2 grab the data of parks near the user

		//3 render the map with marks
	} else {
		//1. user reject to use their location
		//2. browser do not support this feature
		//3. network connect error
		console.log('not supported');
	}



}

