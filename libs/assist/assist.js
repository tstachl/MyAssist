(function() {
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
			params.url = 'https://na1.salesforce.com/services/data/v20.0/sobjects/' + model.url();
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
		return $.ajax(params);
	};
	
	var MyAssist = window.MyAssist = {};
	MyAssist.models = {};
	MyAssist.collections = {};
	MyAssist.views = {};
	
	// Models
	MyAssist.models.Assist = Backbone.Model.extend({
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
	
	MyAssist.models.User = Backbone.Model.extend({
		defaults: {
			Id: '',
			Username: '',
			AboutMe: '',
			Name: '',
			SmallPhotoUrl: ''
		},
		urlRoot: 'User'
	});
	
	// Collections
	MyAssist.collections.Assists = Backbone.Collection.extend({
		model: MyAssist.models.Assist
	});
	
	// Views
	MyAssist.views.login = Backbone.View.extend({
		title: 'Login - MyAssist',
		events: {
			"submit form": "doLogin"
		},
		initialize: function() {
			this.template = _.template($(this.el).html());
		},
		render: function() {
			$(this.el).html(this.template({
				title: this.title
			}));
			return this;
		},
		doLogin: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			var loader = new air.URLLoader();
			loader.addEventListener(air.Event.COMPLETE, $.proxy(this.login, this));
			loader.addEventListener(air.IOErrorEvent.IO_ERROR, $.proxy(this.loginError, this));
            try {
                loader.load(this.createRequest());
            } catch (error) {
                air.trace("Unable to load requested document.");
            }
		},
		createRequest: function() {
			var request = new air.URLRequest('https://na1.salesforce.com/services/oauth2/token');
			request.method = 'POST';
			request.data = $.param({
				grant_type: 'password',
				client_id: '3MVG99OxTyEMCQ3ink2XhkI2RMKU0HlLS_Tn20VDFEwLHwDh3RrTw7grosXjiEDSXbniNocEo0jsttMvCpZTw',
				client_secret: '391462625822053844',
				username: this.$('#username').val(),
				password: this.$('#password').val()
			});
			return request;
		},
		login: function(event) {
			var loader = air.URLLoader(event.target),
				data = $.parseJSON(loader.data),
				user;
			this.options.app.connection = data;
			
			$.ajaxSetup({
				headers: {
					Authorization: 'OAuth ' + data.access_token,
					'X-PrettyPrint': 1
				}
			});
			
			user = new MyAssist.models.User();
			user.fetch({'clause':'where username = ' + this.$('#username').val()});
			this.options.app.user = user;
			
			$.mobile.changePage('templates/home.html', {
				transition: 'fade'
			});
		},
		loginError: function(event) {
			air.Introspector.Console.log(event);
		}
	});
	
	MyAssist.views.home = Backbone.View.extend({
		initialize: function() {
			this.template = _.template($(this.el).html());
		},
		render: function() {
			$(this.el).html(this.template({
				user: {
					name: 'Thomas Stachl',
					picture: '<img src="/MyAssist/icons/thomas.jpeg" class="ui-btn-left" title="Your profile picture." />',
					comments: 122,
					received: 99,
					likes: 12
				},
				activeAssists: [{
					title: 'Nutricia Branding',
					type: 'Customer Portal Branding',
					description: 'Need the customer portal branded like the homepage. The link is attached.',
					id: 'SSE-12345',
					active: true
				}, {
					title: 'Kohl\'s Knowledge',
					type: 'Custom Code',
					description: 'Create a knowledge component on the category and product page of Kohl\'s shop.',
					id: 'SSE-12346',
					active: false
				}, {
					title: 'Google Map Integration',
					type: 'Custom Code',
					description: 'Integrate Google map with the plugin DontKnowWhatItsCalled in the AppExchange.',
					id: 'SSE-12347',
					active: false
				}, {
					title: 'My Overdue Assist',
					type: 'Point And Click',
					description: 'Eventhough you don\'t like point and click, finish this assist!!!!',
					id: 'SSE-11133',
					active: false,
					overdue: true
				}]
			}));
			return this;
		},
	});
	
	MyAssist.Application = Backbone.View.extend({
		mainWindow: air.NativeApplication.nativeApplication.openedWindows[0],
		mainScreen: air.Screen.mainScreen,
		initialize: function() {
			var $ = this.$,
				me = this;
			$('div[data-role=page]').live('pagebeforecreate', function(e) {
				var view = new MyAssist.views[$(this).attr('id')]({el: this, app: me});
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
