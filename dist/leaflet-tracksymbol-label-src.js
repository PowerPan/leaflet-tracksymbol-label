/*
	leaflet-tracksymbol-label, a plugin that adds labels leaflet-trackmarkers for Leaflet powered maps. Based on Leaflet.label
	(c) 2016, Johannes Rudolph

 	https://github.com/PowerPan/leaflet-tracksymbol-label
	https://github.com/Leaflet/Leaflet.label
	http://leafletjs.com
	https://github.com/PowerPan
*/
/**
 *
 */
(function (factory, window) {

	// define an AMD module that relies on 'leaflet'
	if (typeof define === 'function' && define.amd) {
		define(['leaflet'], factory);

	// define a Common JS module that relies on 'leaflet'
	} else if (typeof exports === 'object') {
		module.exports = factory(require('leaflet'));
	}

	// attach your plugin to the global 'L' variable
	if (typeof window !== 'undefined' && window.L) {
		window.LeafletTracksymbolLabel = factory(L);
	}
}(function (L) {
L.tracksymbolLabelVersion = '1.0.0';


/**
 *
 */
var LeafletTracksymbolLabel = L.Class.extend({

	includes: L.Mixin.Events,

	/**
	 *
	 */
	options: {
		className: '',
		clickable: false,
		direction: 'left',
		noHide: true,
		offset: [12, -15], // 6 (width of the label triangle) + 6 (padding)
		opacity: 1,
		zoomAnimation: true
	},

	/**
	 *
	 * @param options
	 * @param source
	 */
	initialize: function (options, source) {
		L.setOptions(this, options);

		this._source = source;
		this._animated = L.Browser.any3d && this.options.zoomAnimation;
		this._isOpen = false;
	},

	/**
	 *
	 * @param map
	 */
	onAdd: function (map) {
		this._map = map;

		this._pane = this.options.pane ? map._panes[this.options.pane] :
			this._source instanceof L.Marker ? map._panes.markerPane : map._panes.popupPane;

		if (!this._container) {
			this._initLayout();
		}

		this._pane.appendChild(this._container);

		this._initInteraction();

		this._update();

		this.setOpacity(this.options.opacity);

		map
			.on('moveend', this._onMoveEnd, this)
			.on('viewreset', this._onViewReset, this);

		if (this._animated) {
			map.on('zoomanim', this._zoomAnimation, this);
		}

		if (L.Browser.touch && !this.options.noHide) {
			L.DomEvent.on(this._container, 'click', this.close, this);
			map.on('click', this.close, this);
		}
	},

	/**
	 *
	 * @returns {boolean}
	 */
	isOnMap: function () {
		if (this._map) {
			return true;
		}
		return false;
	},

	/**
	 *
	 * @param map
	 */
	onRemove: function (map) {
		this._pane.removeChild(this._container);

		map.off({
			zoomanim: this._zoomAnimation,
			moveend: this._onMoveEnd,
			viewreset: this._onViewReset
		}, this);

		this._removeInteraction();

		this._map = null;
	},

	/**
	 *
	 * @param latlng
	 * @returns {LeafletTracksymbolLabel}
	 */
	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		if (this._map) {
			this._updatePosition();
		}
		return this;
	},

	/**
	 *
	 * @param content
	 * @returns {LeafletTracksymbolLabel}
	 */
	setContent: function (content) {
		// Backup previous content and store new content
		this._previousContent = this._content;
		this._content = content;

		this._updateContent();

		return this;
	},

	/**
	 *
	 */
	close: function () {
		var map = this._map;

		if (map) {
			if (L.Browser.touch && !this.options.noHide) {
				L.DomEvent.off(this._container, 'click', this.close);
				map.off('click', this.close, this);
			}

			map.removeLayer(this);
		}
	},

	/**
	 *
	 * @param zIndex
	 */
	updateZIndex: function (zIndex) {
		this._zIndex = zIndex;

		if (this._container && this._zIndex) {
			this._container.style.zIndex = zIndex;
		}
	},

	/**
	 *
	 * @param opacity
	 */
	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._container) {
			L.DomUtil.setOpacity(this._container, opacity);
		}
	},

	/**
	 *
	 * @private
	 */
	_initLayout: function () {
		this._container = L.DomUtil.create('div', 'leaflet-tracksymbol-label ' + this.options.className + ' leaflet-zoom-animated');
		this.updateZIndex(this._zIndex);
	},

	/**
	 *
	 * @private
	 */
	_update: function () {
		if (!this._map) { return; }

		this._container.style.visibility = 'hidden';

		this._updateContent();
		this._updatePosition();

		this._container.style.visibility = '';
	},

	/**
	 *
	 * @private
	 */
	_updateContent: function () {
		if (!this._content || !this._map || this._prevContent === this._content) {
			return;
		}

		if (typeof this._content === 'string') {
			this._container.innerHTML = this._content;

			this._prevContent = this._content;

			this._labelWidth = this._container.offsetWidth;
		}
	},

	/**
	 *
	 * @private
	 */
	_updatePosition: function () {
		var pos = this._map.latLngToLayerPoint(this._latlng);

		this._setPosition(pos);
	},

	/**
	 *
	 * @param pos
	 * @private
	 */
	_setPosition: function (pos) {
		var map = this._map,
			container = this._container,
			centerPoint = map.latLngToContainerPoint(map.getCenter()),
			labelPoint = map.layerPointToContainerPoint(pos),
			direction = this.options.direction,
			labelWidth = this._labelWidth,
			offset = L.point(this.options.offset);

		// position to the right (right or auto & needs to)
		if (direction === 'right' || direction === 'auto' && labelPoint.x < centerPoint.x) {
			L.DomUtil.addClass(container, 'leaflet-tracksymbol-label-right');
			L.DomUtil.removeClass(container, 'leaflet-tracksymbol-label-left');

			pos = pos.add(offset);
		} else { // position to the left
			L.DomUtil.addClass(container, 'leaflet-tracksymbol-label-left');
			L.DomUtil.removeClass(container, 'leaflet-tracksymbol-label-right');

			pos = pos.add(L.point(-offset.x - labelWidth, offset.y));
		}

		L.DomUtil.setPosition(container, pos);
	},

	/**
	 *
	 * @param opt
	 * @private
	 */
	_zoomAnimation: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();

		this._setPosition(pos);
	},

	/**
	 *
	 * @private
	 */
	_onMoveEnd: function () {
		if (!this._animated || this.options.direction === 'auto') {
			this._updatePosition();
		}
	},

	/**
	 *
	 * @param e
	 * @private
	 */
	_onViewReset: function (e) {
		/* if map resets hard, we must update the label */
		if (e && e.hard) {
			this._update();
		}
	},

	/**
	 *
	 * @private
	 */
	_initInteraction: function () {
		if (!this.options.clickable) { return; }

		var container = this._container,
			events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu'];

		L.DomUtil.addClass(container, 'leaflet-clickable');
		L.DomEvent.on(container, 'click', this._onMouseClick, this);

		for (var i = 0; i < events.length; i++) {
			L.DomEvent.on(container, events[i], this._fireMouseEvent, this);
		}
	},

	/**
	 *
	 * @private
	 */
	_removeInteraction: function () {
		if (!this.options.clickable) { return; }

		var container = this._container,
			events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu'];

		L.DomUtil.removeClass(container, 'leaflet-clickable');
		L.DomEvent.off(container, 'click', this._onMouseClick, this);

		for (var i = 0; i < events.length; i++) {
			L.DomEvent.off(container, events[i], this._fireMouseEvent, this);
		}
	},

	/**
	 *
	 * @param e
	 * @private
	 */
	_onMouseClick: function (e) {
		if (this.hasEventListeners(e.type)) {
			L.DomEvent.stopPropagation(e);
		}

		this.fire(e.type, {
			originalEvent: e
		});
	},

	/**
	 *
	 * @param e
	 * @private
	 */
	_fireMouseEvent: function (e) {
		this.fire(e.type, {
			originalEvent: e
		});

		// TODO proper custom event propagation
		// this line will always be called if marker is in a FeatureGroup
		if (e.type === 'contextmenu' && this.hasEventListeners(e.type)) {
			L.DomEvent.preventDefault(e);
		}
		if (e.type !== 'mousedown') {
			L.DomEvent.stopPropagation(e);
		} else {
			L.DomEvent.preventDefault(e);
		}
	}
});


