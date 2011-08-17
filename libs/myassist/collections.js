(function($, Backbone, _, window, $mobile, Stachl) {
	MyAssist = window.MyAssist || {};
	MyAssist.collections = {};
	
	// Collections
	MyAssist.collections.Assists = MyAssist.Collection.extend({
		model: MyAssist.models.Assist,
		loaded: false,
		runner: false,
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
			this.clause = "where status__c  = 'In Queue' or (status__c in ('Under Review', 'Working') and ownerid ='" + MyAssist.Settings.User.id + "')";
		},
		check: function() {
			var me = this;
			if (me.runner) window.clearTimeout(me.runner);
			Stachl.ajax({
				url: me.url,
				data: $.param({
					q: 'select count(Id)total from SSE_Assist__c ' + me.clause
				}),
				dataType: 'json',
				success: function(data) {
					if (parseInt(data.records[0].total) != me.length) me.fetch({
						success: function() {
							if (MyAssist.Settings.Application.activeView[0] != 'login') {
								MyAssist.Settings.Application.view.reload();
							}
						},
						error: function() {
							air.Introspector.Console.log(arguments);
						}
					});
					me.runner = window.setTimeout($.proxy(me, 'check'), 300000);
				}
			});
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
				return (model.get('OwnerId') && (model.get('OwnerId').indexOf(MyAssist.Settings.User.id) != -1) && ($.inArray(model.get('Status__c'), ['Working', 'Under Review']) != -1));
			});
		},
		filterQueue: function(id) {
			return this.__filter(function(model) {
				return (model.get('OwnerId').indexOf(id) != -1);
			});
		}
	});
	
	MyAssist.collections.Attachments = MyAssist.Collection.extend({
		model: MyAssist.models.Attachment,
		comparator: function(model) {
			return Date.parse(model.get('CreatedDate'));
		},
		initialize: function(options) {
			MyAssist.Collection.prototype.initialize.call(this);
			this.clause = "where parentid = '" + options.assist_id + "'";
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);