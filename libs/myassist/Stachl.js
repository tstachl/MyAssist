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
			requestHeaders: {
				'Accept': 'application/json'
			},
			success: function() {},
			url: '',
			useCache: true,
			requestCounter: 0
		},
		ajax: function(url, options) {
			// If url is an object, simulate pre-1.5 signature
			if ( typeof url === "object" ) {
				options = url;
				url = undefined;
			}

			Stachl.ajaxSettings.requestCounter++;

			// Force options to be an object
			options = options || {};
			
			var
				request, loader, status, progress = {},
				s = Stachl.ajaxSetup({}, options),
				onComplete = function(e) {
					Stachl.utils.trace('onComplete: ' + e);
					if (s.dataFormat != air.URLLoaderDataFormat.BINARY) Stachl.utils.trace(loader.data);
					if (typeof s.complete == 'function')
						s.complete(request, status, e);
					if (status == 200 || status == 201) {
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
					Stachl.utils.trace('onError: ' + e);
					air.Introspector.Console.log(e);
					if (typeof s.error == 'function')
						s.error(request, e.text, status);
				},
				setStatus = function(e) {
					Stachl.utils.trace('setStatus: ' + e);
					status = e.status;
				},
				setProgress = function(e) {
					Stachl.utils.trace('setProgress: ' + e);
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
		
				Stachl.utils.trace((s.url.indexOf('http') === -1 ? s.instance_url + s.url : s.url));
		
		        request = new air.URLRequest((s.url.indexOf('http') === -1 ? s.instance_url + s.url : s.url));
		        Stachl.utils.trace(s.url);
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
		        	Stachl.utils.trace(error);
		            Stachl.utils.trace("Unable to load requested document.");
		        }
			}();
		},
		utils: {
            debug : function() {
                // Forward to the log function
                this.log.apply(this, arguments);
            },
            log : function() {
                if(window.console && window.console.log)
                    window.console.log.apply(this, arguments);
                if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.log)
                    air.Introspector.Console.log.apply(this, arguments);
            },
            warn : function() {
                if(window.console && window.console.warn)
                    window.console.warn.apply(this, arguments);
                if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.warn)
                    air.Introspector.Console.warn.apply(this, arguments);
            },
            info : function() {
                if(window.console && window.console.info)
                    window.console.info.apply(this, arguments);
                if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.info)
                    air.Introspector.Console.info.apply(this, arguments);
            },
            error : function() {
                if(window.console && window.console.error)
                    window.console.error.apply(this, arguments);
                if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.error)
                    air.Introspector.Console.error.apply(this, arguments);
            },
            trace: function() {
                var date = Date.today().setTimeToNow().toString(MyAssist.Settings.Options.logFormat),
                    user = (MyAssist.Settings.User ? MyAssist.Settings.User.get('Name') : 'Unknown');
                                       
                if (air.trace && $.isArray(arguments)) 
                    air.trace.apply(this, arguments);
                    
                fileStream = Stachl.utils.getLogFile();
                $.each(arguments, function(i, argument) {
                    if (argument.toString() == '[object Object]')
                        argument = JSON.stringify(argument);
                    fileStream.writeUTFBytes('[' + date + ' - ' + user + '] ' + argument + "\n");
                });
                fileStream.close();
            },
            getLogFile: function() {
                var file = air.File.applicationStorageDirectory.resolvePath('log.txt');
                if (!MyAssist.Settings.LogStream) {
                    var fileStream = new air.FileStream();
                    MyAssist.Settings.LogStream = new air.FileStream();
                    MyAssist.Settings.LogStream.open(file, air.FileMode.WRITE);
                    return MyAssist.Settings.LogStream;
                }
                MyAssist.Settings.LogStream.open(file, air.FileMode.APPEND);
                return MyAssist.Settings.LogStream;
            },
            logListener: function(e) {
                if (e.shiftKey && e.altKey) {
                    var file = air.File.applicationStorageDirectory.resolvePath('log.txt');
                    file.openWithDefaultApplication();
                }
            },
			nl2br: function(str) {
				return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
			},
			imgBase: function(str, base) {
				if (!str) return '';
				str = $('<div>' + str + '</div>');
				str.find('img').each(function() {
					var me = $(this),
						oWidth = me.attr('width') || me.css('width').substr(0, me.css('width').length - 2),
						oHeight = me.attr('height') || me.css('height').substr(0, me.css('height').length - 2),
						width = 275,
						percent = ((100 / parseInt(oWidth)) * width),
						height = parseInt((parseInt(oHeight) / 100) * percent),
						src = me.attr('src');
					
					
					if (src.indexOf('http') === -1) src = Stachl.ajaxSettings.instance_url + src;
					me.attr('src', src + '&oauth_token=' + Stachl.ajaxSettings.token).addClass('shrunk');
					if (!height) return;
					me.attr('width', width).attr('height', height).css('height', '').css('width', '');
				});
				return str.html();
			},
			fileDownload: function(attachment) {
				var filename = attachment.get('Name'),
					extension = filename.split('.').pop(),
					url = attachment.get('Body'),
					file = air.File.documentsDirectory.resolvePath(filename);
					
				file.browseForSave('Download ' + filename);
				file.addEventListener(air.Event.SELECT, function() {
					$mobile.showPageLoadingMsg();
					if (file.extension != extension) {
						file = new File(file.natviePath + '.' + extension);
					}
					
					Stachl.ajax({
						url: url,
						method: 'GET',
						data: '',
						dataFormat: air.URLLoaderDataFormat.BINARY,
						success: function(data) {
							var fileStream = new air.FileStream();
							fileStream.open(file, air.FileMode.WRITE);
							fileStream.writeBytes(data, 0, data.length);
							fileStream.close();
							file.downloaded = true;
							file.openWithDefaultApplication();
							$mobile.hidePageLoadingMsg();
						}
					});
				});
			},
			tempDownload: function(file) {
			    var temp = air.File.createTempFile();
			    
			    $mobile.showPageLoadingMsg();
			    Stachl.ajax({
			        url: file,
			        method: 'GET',
			        data: '',
			        dataFormat: air.URLLoaderDataFormat.BINARY,
			        success: function(data) {
			            var fileStream = new air.FileStream();
			            fileStream.open(temp, air.FileMode.WRITE);
			            fileStream.writeBytes(data, 0, data.length);
			            fileStream.close();
			            temp.downloaded = true;
			            temp.openWithDefaultApplication();
			            $mobile.hidePageLoadingMsg();
			        }
			    })
			}
		}
	});
	
	$(window).keypress("l", Stachl.utils.logListener);
	
	$.fn.serializeObject = function() {
	    var o = {};
	    var a = this.serializeArray();
	    $.each(a, function() {
	        if (o[this.name] !== undefined) {
	            if (!o[this.name].push) {
	                o[this.name] = [o[this.name]];
	            }
	            o[this.name].push(this.value || '');
	        } else {
	            o[this.name] = this.value || '';
	        }
	    });
	    return o;
	};

})(jQuery, Backbone, _, window, $.mobile);