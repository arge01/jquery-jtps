/*
 * jTPS - table sorting, pagination, and animated page scrolling
 *	version 0.2
 * Author: Jim Palmer
 * Released under MIT license.
 */
 (function($) {
	$.fn.initTable = function ( opt ) {
		$(this).data('tableSettings', $.extend({
				perPages:			[5, 6, 10, 20, 50, 'ALL'],				// the "show per page" selection
				perPageText:		'Show per page:',						// text that appears before perPages links
				perPageDelim:		'<span style="color:#ccc;">|</span>',	// text or dom node that deliminates each perPage link 
				perPageSeperator:	'..',									// text or dom node that deliminates split in select page links
				scrollDelay:		30,										// delay (in ms) between steps in anim. - IE has trouble showing animation with < 30ms delay
				scrollStep:			1										// how many tr's are scrolled per step in the animated vertical pagination scrolling
			}, opt));
		return this;				// chainable
	};
	$.fn.controlTable = function ( tdIndex, desc, page, perPage ) {

		tdIndex = tdIndex || 0;
		
		// generic pass-through object + other initial variables
		var pT = $(this), page = page || 1, perPages = $(this).data('tableSettings').perPages, perPage = perPage || perPages[0];

		// append jTPS class "stamp"
		$(this).addClass('jTPS')
		
		// remove all stub rows
		$('.stubCell', this).remove();

		// DEBUG
//		var dt = new Date();

		// build tbody>tr>td structure for sorting
		var display = []; 

		$('tbody tr', this).each(
			function (trIndex) { 
				var tr = [];
				$(this).find('td').each( 
					function () {
						tr.push( $(this).html() );
					}
				);
				display.push( tr );
			}
		);

		// intelligently sort (natural sort) through the array elements based off the index of the current row cell count
		var nullChar = String.fromCharCode(0);
		display = display.sort( 
			function(a, b) {
				// setup temp-scope variables for comparison evauluation
				var x = a[tdIndex].toString().toLowerCase(), y = b[tdIndex].toString().toLowerCase(),
					xN = x.replace(/([-]{0,1}[0-9.]{1,})/g, nullChar + '$1' + nullChar).split(nullChar),
					yN = y.replace(/([-]{0,1}[0-9.]{1,})/g, nullChar + '$1' + nullChar).split(nullChar);
				// natural sorting through split numeric strings and default strings
				for ( var cLoc=0, numS = Math.min( xN.length, yN.length ); cLoc < numS; cLoc++ ) {
					if ( ( parseFloat( xN[cLoc] ) || xN[cLoc] ) < ( parseFloat( yN[cLoc] ) || yN[cLoc] ) )
						return -1;
					else if ( ( parseFloat( xN[cLoc] ) || xN[cLoc] ) > ( parseFloat( yN[cLoc] ) || yN[cLoc] ) )
						return 1;

				}
				return 0;
			}
		);

		// if descending, reverse the already sorted array
		if (desc) display = display.reverse();

		// re-process the table data
		$('tbody tr', this).each(
			function (trIndex) { 
				$(this).find('td').each( 
					function (tdIndex) {
						if ( display[trIndex][tdIndex] !== undefined )
							$(this).html( display[trIndex][tdIndex] );
					}
				);
			}
		); 

		// DEBUG
//		$('#temp').empty().append( ( (new Date()).getTime() - dt.getTime() ) + 'ms<BR>');

		// add the stub rows
		var stubCount=0, cols = $('tbody tr:first td', this).length, stubs = ( perPage - ( $('tbody tr', this).length % perPage ) );
		for ( ; stubCount < stubs && stubs != perPage; stubCount++ )
			$('tbody tr:last', this).after( '<tr class="stubCell"><td colspan="' + cols + '" style="height: ' + $('tbody tr:first td:first', this).css('height') + ';">&nbsp;</td></tr>' );

		// "fix" the table layout and individual cell width & height settings
		if ( $('table', this).css('table-layout') != 'fixed' ) {
			// find max tbody td cell height
			var maxTDHeight = 0;
			// ensure browser-formated widths for each column in the thead and tbody
			$('tbody td', this).each(
				function () { 
					maxTDHeight = Math.max( maxTDHeight, ( 
						$(this).height() + ( parseInt( $(this).css('paddingTop') ) || 0 ) + ( parseInt( $(this).css('paddingBottom') ) || 0 ) +
						( parseInt( $(this).css('borderTopWidth') ) || 0 ) + ( parseInt( $(this).css('borderBottomWidth') ) || 0 )
					));
				}
			);
			$('tbody td', this).each(function () { $(this).css('height', maxTDHeight); });
			// now correct their height
			$('thead td', this).each(function () { $(this).css('width', $(this).width()); });
			// now set the table layout to fixed
			$('table', this).css('table-layout','fixed');
		}
		

		// clear prior pagination
		$('tbody tr.hideTR', this).removeClass('hideTR');
		// paginate the result
		if ( display.length > perPage )
			$('tbody tr:gt(' + (perPage - 1) + ')', this).addClass('hideTR');

		// hilight the sorted column header
		$('thead .sortDesc, thead .sortAsc').removeClass('sortDesc').removeClass('sortAsc');
		$('thead td:eq(' + tdIndex + ')', this).addClass( desc ? 'sortDesc' : 'sortAsc' );

		// hilight the sorted column
		$('tbody', this).find('td.sortedColumn').removeClass('sortedColumn');
		$('tbody tr:not(.stubCell)', this).each( function () { $('td:eq(' + tdIndex + ')', this).addClass('sortedColumn'); } );

		// bind sort functionality to theader onClicks
		$('thead td[sort]', this).each(
			function (tdInd) {
				$(this).addClass('sortableHeader').unbind('click').bind('click',
					function () {
						pT.controlTable( tdInd, ( ( desc && tdInd == tdIndex ) ? false : true ), 1, perPage );
					}
				);
			}
		);

		// add perPage selection link + delim dom node
		$('tfoot .selectPerPage', this).empty();
		var pageSel = perPages.length;
		while ( pageSel-- ) 
			$('tfoot .selectPerPage', this).prepend( ( (pageSel > 0) ? $(this).data('tableSettings').perPageDelim : '' ) + '<span class="perPageSelector">' + perPages[pageSel] + '</span>' );

		// add pagination links
		$('tfoot .pagination', this).empty();
		var pages = (perPage >= display.length) ? 0 : Math.ceil( display.length / perPage ), totalPages = pages;
		while ( pages-- ) 
			$('tfoot .pagination', this).prepend( '<div class="pageSelector">' + ( pages + 1 ) + '</div>' );

		// arrange the pagination - if really long
		var drawPageSelectors = function ( target, page ) {
			var pageCount = $('tfoot .pageSelector').length;
			$('tfoot .pageSelector.hidePageSelector', target).removeClass('hidePageSelector');
			$('tfoot .pageSelector.hilightPageSelector', target).removeClass('hilightPageSelector');
			$('tfoot .pageSelectorSeperator', target).remove();
			$('tfoot .pageSelector:lt(' + ( ( page > ( pageCount - 4 ) ) ? ( pageCount - 5 ) : ( page - 2 ) ) + '):not(:first)', target).addClass('hidePageSelector')
				.eq(0).after( '<div class="pageSelectorSeperator">' + $(target).data('tableSettings').perPageSeperator + '</div>' );
			$('tfoot .pageSelector:gt(' + ( ( page < 4 ) ? 4 : page ) + '):not(:last)', target).addClass('hidePageSelector')
				.eq(0).after( '<div class="pageSelectorSeperator">' + $(target).data('tableSettings').perPageSeperator + '</div>' );
			$('tfoot .pageSelector:eq(' + ( page - 1 ) + ')', target).addClass('hilightPageSelector');
			$('tfoot .pageSelectorSeperator', target).css( 'width', $('tfoot .pageSelector:last', target).width() );

		};
		drawPageSelectors( this, page || 1 );
		// auto-adjust the pageSelector widths
		$('tfoot .pageSelector', this).css( 'width', $('tfoot .pageSelector:last', this).width() );

		// prepend the instructions and attach select hover and click events
		$('tfoot .selectPerPage', this).prepend( $(this).data('tableSettings').perPageText ).find('.perPageSelector').each(
			function () {
				if ( ( parseInt($(this).html()) || display.length ) == perPage )
					$(this).css('fontWeight', 'bold');
				else {
					$(this).bind('mouseover mouseout', function (e) { e.type == 'mouseover' ? $(this).addClass('perPageHilight') : $(this).removeClass('perPageHilight'); });
					$(this).bind('click', function () { pT.controlTable( tdIndex, 0, 1, ( parseInt($(this).html()) || display.length ) ); });
				}
			}
		);
		// remove the pager title if no pages necessary
		if ( perPage >= display.length )
			$('tfoot .paginationTitle', this).css('display','none');
		else
			$('tfoot .paginationTitle', this).css('display','');

		// show the correct paging status
		var cPos = $('tbody tr:not(.hideTR):first', this).prevAll().length, ePos = $('tbody tr:not(.hideTR)', this).length;
		$('tfoot .status', this).html(
			'showing ' + ( cPos + 1 ) + ' - ' + ( cPos + ePos ) + ' of ' + display.length );

		// bind the pagination onclick
		$('tfoot .pagination .pageSelector', this).each(
			function () {
				$(this).bind('click',
					function () {

						// re-align the pagination
						drawPageSelectors( pT, parseInt( $(this).html() ) );

						// really stop all animations
						$(this).parent().queue( "fx", [] ).stop();

						// setup the pagination variables
						var beginPos = $('tbody tr:not(.hideTR):first', pT).prevAll().length;
						var endPos = ( ( parseInt( $(this).html() ) - 1 ) * perPage );
						if ( endPos > display.length )
							endPos = (display.length - 1);
						// set the steps to be exponential for all the page scroll difference - i.e. faster for more pages to scroll
						var sStep = $(pT).data('tableSettings').scrollStep * Math.abs( ( endPos - beginPos ) / perPage );
						if ( sStep > perPage ) sStep = perPage;
						var steps = Math.ceil( Math.abs( beginPos - endPos ) / sStep );

						// start scrolling
						while ( steps-- ) {
							$(this).parent().animate({'opacity':1}, $(pT).data('tableSettings').scrollDelay,
								function () {
									// reset the scrollStep for the remaining items
									if ( $(this).queue("fx").length == 0 )
										sStep = ( Math.abs( beginPos - endPos ) % sStep ) || sStep;
									if ( beginPos > endPos ) {				// scoll up
										$('tbody tr:not(.hideTR):first', pT).prevAll(':lt(' + sStep + ')').removeClass('hideTR');
										if ( $('tbody tr:not(.hideTR)', pT).length > perPage )
											$('tbody tr:not(.hideTR):last', pT).prevAll(':lt(' + ( sStep - 1 ) + ')').andSelf().addClass('hideTR');
										// if scrolling up from less rows than perPage - compensate if < perPage
										var currRows =  $('tbody tr:not(.hideTR)', pT).length;
										if ( currRows < perPage )
											$('tbody tr:not(.hideTR):last', pT).nextAll(':lt(' + ( perPage - currRows ) + ')').removeClass('hideTR');
									} else {								// scroll down
										var endPoint = $('tbody tr:not(.hideTR):last', pT);
										$('tbody tr:not(.hideTR):lt(' + sStep + ')', pT).addClass('hideTR');
										$(endPoint).nextAll(':lt(' + sStep + ')').removeClass('hideTR');
									}
									// update status bar
									var cPos = $('tbody tr:not(.hideTR):first', pT).prevAll().length,
										ePos = $('tbody tr:not(.hideTR):not(.stubCell)', pT).length;
									$('tfoot .status', pT).html(
										'Showing ' + ( cPos + 1 ) + ' - ' + ( cPos + ePos ) + ' of ' + display.length + '' );
								}
							);
						}

					}
				);
			}
		);
		return this;				// chainable
	};
	
})(jQuery);
