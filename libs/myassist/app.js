(function($, Backbone, _, window, $mobile, Stachl) {
	MyAssist = window.MyAssist || {};
	
	MyAssist.Application = function(options) {
		air.Introspector.Console.log('test');
		
		$.extend(MyAssist.Settings.Options, options);
		//find present pages
		var $pages = $( ":jqmData(role='page')" );
		//if no pages are found, create one with body's inner html
		if( !$pages.length ){
			$pages = $( "body" ).wrapInner( "<div data-" + $mobile.ns + "role='page'></div>" ).children( 0 );
		}
		//add dialogs, set data-url attrs
		$pages.add( ":jqmData(role='dialog')" ).each(function(){
			var $this = $(this);
			// unless the data url is already set set it to the id
			if( !$this.jqmData('url') ){
				$this.attr( "data-" + $mobile.ns + "url", $this.attr( "id" ) );
			}
		});
		//define page container
		$mobile.pageContainer = $pages.first().parent().addClass( "ui-mobile-viewport" );
		//cue page loading message
		$mobile.showPageLoadingMsg();
		
		this.mainWindow = air.NativeApplication.nativeApplication.openedWindows[0];
		this.mainScreen = air.Screen.mainScreen;
		this.mainWindow.y = 0;
		this.mainWindow.x = this.mainScreen.bounds.width - this.mainWindow.width;
		this.mainWindow.height = this.mainScreen.visibleBounds.height;
		
		this.run = function() {
			this.showView('login');
		};
		this.showView = function(view, options) {
			var prev = this.prevView;
			options = options || {};
			this.prevView = options.prevView || this.activeView;
			this.activeView = [view, options];
			try {
				this.view = new MyAssist.views[this.activeView[0]](this.activeView[1]);
			} catch(e) {
				this.activeView = this.prevView;
				this.prevView = prev;
			}
		};
		this.goBack = function(transition) {
			var settings = _.clone(this.prevView[1]);
			settings.reverse = true;
			this.showView(this.prevView[0], settings);
		};
		return this;
	};
	
	window.MyAssist = MyAssist;
})(jQuery, Backbone, _, window, $.mobile, window.Stachl);