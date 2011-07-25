(function() {
	console.log(window);
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
	
	// Router
	MyAssist.router = Backbone.Router.extend({
		routes: {
			'login': 				'login',
			'*path': 				'defaultRoute'
		},
		
		defaultRoute: function() {},
		login: function() {}
	});
}).call(this);