L.Map.include({
	/**
	 *
	 * @param label
	 * @returns {*}
	 */
	showTracklayerLabel: function (label) {
		return this.addLayer(label);
	}
});

/*global LeafletTracksymbolLabel */

/**
 *
 */
L.Path.include({
	/**
	 *
	 * @param content
	 * @param options
	 * @returns {bindTracksymbolLabel}
	 */
	bindTracksymbolLabel: function (content, options) {
		if (!this.tracksymbollabel || this.tracksymbollabel.options !== options) {
			this.tracksymbollabel = new LeafletTracksymbolLabel(options, this);
		}

		this.tracksymbollabel.setContent(content);

		return this;
	},

	/**
	 *
	 * @returns {unbindTracksymbolLabel}
	 */
	unbindTracksymbolLabel: function () {
		if (this.tracksymbollabel) {
			this._hideTracksymbolLabel();
			this.tracksymbollabel = null;
		}
		return this;
	},

	/**
	 *
	 * @param content
	 */
	updateTracksymbolLabelContent: function (content) {
		if (this.tracksymbollabel) {
		    if (typeof content === 'string' && content !== "") {
                if (!this.tracksymbollabel.isOnMap()) {
                    this._showTracksymbolLabel();
                }
                this.tracksymbollabel.setContent(content);
            }
            else {
                if (this.tracksymbollabel.isOnMap()) {
                    this._hideTracksymbolLabel();
                }
            }
		}
	},

	/**
	 *
	 * @param latlng
	 */
	_showTracksymbolLabel: function () {
		if (this._map) {
			this._map.showTracklayerLabel(this.tracksymbollabel);
		}
	},

    /**
     *
     * @param latlng
     */
	updateTracksymolLabelLatLng: function (latlng) {
		this.tracksymbollabel.setLatLng(latlng);
	},

    /**
     *
     * @private
     */
	_hideTracksymbolLabel: function () {
		this.tracksymbollabel.close();
	}
});


	return LeafletTracksymbolLabel;
}, window));
