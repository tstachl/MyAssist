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
			params.data = JSON.stringify(model.isNew() ? model.toJSON() : params.data);
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
		
		air.trace(JSON.stringify(params));
		
		// Make the request.
		return Stachl.ajax(params);
	};

	MyAssist = window.MyAssist || {};
	MyAssist.Settings = {};
	
	MyAssist.Settings.Options = {
		dateTimeFormat: 'MM/dd/yyyy hh:mm tt'
	};
	
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
		},
		save: function(attrs, options) {
			options || (options = {});
			if (!attrs && !this.isNew()) return false;
			if (!this.isNew()) options.data = attrs;
			Backbone.Model.prototype.save.call(this, attrs, options);
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
		rendered: false,
		initialize: function() {
			Backbone.View.prototype.initialize.call(this);
			$mobile.showPageLoadingMsg();
			var me = this,
				settings = $.extend({}, $mobile.changePage.defaults, this.options || {});
				
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
			this.template = _.template($(this.el).html());
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
		goToAssist: function(id) {
			MyAssist.Settings.Application.showView('assist', {
				assist: MyAssist.Settings.Assists.get(id)
			});
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);