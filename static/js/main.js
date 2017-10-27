//all markers will be here
let markersAndInfoWindow = [];

class User {
  constructor(map, position) {
    this.position = position;

    this.marker = new google.maps.Marker({
      position: position,
      map: map,
      visible: false,
      animation: google.maps.Animation.DROP,
      title: "You are here!"
    });

    this.infoWindow = new google.maps.InfoWindow({
      position: this.position
    });
    markersAndInfoWindow.push({ marker: this.marker, infoWindow: this.infoWindow });
    this.preferedPlace = ko.observable("parks");

    this.addressDetail = ko.observable("");

    //transfer user geocode to physical address
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


    //grab user address and put the result into the infoWindow
    this.address.then((data) => {

      let fromatAddress = data[0].address_components.reduce((a, b) => {
        return a + '<br>' + b.short_name;
      }, "Current Location: ");

      this.infoWindow.setContent(
        `<p>${fromatAddress}</p>
				 <img class="img-thumbnail img-fluid" style="max-width:100%; height=auto"
					src="static/images/user.jpg">
        `);

      this.addressDetail(data[1].formatted_address);

    }).catch((reason) => {
      this.infoWindow.setContent(
        `<p>${reason}</p>
				`);
    });

    //add clickListener to toggle marker click
    this.marker.addListener('click', () => {
      //close all before handle this marker click
      markersAndInfoWindow.forEach((m) => {
        m.marker.setAnimation(null);
        let inforWindowPointMap = m.infoWindow.getMap();
        //check if the inforWindow is closed or not
        if (inforWindowPointMap !== null && typeof inforWindowPointMap !== "undefined") {
          m.infoWindow.close();
        }
      });
      this.marker.setAnimation(google.maps.Animation.BOUNCE);
      this.infoWindow.open(map, this.marker);
      google.maps.event.addDomListener(window, 'resize', () => {
        this.infoWindow.open(map, this.marker);
      });
    });
    //Just for meeting the spec
    //may add find route function in future, so still need this marker
    // this.marker.setVisible = true;
  }
}



class Park {
  constructor(map, parkInfo) {
    this.name = ko.observable(parkInfo.venue.name);
    this.latlng = new google.maps.LatLng({
      lat: parkInfo.venue.location.lat,
      lng: parkInfo.venue.location.lng
    });
    this.searchTxt = ko.observable("");
    //handle user input, filter match result
    this.showMe = ko.computed(() => {
      let str = this.searchTxt();
      if (str === "") {
        return true;
      } else {
        let reg = new RegExp(str, 'i');
        return reg.test(this.name());
      }
    });

    this.showMe.subscribe((value) => {
      this.marker.setVisible(value);
    });

    this.marker = new google.maps.Marker({
      position: this.latlng,
      map: map,
      animation: google.maps.Animation.DROP,
      title: "This is a park!"
    });
    this.infoWindow = new google.maps.InfoWindow({
      position: this.latlng,
      content: `<p>${this.name()}</p>`
    });
    markersAndInfoWindow.push({ marker: this.marker, infoWindow: this.infoWindow });
    this.marker.addListener('click', () => {
      //close all before handle this marker click
      markersAndInfoWindow.forEach((m) => {
        m.marker.setAnimation(null);
        let inforWindowPointMap = m.infoWindow.getMap();
        //check if the inforWindow is open or not
        if (inforWindowPointMap !== null && typeof inforWindowPointMap !== "undefined") {
          m.infoWindow.close();
        }
      });
      this.marker.setAnimation(google.maps.Animation.BOUNCE);
      this.infoWindow.open(map, this.marker);
    });
    google.maps.event.addDomListener(window, 'resize', () => {
      this.infoWindow.open(map, this.marker);
    });
    this.clickMark = () => {
      new google.maps.event.trigger(this.marker, 'click');
    };

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
      });
    });
    parkArray.forEach((park) => {
      let p = ko.observable(new Park(map, park));
      this.parkList.push(p);
    });

  }
}

let renderMap = (geodata) => {

  let position = new google.maps.LatLng(geodata.coords.latitude, geodata.coords.longitude);
  let map = new google.maps.Map(document.getElementById('map'), {
    center: position,
    zoom: 13
  });
  let user = new User(map, position);

  //2 grab data of parks near the user
  //"https://api.foursquare.com/v2/venues/search?offset=0&limit=50&query=park&ll=37.88,-122.30&radius=40233.60&client_id=JYUMETWMY3XOGHUUK5XCGY3UKDUWUN1TSDIN0AXJF4JNL5AZ&client_secret=ENRZ2VIQLEUWAE14GHYVJ1HECUQ42QZPABXJ5JCXLS44WBQM&v=20171011",
  //use foursquare API get the parks location
  let url = 'https://api.foursquare.com/v2/venues/explore?offset=0&limit=50&query=' +
    user.preferedPlace() + '&ll=' + geodata.coords.latitude + ',' + geodata.coords.longitude +
    '&radius=3000&client_id=JYUMETWMY3XOGHUUK5XCGY3UKDUWUN1TSDIN0AXJF4JNL5AZ' +
    '&client_secret=ENRZ2VIQLEUWAE14GHYVJ1HECUQ42QZPABXJ5JCXLS44WBQM&v=20171011';

  $.ajax({
    url: url,
    jsonp: "callback",
    dataType: "jsonp",
    data: {
      format: "json"
    },
    success: function (responseData) {
      if (responseData.meta.code == 200) {
        let viewModel = new ViewModel(map, user, responseData.response.groups[0].items);
        ko.applyBindings(viewModel);
      } else {
        $('#map').html('Can not grab data from the vender');
      }
    },
    error: function (e) {
      $('#map').html('<h1>Can not grab data from the vender,please check your network</h1>');
    }
  });
};

function initMap() {
  //add #map's height property before render the map data.
  //This is the way to use bootstrap and google map.
  //Maybe there is another better way?
  //tried resize of google map,css set 100% height...
  //but map size is always the same as the left search box
  $('#map').css("height", window.screen.height)


  //1 get current user position by using navigator.geolocation
  let nav;
  if (navigator.geolocation) {
    nav = new Promise((success, error) => {
      navigator.geolocation.getCurrentPosition(success, error);
    });
    //todo:fix no network error when use default data
    nav.then(renderMap)
      .catch((error) => {
        //1.1 network disconnect
        //1.2 server return bad result
        //1.3 user reject to use their location
        if (error.message === "User denied Geolocation") {
          $('#map').html(`<h1>${error.message}, use default data instead</h1>`);
          setTimeout(function () { renderMap(defaultUserLocation) }, 1500);
        } else {
          $('#map').html('<h1>Can not grab data from the vender,please check your network</h1>');
        }
      });
  } else {
    //1. browser do not support this feature
    $('#map').html(`<h1>Browser don't support the geolocation feature, use default data instead</h1>`);
    setTimeout(function () { renderMap(defaultUserLocation) }, 1500);
  }

}

