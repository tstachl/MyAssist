(function($, Backbone, _, window, $mobile) {
	var Stachl = window.Stachl = {};
	$.extend(Stachl, {
		ajaxSetup: function(target, settings) {
			if ( !settings ) {
				// Only one parameter, we extend ajaxSettings
				settings = target;
				target = jQuery.extend(true, Stachl.ajaxSettings, settings);
			} else {
				// target was provided, we extend into it
				jQuery.extend(true, target, Stachl.ajaxSettings, settings);
			}
			// Flatten fields we don't want deep extended
			for( var field in { context: 1, url: 1 } ) {
				if ( field in settings ) {
					target[ field ] = settings[ field ];
				} else if( field in jQuery.ajaxSettings ) {
					target[ field ] = jQuery.ajaxSettings[ field ];
				}
			}
			return target;
		},
		ajaxSettings: {
			instance_url: 'https://na1.salesforce.com',
			cacheResponse: false,
			contentType: 'application/x-www-form-urlencoded',
			complete: function() {},
			data: {},
			dataType: 'text',
			error: function() {},
			followRedirects: true,
			method: 'GET',
			requestHeaders: [{
				'Content-Type': 'text/html'
			}],
			success: function() {},
			url: '',
			useCache: true
		},
		ajax: function(url, options) {
			// If url is an object, simulate pre-1.5 signature
			if ( typeof url === "object" ) {
				options = url;
				url = undefined;
			}
	
			// Force options to be an object
			options = options || {};
			
			var
				request, loader, status, progress = {},
				s = Stachl.ajaxSetup({}, options),
				onComplete = function(e) {
					air.trace('onComplete: ' + e);
					if (s.dataFormat != air.URLLoaderDataFormat.BINARY) air.trace(loader.data);
					if (typeof s.complete == 'function')
						s.complete(request, status, e);
					if (status == 200) {
						if (typeof s.success == 'function')
							s.success(
								(s.dataType.toLowerCase() == 'json' ? $.parseJSON(loader.data) : loader.data),
								status, request
							);
					} else {
						if (typeof s.error == 'function')
							s.error(request, '', status);
					}
				},
				onError = function(e) {
					air.trace('onError: ' + e);
					if (typeof s.error == 'function')
						s.error(request, e.text, status);
				},
				setStatus = function(e) {
					air.trace('setStatus: ' + e);
					status = e.status;
				},
				setProgress = function(e) {
					air.trace('setProgress: ' + e);
					$.extend(progress, {
						bytesLoaded: e.bytesLoaded,
						bytesTotal: e.bytesTotal
					});
				};
				
			return function() {
		        loader = new air.URLLoader();
		        loader.addEventListener(air.Event.COMPLETE, onComplete);
				loader.addEventListener(air.IOErrorEvent.IO_ERROR, onError);
		        loader.addEventListener(air.ProgressEvent.PROGRESS, setProgress);
		        loader.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, onError);
		        loader.addEventListener(air.HTTPStatusEvent.HTTP_STATUS, setStatus);
		        if (typeof s.dataFormat !== 'undefined') loader.dataFormat = s.dataFormat;
		
				air.trace((s.url.indexOf('http') === -1 ? s.instance_url + s.url : s.url));
		
		        request = new air.URLRequest((s.url.indexOf('http') === -1 ? s.instance_url + s.url : s.url));
		        air.trace(s.url);
		        $.extend(request, {
					cacheResponse: s.cacheResponse,
					contentType: s.contentType,
					data: s.data,
					followRedirects: s.followRedirects,
					method: s.method,
					requestHeaders: [],
					useCache: s.useCache
		        });
		        $.each(s.requestHeaders, function(key, value) {
		        	request.requestHeaders.push(new air.URLRequestHeader(key, value))
		        });
		        try {
		            loader.load(request);
		        } catch (error) {
		        	air.trace(error);
		            air.trace("Unable to load requested document.");
		        }
			}();
		},
		loadImage: function(url, func) {
            var loader = new air.URLLoader();
            loader.dataFormat = air.URLLoaderDataFormat.BINARY;
            loader.addEventListener(air.Event.COMPLETE, func);
            
            var request = new air.URLRequest(url);
            $.each(Stachl.ajaxSettings.requestHeaders, function(key, value) {
            	request.requestHeaders.push(new air.URLRequestHeader(key, value));
            });
            loader.load(request);
            return loader;
		},
		image: function(url, func) {
			air.trace(url);
			return Stachl.ajax({
				url: url,
				success: func,
				method: 'GET',
				dataFormat: air.URLLoaderDataFormat.BINARY,
				data: ''
			});
		},
		utils: {
			nl2br: function(str) {
				return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
			},
			imgBase: function(str, base) {
				str = $(str);
				str.find('img').each(function() {
					var me = $(this),
						oWidth = me.attr('width'),
						oHeight = me.attr('height'),
						width = 275,
						height = parseInt((parseInt(oHeight) / 100) * ((100 / parseInt(oWidth)) * width)),
						src = me.attr('src'),
						filename = src.replace(/[^a-z0-9]/ig, ''),
						file = air.File.applicationStorageDirectory.resolvePath(
							'images/' + filename
						);
					
					
					if (src.indexOf('http') === -1) src = Stachl.ajaxSettings.instance_url + src;
					air.trace(src);
					var l = Stachl.loadImage(src, $.proxy(function(e) {
						var loader = air.URLLoader(e.target);
						var stream = new air.FileStream();
						stream.open(this, air.FileMode.WRITE);
						stream.writeBytes(loader.data);
						stream.close();
					}, file));
					
					me.attr('src', 'app-storage:/images/' + filename);
					me.attr('width', width).attr('height', height);
				});
				return str.html();
			}
		}
	});
})(jQuery, Backbone, _, window, $.mobile);