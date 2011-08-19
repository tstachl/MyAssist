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
			
			Stachl.ajaxSetup({
			    username: username,
			    password: password
			});
			
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
				instance_url: data.instance_url,
				token: data.access_token
			});
			MyAssist.Settings.User = new MyAssist.models.User({Id: id, withFeedback: true});
			MyAssist.Settings.User.fetch();
			MyAssist.Settings.Assists = new MyAssist.collections.Assists();
			MyAssist.Settings.Assists.bind('collectionloaded', me.show);
			MyAssist.Settings.Assists.check();
		},
		loginError: function(event) {
			air.Introspector.Console.log(event);
		},
		show: function() {
		    if (MyAssist.Settings.Application.activeView[0] == 'login')
    			MyAssist.Settings.Application.showView('home');
            else
                MyAssist.Settings.Application.view.reload();
		}
	});
	
	MyAssist.views.home = MyAssist.View.extend({
		id: 'home',
		events: {
			'click .assistdialog': 'assistDialog',
			'click .assist': 'changeTheme'
		},
		initialize: function() {
			this.options.transition = 'fade';
			MyAssist.View.prototype.initialize.call(this);
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {			
			this.el.html(this.template({
				user: MyAssist.Settings.User,
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
			var model = MyAssist.Settings.Assists.get($(e.target).parents('li').attr('id')) || MyAssist.Settings.Assists.filterPhony()[0];
			if (model) {
				if (model.isActive()) {
					if (model.phony) 
						MyAssist.Settings.Application.showView('edit', {
							assist: model
						});
					else {
						model.deactivateAssist();
						this.reload();
					}
				} else {
					model.activateAssist();
					this.reload();
				}
			}
		}
	});
	
	MyAssist.views.queues = MyAssist.View.extend({
		id: 'queues',
		title: 'Queues',
		events: {
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
			'click .external': 'external',
			'click .download': 'download',
			'click .shrunk': 'previewImage',
			'click .grab': 'grabAssist',
		},
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this, options);
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
				assist: this.options.assist,
				attachments: (this.options.assist.attachments ? this.options.assist.attachments : null)
			}));
			
			MyAssist.View.prototype.render.call(this);			
			return this;
		},
		external: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			var el = ($(e.target)[0].tagName.toLowerCase() == 'a' ? $(e.target) : $(e.target).parents('a')),
				request = new air.URLRequest(el.attr('href'));
			try {
				air.navigateToURL(request);
			} catch(e) {
				air.Introspector.Console.log(e);
			}
		},
		download: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			var el = ($(e.target)[0].tagName.toLowerCase() == 'a' ? $(e.target) : $(e.target).parents('a')),
				id = el.attr('id');
				
			Stachl.utils.fileDownload(this.options.assist.attachments.get(id));
		},
		previewImage: function(e) {
			e.preventDefault();
			e.stopPropagation();
            Stachl.utils.tempDownload($(e.target).attr('src'));
		},
		grabAssist: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.options.assist.grabAssist();
			this.reload();
		}
	});
	
	MyAssist.views.assistdialog = MyAssist.View.extend({
		id: 'assistdialog',
		events: {
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
			
			this.goToAssist(this.options.assist.id, {
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
			
			this.options.assist.save({
				SSE_Completion_Notes__c: this.$('#notes').val(),
				Link_to_Finished_Work__c: this.$('#link').val(),
				Status__c: 'Completed - Awaiting Feedback'
			});
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
		clone: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			var clone = this.options.assist.clone();
				clone.save({Status__c: 'In Queue'});
			MyAssist.Settings.Assists.check();
			this.goBack(e);
		},
		closeForms: function(e) {
			e.preventDefault();
			e.stopPropagation();
				
			this.$('form').hide();
			this.$('a:jqmData(role=button)').show();
		}
	});
	
	MyAssist.views.newdialog = MyAssist.View.extend({
		id: 'newdialog',
		counter: 15,
		initialize: function(options) {
			MyAssist.View.prototype.initialize.call(this);
			this.bind('pageloaded', $.proxy(this.initTemplate, this));
		},
		render: function() {
			this.el.html(this.template({
			}));
			
			MyAssist.View.prototype.render.call(this);
			
			this.startCounter();
			return this;
		},
		startCounter: function() {
			if (this.counter > 0) {
				this.counter--;
				this.el.find('div.counter strong').html(this.counter);
				this.to = window.setTimeout($.proxy(this, 'startCounter'), 1000);
			} else {
				if (MyAssist.Settings.Application.activeView[0] == this.id)
					this.options.click.call(this, 'none');
			}
		},
		edit: function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.clearTimeout(this.to);
			this.options.click.call(this, 'edit', e);
		},
		activate: function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.clearTimeout(this.to);
			this.options.click.call(this, 'activate', e);
		}
	});
	
	MyAssist.views.edit = MyAssist.View.extend({
		id: 'edit',
		events: {
			'click .activateButton': 'activate',
			'click .saveButton': 'save',
			'click .cancelButton': 'cancel',
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
		activate: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.save(e);
			this.options.assist.activateAssist();
		},
		save: function(e, flag) {
			e.preventDefault();
			e.stopPropagation();
			
			$mobile.showPageLoadingMsg();
			var me = this,
				startTime = (this.options.assist.phony && this.options.assist.startTime ? this.options.assist.startTime : false);
			this.options.assist.save(this.el.find('form').serializeObject(), {
				success: function(model, resp) {
					$mobile.showPageLoadingMsg();
					model.set({Id: resp.id});
					model.fetch({
						success: function() {
							if (startTime) {
								model.startTime = startTime;
								model.deactivateAssist();
							}
							$mobile.hidePageLoadingMsg();
							me.goBack(e);
						}
					});
					
				}
			});
		},
		cancel: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Assists.remove(this.options.assist);
			this.options.assist.destroy();
			this.goBack(e);
		},
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);