(function($, Backbone, _, window, $mobile, Stachl) {
	MyAssist = window.MyAssist || {};
	MyAssist.collections = {};
	
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
		comparator: function(model) {
			return Date.parse(model.get('Date_Time_Due__c'));
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
				return ((model.get('OwnerId').indexOf(MyAssist.Settings.User.id) != -1) && ($.inArray(model.get('Status__c'), ['Working', 'Under Review']) != -1));
			});
		},
		filterQueue: function(id) {
			return this.__filter(function(model) {
				return (model.get('OwnerId').indexOf(id) != -1);
			});
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);