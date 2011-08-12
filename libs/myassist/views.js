(function($, Backbone, _, window, $mobile, Stachl) {
	MyAssist = window.MyAssist || {};
	MyAssist.views = {};
	
	// Views
	MyAssist.views.login = MyAssist.View.extend({
		id: 'login',
		title: 'Login - MyAssist',
		events: {
			"submit #loginform": "doLogin"
		},
		initialize: function() {
			this.options.transition = 'fade';
			MyAssist.View.prototype.initialize.call(this);
			this.bind('userloaded', $.proxy(this.show, this));
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
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
					'Content-Type': 'application/json',
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
			'click .escalationButton': 'escalation',
			'click .assistdialog': 'assistDialog',
			'click .assist': 'changeTheme'
		},
		initialize: function() {
			this.options.transition = 'fade';
			MyAssist.View.prototype.initialize.call(this);
			if (!MyAssist.Settings.Assists) {
				MyAssist.Settings.Assists = new MyAssist.collections.Assists();
				MyAssist.Settings.Assists.bind('collectionloaded', $.proxy(this.initTemplate, this));
				MyAssist.Settings.Assists.fetch();
			} else {
				this.bind('pageloaded', $.proxy(this.initTemplate, this));
			}
		},
		render: function() {			
			this.el.html(this.template({
				user: MyAssist.Settings.User.toJSON(),
				assists: MyAssist.Settings.Assists.filterPersonal(),
				noassiststitle: 'No Assists',
				noassistsstrong: 'There are no assists assigned to you.',
				noassistsdescription: 'Please check the queues for assists.'
			}));
			
			MyAssist.View.prototype.render.call(this);
			return this;
		},
		assistDialog: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Application.showView('assistdialog', {
				assist: MyAssist.Settings.Assists.get($(e.target).parents('li').attr('id')),
				rel: 'dialog',
				transition: 'pop'
			});
		},
		changeTheme: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var model = MyAssist.Settings.Assists.get($(e.target).parents('li').attr('id'));
			if (model) {
				if (model.isActive()) model.deactivateAssist();
				else model.activateAssist();
				this.reload();
			}
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
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
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
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
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
			'click .loginLink': 'external',
		},
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this);
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
				assist: this.options.assist
			}));
			
			MyAssist.View.prototype.render.call(this);			
			return this;
		},
		external: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			var request = new air.URLRequest($(e.target).parents('a').attr('href'));
			try {
				air.navigateToURL(request);
			} catch(e) {
				air.Introspector.Console.log(e);
			}
		}
	});
	
	MyAssist.views.assistdialog = MyAssist.View.extend({
		id: 'assistdialog',
		events: {
			'click :jqmData(direction=reverse)': 'goBack',
			'click .assistDetail': 'detail',
			'click .assistClose': 'showForm',
			'click .assistAdd': 'showForm',
			'click .assistClone': 'clone',
			'click .cancel_button': 'closeForms',
			'submit #closeform': 'close',
			'submit #addHours': 'addHours',
		},
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this);
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
				assist: this.options.assist
			}));
			
			MyAssist.View.prototype.render.call(this);			
			return this;
		},
		detail: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Application.showView('assist', {
				assist: this.options.assist,
				prevView: MyAssist.Settings.Application.prevView
			});
		},
		showForm: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.$('a:jqmData(role=button)').hide();
			switch($(e.target).text().toLowerCase()) {
				case 'close':
					this.$('#closeform').show().find('textarea').focus();
					break;
				case 'add hours':
					this.$('#addHours').show().find('input').focus();
					break;
			}
		},
		close: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			alert('complete');
			//this.options.assist.save({
			//	SSE_Completion_Notes__c: this.$('#notes').val(),
			//	Link_to_Finished_Work__c: this.$('#notes').val(),
			//	Status__c: 'Completed - Awaiting Feedback'
			//});
			this.goBack(e);
		},
		addHours: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.options.assist.save({
				SSE_Hours_Logged__c: (Math.round((parseFloat(this.options.assist.get('SSE_Hours_Logged__c') || 0) + parseFloat(this.$('#hours').val() == '' ? 0 : this.$('#hours').val())) * 10) / 10)
			});
			this.goBack(e);
		},
		clone: function() {},
		closeForms: function(e) {
			e.preventDefault();
			e.stopPropagation();
				
			this.$('form').hide();
			this.$('a:jqmData(role=button)').show();
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);