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
			this._imageLoaded = false;
			
			this.bind('imageloaded', $.proxy(function() {
				air.trace('MyAssist.models.User : EVENT : imageloaded');
				this._imageLoaded = true;
			}, this));
		},
		set: function(attrs, options) {
			Backbone.Model.prototype.set.call(this, attrs, options);
			var me = this;
			
			for(var key in attrs) {
				var value = attrs[key];
				if ((key == 'SmallPhotoUrl' && value != '')
					|| (false && key == 'FullPhotoUrl' && value != '')) {
					var file = air.File.applicationStorageDirectory.resolvePath(
						'images/' + me.get('Id') + '_' + (key == 'SmallPhotoUrl' ? 't' : 'f') + '.jpeg'
					);
					if (value.indexOf('http') === -1) value = Stachl.ajaxSettings.instance_url + value;
					air.trace(value);
					var l = Stachl.loadImage(value, $.proxy(function(e) {
						var loader = air.URLLoader(e.target);
						var stream = new air.FileStream();
						stream.open(this, air.FileMode.WRITE);
						stream.writeBytes(loader.data);
						stream.close();
						me.trigger('imageloaded');
					}, file));
					
					air.trace(file.nativePath);
				}
			}
			return true;
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);
