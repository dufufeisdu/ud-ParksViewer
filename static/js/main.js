//if cannot find user location, use this data instead


class User {
  constructor(map, position) {
    this.position = position;
    this.marker = new google.maps.Marker({
      position: position,
      map: map,
      animation: google.maps.Animation.BOUNCE,
      title: "You are here!"
    });
    this.infoWindow = new google.maps.InfoWindow({
      position: this.position
    });
    this.preferedPlace = ko.observable("parks");
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
    }).catch((reason) => {
      console.log(reason);
    });
    this.marker.addListener('click', () => {
      if (this.marker.getAnimation() !== null) {
        this.marker.setAnimation(null);
        this.infoWindow.open(map, this.marker);
      } else {
        this.infoWindow.close();
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
      }
    });
  }
}



class Park {
  constructor(map, parkInfo) {
    this.name = ko.observable(parkInfo.name);
    this.searchTxt = ko.observable("");
    this.showMe = ko.computed(() => {
      let str = this.searchTxt();
      if (str === "") {
        return true;
      } else {
        let reg = new RegExp(str, 'i');
        return reg.test(parkInfo.name);
      }
    });
    this.showMe.subscribe((value) => {
      this.marker.setVisible(value);
    })
    this.marker = new google.maps.Marker({
      position: parkInfo.geometry.location,
      map: map,
      animation: google.maps.Animation.DROP,
      title: "This is a park!"
    });
    this.infoWindow = new google.maps.InfoWindow({
      position: parkInfo.geometry.location,
      content: `<p>${this.name()}</p>`
    });
    this.marker.addListener('click', () => {
      if (this.marker.getAnimation() !== null) {
        this.marker.setAnimation(null);
        this.infoWindow.close();
      } else {
        this.infoWindow.open(map, this.marker);
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
      }
    });
    this.clickMark = () => {
      new google.maps.event.trigger(this.marker, 'click');
    }

  }
}



class ViewModel {
  constructor(map, user, parkArray) {
    this.user = ko.observable(user);
    this.parkList = ko.observableArray([]);
    this.inputText = ko.observable("");
    this.inputText.subscribe((newValue) => {
      this.parkList().forEach((parkObsv) => {
        parkObsv().searchTxt(newValue);
      })
    });
    parkArray.forEach((park) => {
      let p = ko.observable(new Park(map, park));
      this.parkList.push(p);
    });

  }
}

let renderMap = (data) => {

  let position = new google.maps.LatLng(data.coords.latitude, data.coords.longitude);
  let map = new google.maps.Map(document.getElementById('map'), {
    center: position,
    zoom: 13
  });
  let user = new User(map, position);

  //2 grab data of parks near the user
  let service = new google.maps.places.PlacesService(map);
  user.address.then((data) => {
    let request = {
      location: user.position,
      query: user.preferedPlace() + " near " + data[1].formatted_address
    }
    service.textSearch(request, (result, status) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        let viewModel = new ViewModel(map, user, result);
        ko.applyBindings(viewModel);
      } else {
        $('#map').html(status.message);
      }
    });
  })
}

function initMap() {
  //add #map's height property before render the map data.
  //This is the way to use bootstrap and google map.
  //Maybe there is another better way?
  //tried resize of google map,css set 100% height...
  //but map size is the same as search div
  $('#map').css("height", window.screen.height)


  //1 get current user position by using navigator.geolocation
  let nav;
  if (navigator.geolocation) {
    nav = new Promise((success, error) => {
      navigator.geolocation.getCurrentPosition(success, error);
    });
    nav.then(renderMap)
      .catch((error) => {
        //1.1 network disconnect
        //1.2 server return bad result
        //1.3 user reject to use their location
        if (error.message === "User denied Geolocation") {
          $('#map').html(`<h1>${error.message}, use default data instead</h1>`);
          setTimeout(function () { renderMap(defaultUserLocation) }, 1000);
        } else {
          $('#map').html(`<h1>${error.message}</h1>`);
        }
      });
  } else {
    //1. browser do not support this feature
    $('#map').html(`<h1>Browser don't support the geolocation feature, use default data instead</h1>`);
    setTimeout(function () { renderMap(defaultUserLocation) }, 1000);
  }



}

