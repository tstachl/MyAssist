(function() {
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
					air.trace(loader.data);
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
		}
	});
	
	_.template = function(tmp) {
		return function(data) {
			return Mustache.to_html(tmp, data);
		}
	};
	
	var methodMap = {
		'create': 'POST',
		'update': 'PATCH',
		'delete': 'DELETE',
		'read': 'GET'
	};
	
	Backbone.sync = function(method, model, options) {
		var type = methodMap[method];
		
		// Default JSON-request options.
		var params = _.extend({
			type:         type,
			dataType:     'json'
		}, options);
		
		// Ensure that we have a URL.
		if (!params.url) {
			if (typeof model.url == 'function')
				params.url = '/services/data/v20.0/sobjects/' + model.url();
			
		}
		
		// Ensure that we have the appropriate request data.
		if (!params.data && model && (method == 'create' || method == 'update')) {
			params.contentType = 'application/json';
			params.data = JSON.stringify(model.toJSON());
		}
		
		// For older servers, emulate JSON by encoding the request into an HTML-form.
		if (Backbone.emulateJSON) {
			params.contentType = 'application/x-www-form-urlencoded';
			params.data        = params.data ? {model : params.data} : {};
		}
		
		// For older servers, emulate HTTP by mimicking the HTTP method with `_method`
		// And an `X-HTTP-Method-Override` header.
		if (Backbone.emulateHTTP) {
			if (type === 'PATCH' || type === 'DELETE') {
				if (Backbone.emulateJSON) params.data._method = type;
				params.type = 'POST';
				params.beforeSend = function(xhr) {
					xhr.setRequestHeader('X-HTTP-Method-Override', type);
			    };
			}
		}
		
		// Don't process data on a non-GET request.
		if (params.type !== 'GET') {
			params.processData = false;
		}
		
		// Make the request.
		return Stachl.ajax(params);
	};
	
	var MyAssist = window.MyAssist = {};
	MyAssist.models = {};
	MyAssist.collections = {};
	MyAssist.views = {};
	MyAssist.Settings = {};
	
	MyAssist.Model = Backbone.Model.extend({
		idAttribute: 'Id',
		loaded: false,
		findBy: function(field, term, func) {
			var clause = "SELECT Id FROM " + this.urlRoot + " WHERE " + field + " = '" + term + "' LIMIT 1",
				me = this,
				obj;
				
			Stachl.ajax({
				url: '/services/data/v20.0/query/',
				method: 'GET',
				data: $.param({
					q: clause
				}),
				dataType: 'json',
				success: function(data) {
					if ((data.done == true) && (data.records.length == 1)) {
						obj = new me.constructor({ Id: data.records[0].Id});
						obj.fetch({success: function() {
							func.call(obj);
						}});
					}
				}
			});
		},
		fetch: function(options) {
			options = options || {};
			var model = this;
			var success = options.success;
			options.success = function(resp, status, xhr) {
				model.loaded = true;
				model.trigger('modelloaded');
    			if (success) success(collection, resp);
			};
			Backbone.Model.prototype.fetch.call(this, options);
		}
	});
	
	MyAssist.Collection = Backbone.Collection.extend({
		initialize: function() {
			Backbone.Collection.prototype.add.call(this);
			this.bind('reset', function(col) {
				col.each(function(model) {
					model.fetch();
				});
			});
		},
		add: function(models, options) {
			if (models.hasOwnProperty('records')) {
				models = models.records;
			}
			Backbone.Collection.prototype.add.call(this, models, options);
		}
	});
	

	
	// Models
	MyAssist.models.Assist = MyAssist.Model.extend({
		defaults: {
			Id: '',
			Name: 'SSE-XXXXX',
			Task_Category__c: '',
			Subject__c: '',
			Description_of_Work__c: '',
			Date_Time_Due__c: '',
			active: false
		},
		
		urlRoot: 'SSE_Assist__c',
		
		toggle: function() {
			this.save({active: !this.get('active')});
		},
		
		clear: function() {
			this.destroy();
			this.view.remove();
		}
	});
	
	MyAssist.models.User = MyAssist.Model.extend({
		defaults: {
			Id: '',
			Username: '',
			AboutMe: '',
			Name: '',
			SmallPhotoUrl: ''
		},
		urlRoot: 'User',
		initialize: function(attributes, options) {
			air.trace('User init');
			MyAssist.Model.prototype.initialize.call(this, attributes, options);
			this._imageLoaded = false;
			
			this.bind('imageloaded', $.proxy(function() {
				air.trace('MyAssist.models.User : EVENT : imageloaded');
				this._imageLoaded = true;
			}, this));
		},
		set: function(attrs, options) {
			Backbone.Model.prototype.set.call(this, attrs, options);
			var me = this;
			
			for(var key in attrs) {
				var value = attrs[key];
				if ((key == 'SmallPhotoUrl' && value != '')
					|| (false && key == 'FullPhotoUrl' && value != '')) {
					var file = air.File.applicationStorageDirectory.resolvePath(
						'images/' + me.get('Id') + '_' + (key == 'SmallPhotoUrl' ? 't' : 'f') + '.jpeg'
					);
					if (value.indexOf('http') === -1) value = Stachl.ajaxSettings.instance_url + value;
					air.trace(value);
					var l = Stachl.loadImage(value, $.proxy(function(e) {
						var loader = air.URLLoader(e.target);
						var stream = new air.FileStream();
						stream.open(this, air.FileMode.WRITE);
						stream.writeBytes(loader.data);
						stream.close();
						me.trigger('imageloaded');
					}, file));
					
					air.trace(file.nativePath);
				}
			}
			return true;
		}
	});
	
	// Collections
	MyAssist.collections.Assists = MyAssist.Collection.extend({
		model: MyAssist.models.Assist,
		loaded: false,
		url: '/services/data/v20.0/query/',
		queues: {
			amer: {
				id: '00G30000000zfn0',
				icon: '/icons/flag_amer.png',
				name: 'America'
			},
			emea: {
				id: '00G30000001Nsni',
				icon: '/icons/flag_emea.png',
				name: 'Europe / Middle East / Africa'
			},
			apac: {
				id: '00G30000001Penp',
				icon: '/icons/flag_apac.png',
				name: 'Asia Pacific'
			},
			japan: {
				id: '00G30000001dFJq',
				icon: '/icons/flag_japan.png',
				name: 'Japan'
			},
			escalation: {
				id: '00G30000001dRZM',
				icon: '',
				name: 'Escalation'
			}
		},
		initialize: function() {
			MyAssist.Collection.prototype.initialize.call(this);
			_.extend(this, {
				clause: "where status__c  = 'In Queue' or (status__c in ('Under Review', 'Working') and ownerid ='" + MyAssist.Settings.User.id + "')"
			});
		},
		fetch: function(options) {
			options = options || {};
			options.url = this.url;
			options.data = $.param({
				q: 'select Id from SSE_Assist__c ' + this.clause
			});
			var success = options.success;
			var collection = this;
			options.success = function(resp, status, xhr) {
				_.each(collection.models, function(model) {
					model.bind('loaded', function() {
						var notLoaded = _.reject(collection.models, function(model) {
							return model.loaded;
						});
						if (notLoaded.length === 0) {
							air.Introspector.Console.log('LOADED');
							collection.loaded = true;
							collection.trigger('collectionloaded');
						}
					});
				});
				if (success) success(collection, resp);
			}
			MyAssist.Collection.prototype.fetch.call(this, options);
		},
		
		filterPersonal: function() {
			return _.select(this.models, function(model) {
				return (model.get('OwnerId') == MyAssist.Settings.User.id);
			});
		}
	});
	
	// Views
	MyAssist.views.login = MyAssist.View.extend({
		title: 'Login - MyAssist',
		events: {
			"submit form": "doLogin"
		},
		initialize: function() {
			this.template = _.template($(this.el).html());
			this.bind('userloaded', $.proxy(this.show, this));
		},
		render: function() {
			$(this.el).html(this.template({
				title: this.title
			}));
			MyAssist.View.prototype.render.call(this);
			return this;
		},
		doLogin: function(e) {
			e.preventDefault();
			e.stopPropagation();
			$.mobile.pageLoading();
			
			var username = this.$('#username').val(),
				password = this.$('#password').val();
			
			Stachl.ajax({
				url: '/services/oauth2/token',
				method: 'POST',
				data: $.param({
					grant_type: 'password',
					client_id: '3MVG99OxTyEMCQ3ink2XhkI2RMKU0HlLS_Tn20VDFEwLHwDh3RrTw7grosXjiEDSXbniNocEo0jsttMvCpZTw',
					client_secret: '391462625822053844',
					username: username,
					password: password
				}),
				dataType: 'json',
				success: $.proxy(this.loginSuccess, this),
				error: this.loginError
			});
		},
		loginSuccess: function(data) {
			var me = this,
				id = data.id.split('/').pop();
			Stachl.ajaxSetup({
				requestHeaders: {
					'Content-Type': 'text/html',
					'Authorization': 'OAuth ' + data.access_token
				},
				instance_url: data.instance_url
			});
			
			MyAssist.Settings.User = new MyAssist.models.User({Id: id});
			MyAssist.Settings.User.bind('imageloaded', function() {
				me.trigger('userloaded');
			});
			MyAssist.Settings.User.fetch();
		},
		loginError: function(event) {
			air.Introspector.Console.log(event);
		},
		show: function() {
			$.mobile.pageLoading(true);
			$.mobile.changePage($('#home'), {transition: 'fade'});
		}
	});
	
	MyAssist.views.home = MyAssist.View.extend({
		initialize: function() {
			air.trace('Home init');
			var me = this;
			this.template = _.template($(this.el).html());
			this.collection = new MyAssist.collections.Assists();
			this.collection.bind('collectionloaded', function() {
				me.render();
			});
			this.collection.fetch();
		},
		render: function() {
			$(this.el).html(this.template({
				user: MyAssist.Settings.User.toJSON(),
				activeAssists: this.collection.filterPersonal()
			}));
			MyAssist.View.prototype.render.call(this);
			return this;
		},
	});
	
	MyAssist.Application = Backbone.View.extend({
		mainWindow: air.NativeApplication.nativeApplication.openedWindows[0],
		mainScreen: air.Screen.mainScreen,
		initialize: function() {
			air.Introspector.Console.log('test');
			var $ = this.$;
			MyAssist.Settings.Application = this;
			
			
			
			$('div[data-role=page]').live('pagebeforecreate', function(e) {
				air.trace($(this).attr('id'));
				var page = $(this),
					view = new MyAssist.views[$(this).attr('id')]({el: this});
					view.bind('afterrender', function() {
						page.show();
					});
					view.render();
			});
			
			this.resizeMainWindow();
		},
		resizeMainWindow: function() {
			this.mainWindow.y = 0;
			this.mainWindow.x = this.mainScreen.bounds.width - this.mainWindow.width;
			this.mainWindow.height = this.mainScreen.visibleBounds.height;
		}
	});
})();
