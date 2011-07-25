(function() {
	_.template = function(tmp) {
		return function(data) {
			return Mustache.to_html(tmp, data);
		}
	}
	
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
		
		toggle: function() {
			this.save({active: !this.get('active')});
		},
		
		clear: function() {
			this.destroy();
			this.view.remove();
		}
	});
	
	MyAssist.models.User = Backbone.Model.extend({});
	
	// Collections
	MyAssist.collections.Assists = Backbone.Collection.extend({
		model: MyAssist.models.Assist
	});
	
	// Views
	MyAssist.views.login = Backbone.View.extend({
		title: 'Login - MyAssist',
		events: {
			"click .login_button": "doLogin"
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
			// Do the login process
			$.mobile.changePage('templates/home.html', {
				transition: 'fade'
			});
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
		//mainWindow: air.NativeApplication.nativeApplication.openedWindows[0],
		//mainScreen: air.Screen.mainScreen,
		loggedIn: true,
		initialize: function() {
			var $ = this.$;
			$('div[data-role=page]').live('pagebeforecreate', function(e) {
				var view = new MyAssist.views[$(this).attr('id')]({el: this});
				view.render();
			});
			//this.resizeMainWindow();
		},
		resizeMainWindow: function() {
			this.mainWindow.y = 0;
			this.mainWindow.x = this.mainScreen.bounds.width - this.mainWindow.width;
			this.mainWindow.height = this.mainScreen.visibleBounds.height;
		}
	});
})();
