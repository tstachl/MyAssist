(function($, Backbone, _, window, $mobile, Stachl) {
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
			method:       type,
			dataType:     'json'
		}, options);
		
		// Ensure that we have a URL.
		if (!params.url) {
			if (typeof model.url == 'function')
				params.url = '/services/data/v20.0/sobjects/' + model.url();
			
		}
		
		// Ensure that we have the appropriate request data.
		if (model && (method == 'create' || method == 'update')) {
			params.contentType = 'application/json';
			if (model.isNew()) {
				params.data = model.toJSON();
				delete params.data[model.idAttribute];
			}
			air.Introspector.Console.log(model.excludeFields, params.data);
			$.each(model.excludeFields, function() {
				delete params.data[this];
			});
			air.Introspector.Console.log(params.data);
			params.data = JSON.stringify(params.data);
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
		
		// Make the request.
		return Stachl.ajax(params);
	};

	MyAssist = window.MyAssist || {};
	MyAssist.Settings = {};
	
	MyAssist.Settings.Options = {
		dateTimeFormat: 'MM/dd/yyyy hh:mm tt',
		serverDateTimeFormat: 'yyyy-MM-ddTHH:mm:ss.uuz',
	};
	
	MyAssist.Model = Backbone.Model.extend({
		idAttribute: 'Id',
		clone: function() {
			var attrs = this.toJSON();
			delete attrs[this.idAttribute];
			return new this.constructor(attrs);
		},
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
    			if (success) success(model, resp);
			};
			Backbone.Model.prototype.fetch.call(this, options);
		},
		save: function(attrs, options) {
			options || (options = {});
			if (!attrs && !this.isNew()) return false;
			if (!this.isNew()) options.data = attrs;
			Backbone.Model.prototype.save.call(this, attrs, options);
		}
	});
	
	MyAssist.Collection = Backbone.Collection.extend({
		url: '/services/data/v20.0/query/',
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
		},
		fetch: function(options) {
			options = options || {};
			options.url = this.url;
			options.data = $.param({
				q: 'select Id from ' + (new this.model()).urlRoot + ' ' + this.clause
			});
			var success = options.success;
			var collection = this;
			options.success = function(resp, status, xhr) {
				if (collection.length == 0) collection.trigger('collectionloaded');
				else {
					_.each(collection.models, function(model) {
						model.bind('modelloaded', function() {
							var notLoaded = _.reject(collection.models, function(model) {
								return model.loaded;
							});
							if (notLoaded.length === 0) {
								collection.trigger('collectionloaded');
							}
						});
					});
				}
				if (success) success(collection, resp);
			}
			Backbone.Collection.prototype.fetch.call(this, options);
			return this;
		}
	});
	
	MyAssist.View = Backbone.View.extend({
		rendered: false,
		initialize: function() {
			Backbone.View.prototype.initialize.call(this);
			$mobile.showPageLoadingMsg();
			var me = this,
				settings = $.extend({}, $mobile.changePage.defaults, this.options || {});
				
			this.events = this.events || {};
				
			_.extend(this.events, this.options.events || {}, {
				'click .queuesButton': 'goTo',
				'click .homeButton': 'goTo',
				'click .newButton': 'newAssist',
				'click .escalationButton': 'escalation',
				'click :jqmData(direction=reverse)': 'goBack',
			});
				
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
		initTemplate: function() {
			this.template = _.template(this.el.html());
			this.el.empty();
			this.render();
		},
		render: function() {
			Backbone.View.prototype.render.call(this);
			if (!this.rendered)
				$mobile.changePage(this.el, this.options || {});
			this.rendered = true;
			this.trigger('afterrender');
		},
		reload: function() {
			var options = _.clone(this.options);
			_.extend(options, {
				prevView: MyAssist.Settings.Application.prevView
			});
			MyAssist.Settings.Application.showView(this.id, options);
		},
		onAfterRender: function() {
			$.mobile.hidePageLoadingMsg();
		},
		goBack: function(e) {
			e.preventDefault();
			e.stopPropagation();
			MyAssist.Settings.Application.goBack($(e.target).parents('a').attr('data-transition'));
		},
		goTo: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Application.showView($(e.target).parents('a').text().toLowerCase(), {
				transition: 'fade'
			});
		},
		goToQueue: function(id, transition) {
			var queue;
			
			_.each(MyAssist.Settings.Assists.queues, function(value, key) {
				if (value.id == id)
					queue = value;
			});
			
			MyAssist.Settings.Application.showView('queue', {
				queue: queue,
				transition: transition || 'slide'
			});
		},
		escalation: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.goToQueue('00G30000001dRZM', 'fade');
		},
		goToAssist: function(id, options) {
			options = _.extend(options || {}, {
				assist: MyAssist.Settings.Assists.get(id)
			});
			MyAssist.Settings.Application.showView('assist', options);
		},
		newAssist: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			MyAssist.Settings.Application.showView('newdialog', {
				rel: 'dialog',
				transition: 'pop',
				events: {
					'click .editButton': 'edit',
					'click .activateButton': 'activate',
				},
				click: function(action, ev) {
					var assist = new MyAssist.models.Assist({
							Date_Time_Due__c: Date.today().setTimeToNow().toString(MyAssist.Settings.Options.serverDateTimeFormat),
							Description_of_Work__c: 'Not saved yet.',
							Estimated_Effort_hours__c: '0',
							Business_Value_of_Work__c: 'Not defined yet.',
							OwnerId: MyAssist.Settings.User.id,
							Preferred_SSE__c: MyAssist.Settings.User.attributes.Name,
							RecordTypeId: '012300000009RKEAA2',
							SE_contact__c: MyAssist.Settings.User.id,
							SSE_Hours_Logged__c: 0,
							Status__c: 'Under Review',
							Subject__c: 'New Assist',
							Task_Category__c: 'Other',
						});
					MyAssist.Settings.Assists.add(assist);
					
					switch (action) {
						case 'edit':
							MyAssist.Settings.Application.showView('edit', {
								assist: assist,
								prevView: MyAssist.Settings.Application.prevView
							});
							break;
						case 'activate':
						case 'none':
						default:
							assist.phony = true;
							assist.activateAssist();
							this.goBack(ev || e);
							break;
					}
				}
			});
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);