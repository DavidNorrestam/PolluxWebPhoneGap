(function (window) {
  'use strict';

  var adapterCallback = function(context, callback) {
    if (typeof callback === 'function') {
      callback(context);
    }
  };

  var executeFunctionByName = function(functionName, context /*, args */) {
    var args       = [].slice.call(arguments).splice(2);
    var namespaces = functionName.split('.');
    var func       = namespaces.pop();
    for(var i = 0; i < namespaces.length; i++) {
      context = context[namespaces[i]];
    }
    return context[func].apply(this, args);
  }

  var debug = function(msg) {
    if (typeof console == 'undefined' || typeof console.log == 'undefined') {
      return;
    }

    if (typeof msg !== 'string' && typeof JSON !== 'undefined') {
      msg = JSON.stringify(msg);
    }

    console.log('DEBUG: ' + msg);
  };

  var PolluxDeviceFactory = function() {
    debug('Running in webbrowser');
    device = new WebDeviceAdapter();
    return device;
  };

  var PhoneGapDeviceAdapter = function(callback) {
    var self        = this;
    self.deviceType = 'phonegap';
    self.phonegap   = window.parent;

    self.requestCamera = function(callbackName) {
      debug('webclient, bridge: requestCamera');
      self.send('camera', callbackName);
    };

    self.uploadImage = function(callbackName) {
      debug('webclient, bridge: requestImage');
      self.send('image', callbackName);
    };

    self.getGeoLocation = function(callbackName) {
      self.send('geolocation', callbackName);
    };

    self.deviceCallback = function(data, callbackName) {
      executeFunctionByName(callbackName, window, data);
    };

    self.send = function(requestType, callbackName) {
      var jsonRequest = JSON.stringify({
        type:         requestType,
        callbackName: callbackName
      });
      self.phonegap.postMessage(jsonRequest, 'file://');
    };

    adapterCallback(self, callback);
    return self;
  };

  var WebDeviceAdapter = function(callback) {
    var self        = this;
    self.deviceType = 'web';

    navigator.getUserMedia = (navigator.getUserMedia       ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia    ||
                              navigator.msGetUserMedia);

    self.uploadImage = function() {
      $('#fileUpload').click();
      
      $('#fileUpload').change(function(){
        var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.jpg|.jpeg|.gif|.png|.bmp)$/;
        if (regex.test($(this).val().toLowerCase())) {
          if (typeof (FileReader) != "undefined") {
            var reader = new FileReader();
            reader.onload = function (e) {
              $("#captured-image").attr("src", e.target.result);
            }
            reader.readAsDataURL($(this)[0].files[0]);
          } else {
            alert("This browser does not support FileReader.");
          }
      } else {
          alert("Please upload a valid image file.");
        }
      });
    };

    self.requestCamera = function(callbackName) {
      
      var takePicture = function(video) {
        overlay("Capture", "capture-from-video", function(){
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          self.deviceCallback(canvas.toDataURL('image/webp'), callbackName);
        });
      };

      var streamVideo = function(callback){
        if (navigator.getUserMedia) {
          navigator.getUserMedia(
            // constraints
            {
              video: true,
              audio: false
            },
            // successCallback
            function(stream) {
              var vendorUrl = window.URL || window.webkitURL;
              var src       = vendorUrl.createObjectURL(stream);
              callback(src, stream);
            },
            // errorCallback
            function(err) {
            }
          );
        } else {
        }
      };

      var overlay = function(overlayText, id, callback){

        var id         = id;
        var overlayTag = '<a href="#" class="video-overlay" id="' + id + '">' + overlayText + '</a>';
        var video      = document.querySelector("#captured-video");
        $(video).after(overlayTag);
        $('#' + id).click(function(e) {
          if(typeof callback !== 'undefined'){
            callback();
          }
          e.preventDefault();
          video.src="";
          $('#' + id).remove();
        });
      };

      var id      = 'captured-image-canvas';
      var canvas  = document.querySelector(id);
      var body    = null;
      var element = null;
      var ctx     = null;

      if (canvas === null) {
        body   = document.querySelector('body');
        canvas = document.createElement('canvas');
        canvas.id            = id;
        canvas.style.display = 'none';
        body.appendChild(canvas);
      }
      ctx = canvas.getContext('2d');
      
      streamVideo(function(src, stream) {
        var video = document.querySelector('#captured-video');
        video.src = src;
        video.play();

        takePicture(video);
      });
    };

    self.getGeoLocation = function(callbackName) {
      navigator.geolocation.getCurrentPosition(function(geolocation){
        var locationJSON = {
          longitude: geolocation.coords.longitude,
          latitude: geolocation.coords.latitude
        };
        deviceCallback(JSON.stringify(locationJSON), callbackName);
      });
    };

    self.deviceCallback = function(data, callbackName) {
      executeFunctionByName(callbackName, window, data);
    };

    adapterCallback(self, callback);
    return self;
  };

  var Pollux = function(device) {
    var self    = this;
    self.device = null;

     // Called when running on PhoneGap
    self.setDevice = function(deviceName, callback) {
      if (deviceName === 'phonegap') {
        self.device = new PhoneGapDeviceAdapter(callback);
        debug('web client, device: set to PhoneGapDevice');
      } else if (deviceName === 'web') {
        self.device = new WebDeviceAdapter(callback);
        debug('web client, device: set to WebDevice');
      }
      return self.device;
    };
    $(document).ready(function () {  
      self.device = new PolluxDeviceFactory();
      return self;
    });
  };
  window.Pollux = new Pollux();
}(window));
