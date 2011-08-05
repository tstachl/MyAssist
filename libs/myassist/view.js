(function($, Backbone, _, window) {
	MyAssist = window.MyAssist || {};
	
	MyAssist.View = Backbone.View.extend({
		initialize: function() {
			Backbone.View.prototype.initialize.call(this);
			
			this.bind('templateloaded', $.proxy(this.createTemplate, this));
			this.bind('templatecreated', $.proxy(this.render, this));
			
			if ($('#' + this.id).length == 0) this.loadTemplate();
			else this.trigger('templateloaded');
		},
		render: function() {
			Backbone.View.prototype.render.call(this);
			
			console.log($(this.el));
			//$.mobile.changePage($(this.el), {transition: 'slide'});
		},
		loadTemplate: function() {
			var me = this;
			$.get('templates/' + this.id + '.html', function(data) {
				me.el = data;
				$(me.el).hide().appendTo('body');
				me.trigger('templateloaded');
			});
		},
		createTemplate: function() {
			this.template = _.template($(this.el).html());
			this.trigger('templatecreated');
		}
	});
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window);