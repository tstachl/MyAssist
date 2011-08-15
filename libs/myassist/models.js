(function($, Backbone, _, window, $mobile, Stachl) {
	MyAssist = window.MyAssist || {};
	MyAssist.models = {};
	
	// Models
	MyAssist.models.Assist = MyAssist.Model.extend({
		defaults: {
			Id: '',
			Name: 'SSE-XXXXX',
			Task_Category__c: '',
			Subject__c: '',
			Description_of_Work__c: '',
			Date_Time_Due__c: ''
		},
		
		startTime: null,
		initialize: function(attributes, options) {
			MyAssist.Model.prototype.initialize.call(this, attributes, options);
			this.attachments = new MyAssist.collections.Attachments({assist_id: this.id});
			this.attachments.fetch();
		},
		
		isStrategic: function() {
			return this.get('RecordTypeId') === '012300000009RKEAA2' ? true : false;
		},
		isOverdue: function() {
			return false;
		},
		isActive: function() {
			return (!!this.startTime);
		},
		strategic: function() {
			return (this.isStrategic() ? 'strategic' : '');
		},
		dataTheme: function() {
			return (this.isActive() ? 'f' : (this.isOverdue() ? 'g' : 'c'));
		},
		getFormatDescription: function() {
			return Stachl.utils.nl2br(this.get('Description_of_Work__c'));
		},
		getFormatMockup: function() {
			return Stachl.utils.imgBase(this.get('mockup__c')) || '';
		},
		getDueDate: function() {
			return Date.parse(this.get('Date_Time_Due__c')).toString(MyAssist.Settings.Options.dateTimeFormat);
		},
		activateAssist: function() {
			return this.startTime = new Date.today().setTimeToNow();
		},
		deactivateAssist: function() {
			this.save({
				SSE_Hours_Logged__c: (Math.round((parseFloat(this.get('SSE_Hours_Logged__c') || 0) + (Date.today().setTimeToNow() - this.startTime) / 3600000) * 10) / 10)
			});
			return this.startTime = null;
		},
		hasLoginUrl: function() {
			return (!!this.get('Login_URL__c'));
		},
		hasAttachments: function() {
			return (!!this.attachments.length);
		},
		getAttachments: function() {
			return this.attachments.models;
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
		},
		getSmallPhoto: function() {
			return (this.get('SmallPhotoUrl').indexOf('http') == -1 ? Stachl.ajaxSettings.instance_url + this.get('SmallPhotoUrl') : this.get('SmallPhotoUrl')) + '?oauth_token=' + Stachl.ajaxSettings.token;
		}
	});
	
	MyAssist.models.Attachment = MyAssist.Model.extend({
		urlRoot: 'Attachment',
		initialize: function(attributes, options) {
			MyAssist.Model.prototype.initialize.call(this, attributes, options);
		},
		getDownloadLink: function() {
			return Stachl.ajaxSettings.instance_url + '/servlet/servlet.FileDownload?file=' + this.get('Id') + '&oauth_token=' + Stachl.ajaxSettings.token;
		}		
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);
