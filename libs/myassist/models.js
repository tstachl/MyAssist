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
			Date_Time_Due__c: '',
		},
		phony: false,
		excludeFields: ["ConnectionReceivedId","SE_Classification__c","LastModifiedDate","Deal_Assist_Points__c","Scope_Accuracy__c","Communication_Score__c","Manager_Name__c","IsLocked","SE_Role__c","CreatedById","IsDeleted","Deal_Priority__c","ACV_Points__c","ConnectionSentId","Overall_Quality_Score__c","Due_Month__c","Satisfaction_Score__c","LastActivityDate","Strategic_Priority__c","SystemModstamp","Expected_Turn_Around_Time__c","Login_URL__c","LastModifiedById","Feedback_Multiplier__c","Name","SE_Managers_Email__c","MayEdit","CreatedDate","Total_Strategic_Points__c"],		
		startTime: null,
		initialize: function(attributes, options) {
			MyAssist.Model.prototype.initialize.call(this, attributes, options);
			this.bind('set:SE_contact__c', this.fetchContact);
			this.bind('set:Id', this.fetchAttachments);
			this.bind('checkloaded', this.checkLoaded);
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
		isQueue: function() {
			return (this.get('OwnerId') != MyAssist.Settings.User.id);
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
		getAssistUrl: function() {
		    return Stachl.ajaxSettings.instance_url + '/login.jsp?' + $.param({
		        pw: Stachl.ajaxSettings.password,
		        un: Stachl.ajaxSettings.username,
		        startURL: '/' + this.id
		    });
		},
		activateAssist: function() {
		    if (!this.phony && (this.get('Status__c') == 'Under Review'))
                this.save({
                    Status__c: 'Working'
                });
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
		grabAssist: function() {
			this.save({
				OwnerId: MyAssist.Settings.User.id,
				Status__c: 'Under Review'
			});
			return true;
		},
        getContactName: function() {
            if (this.contact)
                return this.contact.get('Name');
            return '';
        },
        getContactEmail: function() {
            if (this.contact && this.contact.get('Email'))
                return '<a href="mailto:' + this.contact.get('Email') + '">' + this.contact.get('Email') + '</a>';
            return '';
        },
        getContactPhone: function() {
            if (this.contact && this.contact.get('Phone'))
                return this.contact.get('Phone');
            return '';
        },
        getContactMobilePhone: function() {
            if (this.contact && this.contact.get('MobilePhone'))
                return this.contact.get('MobilePhone');
            return '';
        },
        getACVAmount: function() {
            var a = (parseFloat(this.get('ACV_of_Opportunity__c')) || 0.00).toFixed(2).toString().split('.', 2),
                dec = a[1],
                i = Math.abs(parseInt(a[0])).toString(),
                a = [];
                
            while (i.length > 3) {
                a.unshift(i.substr(i.length - 3));
                i = i.substr(0, i.length - 3);
            }
            a.unshift((i != '' ? i : null));
            return a.join(',') + '.' + dec;
        },
		
		fetchContact: function(model, id) {
			model.contact = new MyAssist.models.User({Id: id});
			model.contact.fetch({
			    success: function() {
                    model.contactFetched = true;
			        model.trigger('checkloaded');
			    }
			});
		},
		fetchAttachments: function(model, id) {
			model.attachments = new MyAssist.collections.Attachments({assist_id: id});
			model.attachments.fetch({
			    success: function() {
			        model.attachmentsFetched = true;
			        model.trigger('checkloaded');
			    }
			});
		},
		checkLoaded: function() {
		    if (this.attachmentsFetched && this.contactFetched) {
		        this.loaded = true;
		        this.trigger('modelloaded');
		    }
		},
		
		urlRoot: 'SSE_Assist__c',
		
		save: function(attrs, options) {
			if (this.phony)
				this.phony = false;
			MyAssist.Model.prototype.save.call(this, attrs, options);
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
			SmallPhotoUrl: '',
			withFeedback: false,
		},
		urlRoot: 'User',
		initialize: function(attributes, options) {
			MyAssist.Model.prototype.initialize.call(this, attributes, options);
			if (this.get('withFeedback')) this.bind('set:Id', this.fetchFeedback);
		},
		getSmallPhoto: function() {
			return (this.get('SmallPhotoUrl').indexOf('http') == -1 ? Stachl.ajaxSettings.instance_url + this.get('SmallPhotoUrl') : this.get('SmallPhotoUrl')) + '?oauth_token=' + Stachl.ajaxSettings.token;
		},
		fetchFeedback: function() {
			var me = this;
				me.feedback = {
					yearAverage: 0,
					quaterAverage: 0,
					teamAverage: 0
				},
				feb = (Date.today().getMonth() !== 1 ? Date.parse('last February') : Date.today()).moveToFirstDayOfMonth();
			
					
			countFn = function(quality) {
				if (quality == '1 - Poor') return 1;
				if (quality == '2 - Below Expectations') return 2;
				if (quality == '3 - Meets Expectations') return 3;
				if (quality == '4 - Exceeds Expectations') return 4;
				if (quality == '5 - Exceptional') return 5;
			};
			
			Stachl.ajax({
				url: '/services/data/v20.0/query/',
				method: 'GET',
				data: $.param({
					q: "select Overall_Quality_of_Assist__c, Date_Time_Due__c from SSE_Assist__c where Overall_Quality_of_Assist__c != '' and OwnerId = '" + MyAssist.Settings.User.id + "' and Date_Time_Due__c >= " + feb.toString(MyAssist.Settings.Options.serverDateTimeFormat)
				}),
				dataType: 'json',
				success: function(data) {
					var total = data.totalSize,
						count = 0,
						qtotal = 0,
						qcount = 0;

					quaterFn = function(date) {
						if (date.between(feb, feb.clone().addMonths(2).moveToLastDayOfMonth()) &&
							Date.today().between(feb, feb.clone().addMonths(2).moveToLastDayOfMonth())) {
							return true;
						}
						if (date.between(feb.clone().addMonths(3), feb.clone().addMonths(5).moveToLastDayOfMonth()) &&
							Date.today().between(feb.clone().addMonths(3), feb.clone().addMonths(5).moveToLastDayOfMonth())) {
							return true;
						}
						if (date.between(feb.clone().addMonths(6), feb.clone().addMonths(8).moveToLastDayOfMonth()) &&
							Date.today().between(feb.clone().addMonths(6), feb.clone().addMonths(8).moveToLastDayOfMonth())) {
							return true;
						}
						if (date.between(feb.clone().addMonths(9), feb.clone().addMonths(11).moveToLastDayOfMonth()) &&
							Date.today().between(feb.clone().addMonths(9), feb.clone().addMonths(11).moveToLastDayOfMonth())) {
							return true;
						}
						return false;
					};
					
					$.each(data.records, function(index, value) {
						count += countFn(value.Overall_Quality_of_Assist__c);
						if (quaterFn(Date.parse(value.Date_Time_Due__c))) {
							qtotal++;
							qcount += countFn(value.Overall_Quality_of_Assist__c);
						}
					});
					
					me.feedback.yearAverage = (Math.round((count / total) * 100) / 100);
					me.feedback.quaterAverage = (Math.round((qcount / qtotal) * 100) / 100);
				}
			});
			
			Stachl.ajax({
				url: '/services/data/v20.0/query/',
				method: 'GET',
				data: $.param({
					q: "select Overall_Quality_of_Assist__c, Date_Time_Due__c from SSE_Assist__c where Overall_Quality_of_Assist__c != '' and Date_Time_Due__c >= " + feb.toString(MyAssist.Settings.Options.serverDateTimeFormat)
				}),
				dataType: 'json',
				success: function(data) {
					var total = data.totalSize,
						count = 0;
					
					$.each(data.records, function(index, value) {
						count += countFn(value.Overall_Quality_of_Assist__c);
					});
					
					me.feedback.teamAverage = (Math.round((count / total) * 100) / 100);
				}
			});
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
