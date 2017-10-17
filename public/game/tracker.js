var sl = {};
sl.tracking = {
  //Config Settings
  config: {
    script_id: "sltracker",
    uuid_cookie_name: "secondlife_trk_uuid",
    debug: false
  },

  data: {
    uuid: "",          //Pixel - Unique ID (Cookie or Create)
    agent_id: "",      //Pixel - Agent ID (passed in)
    session_id: "",    //Pixel - Session ID (passed in)
    referrer: "",      //Pixel - Document Referrer
    current_url: "",   //Pixel - Current URL
    ip_address: "",    //Pixel - IP Address (passed in) OR from /log
    keywords: "",      //Pixel - Keywords (passed in)
    cookies: "",       //Pixel - Current Cookies
    google_gclid: "",  //Pixel - VENDOR: Google Click ID
    gamespipe_id1: "", //Pixel - VENDOR: GamesPipe Content ID
    gamespipe_id2: "", //Pixel - VENDOR: GamesPipe Campaign ID
    gamespipe_id3: "", //Pixel - VENDOR: GamesPipe Sub ID
      
    pikoya_id: ""
  },

  // Init The Magic
  init: function() {
    //Get all the pixel tracking data
    this.data.uuid        = this.uuid();
    this.data.referrer    = encodeURIComponent( document.referrer );
    this.data.agent_id    = this.helper.getData("agentid", "aid")   || window.ensighten_agentid  || "";
    this.data.session_id  = this.helper.getData("sessionid", "sid") || window.ensighten_sessionid || "";
    this.data.ip_address  = this.helper.getData("ipaddress", "ip")  || window.ensighten_ipaddress || "";
    this.data.keywords    = this.helper.getData("keywords", "kw")   || window.ensighten_keywords  || "";

    //Get vendor data
    this.vendors.init();

    //Log data
    this.logit();

    //Debugging
    if( sl.tracking.config.debug ) {
      console.log('config', this.config);
      console.log('data', this.data);
      console.log('uuid', this.uuid());
    }
  },

  logit: function() {
    var script_url = sl.tracking.helper.getAttr('src');
    var root_url = script_url.substring(0, script_url.lastIndexOf("/"));

    //Get these every logit() call. This will make it a bit cleaner
    //when a website wants to create multiple logs based on url hash values
    this.data.current_url = encodeURIComponent( location.href );
    this.data.cookies     = encodeURIComponent( document.cookie );    
    if( sl.tracking.config.debug ) { console.log('root_url', root_url); }
    sl.tracking.helper.post(root_url+'/log', this.data, function( results ) {
      if( sl.tracking.config.debug ) { console.log('return data', results); }
    });
  },

  // Unique User ID Creator
  uuid: function() {
    id = this.cookies.get( this.config.uuid_cookie_name );

    if ( !id ) {
      id =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });

      sl.tracking.cookies.set( this.config.uuid_cookie_name, id, 3650);
    }

    return id;
  },

  //Get all relevent vendor data for tracking
  vendors: {
    init: function() {
      this.googleAdwords();
      this.gamesPipe();
      this.pikoya();
    },

    googleAdwords: function() {
      //Get the Google click id value
      //based on information obtained from Googles documentation:
      //Part 2 of https://support.google.com/adwords/answer/2998031#setupoct
      var gclid = sl.tracking.helper.getParam('gclid');

      if( gclid ) {
        var gclsrc = sl.tracking.helper.getParam('gclsrc');
        if(!gclsrc || gclsrc.indexOf('aw') !== -1){
            sl.tracking.data.google_gclid = gclid;
        }
      }
    },

    gamesPipe: function() {
      // Get the GamesPipe tracking id values. Example:
      // go.sl.com?utm_source=gamespipe&utm_content=TRACKING_ID1&utm_campaign=TRACKING_ID2&utm_content2=SUB_ID
      var source = sl.tracking.helper.getParam('utm_source');

      if( source == 'gamespipe' ) {
        sl.tracking.data.gamespipe_id1 = sl.tracking.helper.getParam('utm_content');
        sl.tracking.data.gamespipe_id2 = sl.tracking.helper.getParam('utm_campaign');
        sl.tracking.data.gamespipe_id3 = sl.tracking.helper.getParam('utm_content2');
      }
    },
    
    pikoya: function() {
      // Get the Pikoya tracking id values. Example:
      //http://www.secondlife.com/landing/avatar/?utm_source=Pikoya&utm_medium=728x90eng&utm_content=B000308
      var source = sl.tracking.helper.getParam('utm_source');

      if( source == 'Pikoya' ) {
        sl.tracking.data.pikoya_id = sl.tracking.helper.getParam('utm_content1');
      }
    }
  },

  // Get/Set Cookies
  cookies: {
    set: function(name, value, days) {
      var domain, domainParts, date, expires, host;

      if (days) {
         date = new Date();
         date.setTime(date.getTime()+(days*24*60*60*1000));
         expires = "; expires="+date.toGMTString();
      } else {
         expires = "";
      }

      host = location.host;
      cookieToken = '';
      if (host.split('.').length === 1) {
         // no "." in a domain - it's localhost or something similar
         cookieToken = name+"="+value+expires+"; path=/";
         document.cookie = cookieToken;
      } else {
         // Remember the cookie on all subdomains.
         domainParts = host.split('.');
         domainParts.shift();
         domain = '.'+domainParts.join('.');

         cookieToken = name+"="+value+expires+"; path=/; domain="+domain;
         document.cookie = cookieToken;

         // check if cookie was successfuly set to the given domain
         // (otherwise it was a Top-Level Domain)
         if (this.get(name) == null || this.get(name) != value)
         {
            // append "." to current domain
            domain = '.'+host;
            cookieToken = name+"="+value+expires+"; path=/; domain="+domain;
            document.cookie = cookieToken;
         }
      }

      if( sl.tracking.config.debug ) { console.log("Cookie Token: ", cookieToken); }
    },

    get: function(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (var i=0; i < ca.length; i++) {
         var c = ca[i];
         while (c.charAt(0)==' ') {
            c = c.substring(1,c.length);
         }

         if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }

      return null;
    }
  },

  helper: {
    getData: function(name, alt_name) {
      return this.getAttr("data-"+name) || this.getAttr("data-"+alt_name);
    },

    getAttr: function(name) {
      var elm = document.getElementById(sl.tracking.config.script_id);
      var ret = null;
      if( elm ) {
        ret = elm.getAttribute(name);
      }

      if( sl.tracking.config.debug ) {
        console.log('getAttr:'+name, ret);
      }
      return ret;
    },

    getParam: function(p){
      var match = RegExp('[?&]' + p + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    },

    post: function(url, data, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', encodeURI(url));
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onload = function() { callback( xhr ); };
      xhr.send( this.postParams(data) );
    },

    postParams: function (object) {
      var encodedString = '';
      for (var prop in object) {
          if (object.hasOwnProperty(prop)) {
              if (encodedString.length > 0) {
                  encodedString += '&';
              }
              encodedString += encodeURI(prop + '=' + object[prop]);
          }
      }

      return encodedString;
    }
  }
}

// Make Magic Happen
sl.tracking.init();
