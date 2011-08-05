(function($mobile) {
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
	
	MyAssist.View = Backbone.View.extend({
		pageOptions: {},
		initialize: function() {
			Backbone.View.prototype.initialize.call(this);
			$.mobile.showPageLoadingMsg();
			var me = this,
				settings = $.extend({}, $mobile.changePage.defaults, this.pageOptions);
				
			this.bind('pageloaded', $.proxy(this.delegateEvents, this));
			this.bind('afterrender', $.proxy(this.onAfterRender, this));
	
			// Make sure we have a pageContainer to work with.
			settings.pageContainer = settings.pageContainer || $mobile.pageContainer;
			settings.reloadPage = true;
						
			if (!this.$('#' + this.id).length)
				$mobile.loadPage('/templates/' + this.id + '.html', settings)
					.done(function( url, options, newPage, dupCachedPage ) {
						isPageTransitioning = false;
						options.duplicateCachedPage = dupCachedPage;
						me.pageOptions = options;
						me.el = newPage;
						me.trigger('pageloaded');
					});
		},
		render: function() {
			Backbone.View.prototype.render.call(this);
			$mobile.changePage(this.el, this.pageOptions);
			this.trigger('afterrender');
		},
		onAfterRender: function() {
			$.mobile.hidePageLoadingMsg();
		},
		goBack: function(e) {
			e.preventDefault();
			e.stopPropagation();
						
			MyAssist.Settings.Application.goBack();
		},
		goTo: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Application.showView($(e.target).parents('a').text().toLowerCase());
		},
		goToQueue: function(id) {
			var queue;
			
			_.each(MyAssist.Settings.Assists.queues, function(value, key) {
				if (value.id == id)
					queue = value;
			});
			
			MyAssist.Settings.Application.showView('queue', {
				queue: queue
			});
		},
		escalation: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.goToQueue('00G30000001dRZM');
		},
		goToAssist: function(id) {
			MyAssist.Settings.Application.showView('assist', {
				assist: MyAssist.Settings.Assists.get(id)
			});
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
		
		isStrategic: function() {
			return (this.get('RecordTypeId') == '012300000009RKEAA2' ? true : false);
		},
		isOverdue: function() {
			return false;
		},
		isActive: function() {
			return false;
		},
		strategic: function() {
			return (this.isStrategic ? 'strategic' : '');
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
		queuesToArray: function() {
			var q = [];
			_.each(this.queues, function(value, key) {
				if (key !== 'escalation')
					q.push(value);
			});
			return q;
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
					model.bind('modelloaded', function() {
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
		__filter: function(fifu) {
			var r = [], m;
			return this.filter(fifu);
			_.each(m, function(model) {
				r.push(model.toJSON());
			});
			return r;
		},
		filterPersonal: function() {
			return this.__filter(function(model) {
				return (model.get('OwnerId').indexOf(MyAssist.Settings.User.id) != -1);
			});
		},
		filterQueue: function(id) {
			return this.__filter(function(model) {
				return (model.get('OwnerId').indexOf(id) != -1);
			});
		}
	});
	
	// Views
	MyAssist.views.login = MyAssist.View.extend({
		id: 'login',
		pageOptions: {
			transition: 'fade'
		},
		title: 'Login - MyAssist',
		events: {
			"submit form": "doLogin"
		},
		initialize: function() {
			MyAssist.View.prototype.initialize.call(this);
			this.bind('userloaded', $.proxy(this.show, this));
			this.bind('pageloaded', $.proxy(this.render, this));
		},
		render: function() {
			this.template = _.template($(this.el).html());
			
			$(this.el).html(this.template({
				title: this.title
			}));
			
			MyAssist.View.prototype.render.call(this);
			
			return this;
		},
		doLogin: function(e) {
			e.preventDefault();
			e.stopPropagation();
			$.mobile.showPageLoadingMsg();
			
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
			MyAssist.Settings.Application.showView('home');
		}
	});
	
	MyAssist.views.home = MyAssist.View.extend({
		id: 'home',
		events: {
			'click .queuesButton': 'goTo',
			'click .homeButton': 'goTo',
			'click .newButton': 'goTo',
			'click .escalationButton': 'escalation'
		},
		initialize: function() {
			MyAssist.View.prototype.initialize.call(this);
			if (!MyAssist.Settings.Assists) {
				MyAssist.Settings.Assists = new MyAssist.collections.Assists();
				MyAssist.Settings.Assists.bind('collectionloaded', $.proxy(this.render, this));
				MyAssist.Settings.Assists.fetch();
			} else {
				this.bind('pageloaded', $.proxy(this.render, this));
			}
		},
		render: function() {
			this.template = _.template($(this.el).html());
			
			$(this.el).html(this.template({
				user: MyAssist.Settings.User.toJSON(),
				activeAssists: MyAssist.Settings.Assists.filterPersonal(),
				noassiststitle: 'No Assists',
				noassistsstrong: 'There are no assists assigned to you.',
				noassistsdescription: 'Please check the queues for assists.'
			}));
			
			MyAssist.View.prototype.render.call(this);
			return this;
		}
	});
	
	MyAssist.views.queues = MyAssist.View.extend({
		id: 'queues',
		title: 'Queues',
		events: {
			'click .queuesButton': 'goTo',
			'click .homeButton': 'goTo',
			'click .newButton': 'goTo',
			'click .escalationButton': 'escalation',
			'click .queueLi': 'findQueue'
		},
		initialize: function() {
			MyAssist.View.prototype.initialize.call(this);
			
			if (!MyAssist.Settings.Assists) {
				MyAssist.Settings.Assists = new MyAssist.collections.Assists();
				MyAssist.Settings.Assists.bind('collectionloaded', $.proxy(this.render, this));
				MyAssist.Settings.Assists.fetch();
			} else {
				this.bind('pageloaded', $.proxy(this.render, this));
			}
		},
		render: function() {
			this.template = _.template($(this.el).html());
			
			air.Introspector.Console.log(MyAssist.Settings.Assists.queuesToArray());
			
			$(this.el).html(this.template({
				title: this.title,
				queues: MyAssist.Settings.Assists.queuesToArray()
			}));
			
			MyAssist.View.prototype.render.call(this);
			return this;
		},
		findQueue: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.goToQueue($(e.target).parents('li').attr('id'));
		}
	});
	
	MyAssist.views.queue = MyAssist.View.extend({
		id: 'queue',
		queue: {},
		events: {
			'click .queuesButton': 'goTo',
			'click .homeButton': 'goTo',
			'click .newButton': 'goTo',
			'click .escalationButton': 'escalation',
			'click .assistLi': 'findAssist'
		},
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this);
			
			_.extend(this.options, options);
			
			if (!MyAssist.Settings.Assists) {
				MyAssist.Settings.Assists = new MyAssist.collections.Assists();
				MyAssist.Settings.Assists.bind('collectionloaded', $.proxy(this.render, this));
				MyAssist.Settings.Assists.fetch();
			} else {
				this.bind('pageloaded', $.proxy(this.render, this));
			}
		},
		render: function() {
			this.template = _.template($(this.el).html());
						
			$(this.el).html(this.template({
				queue: this.options.queue,
				assists: MyAssist.Settings.Assists.filterQueue(this.options.queue.id),
				noassiststitle: 'No Assists',
				noassistsstrong: 'There are no assists in this queue.',
				noassistsdescription: 'Please check the other queues for assists.'
			}));
			
			MyAssist.View.prototype.render.call(this);
			return this;
		},
		findAssist: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.goToAssist($(e.target).parents('li').attr('id'));
		}
	});
	
	MyAssist.views.assist = MyAssist.View.extend({
		id: 'assist',
		events: {
			'click .queuesButton': 'goTo',
			'click .homeButton': 'goTo',
			'click .newButton': 'goTo',
			'click .escalationButton': 'escalation',
			'click :jqmData(direction=reverse)': 'goBack',
		},
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this);
			
			_.extend(this.options, options);
			
			if (!MyAssist.Settings.Assists) {
				MyAssist.Settings.Assists = new MyAssist.collections.Assists();
				MyAssist.Settings.Assists.bind('collectionloaded', $.proxy(this.render, this));
				MyAssist.Settings.Assists.fetch();
			} else {
				this.bind('pageloaded', $.proxy(this.render, this));
			}
		},
		render: function() {
			this.template = _.template($(this.el).html());
			
			$(this.el).html(this.template({
				assist: this.options.assist
			}));
			
			MyAssist.View.prototype.render.call(this);
			return this;
		}
	});
	
	MyAssist.Application = function() {
		air.Introspector.Console.log('test');
				
		//find present pages
		var $pages = $( ":jqmData(role='page')" );
		
		//if no pages are found, create one with body's inner html
		if( !$pages.length ){
			$pages = $( "body" ).wrapInner( "<div data-" + $mobile.ns + "role='page'></div>" ).children( 0 );
		}

		//add dialogs, set data-url attrs
		$pages.add( ":jqmData(role='dialog')" ).each(function(){
			var $this = $(this);

			// unless the data url is already set set it to the id
			if( !$this.jqmData('url') ){
				$this.attr( "data-" + $mobile.ns + "url", $this.attr( "id" ) );
			}
		});

		//define page container
		$mobile.pageContainer = $pages.first().parent().addClass( "ui-mobile-viewport" );

		//cue page loading message
		$mobile.showPageLoadingMsg();
		
		this.mainWindow = air.NativeApplication.nativeApplication.openedWindows[0];
		this.mainScreen = air.Screen.mainScreen;
		this.mainWindow.y = 0;
		this.mainWindow.x = this.mainScreen.bounds.width - this.mainWindow.width;
		this.mainWindow.height = this.mainScreen.visibleBounds.height;
		
		this.run = function() {
			this.showView('login');
		};
		this.showView = function(view, options) {
			var prev = this.prevView;
			this.prevView = this.activeView;
			this.activeView = [view, options];
			try {
				new MyAssist.views[this.activeView[0]](this.activeView[1]);
			} catch(e) {
				air.Introspector.Console.log(e);
				this.activeView = this.prevView;
				this.prevView = prev;
			}
		};
		this.goBack = function() {
			var settings = _.clone(this.prevView[1]);
			settings.reverse = true;
			this.showView(this.prevView[0], settings);
		};
		return this;
	};

})($.mobile);
